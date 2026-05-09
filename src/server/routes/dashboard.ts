import express from 'express';
import { supabase } from '../db.js';
import { authenticateToken, requireActiveSubscription, depositRateLimiter } from '../middleware.js';
import crypto from 'crypto';
import { ShamCashService } from '../../services/shamy.js';

const router = express.Router();

router.use(authenticateToken);

// --- Subscriptions ---
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.user!.id;
    // Get subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError) throw subError;

    // Get number of wallets
    const { count: activeWallets, error: walletError } = await supabase
      .from('wallets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (walletError) throw walletError;

    res.json({
      ...sub,
      active_wallets_count: activeWallets || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subscription/upgrade', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { num_wallets, num_months } = req.body;
    
    if (!num_wallets || !num_months) {
      return res.status(400).json({ error: 'num_wallets and num_months are required' });
    }

    const cost = Number(num_wallets) * Number(num_months) * 0.50;

    // Fetch current subscription
    const { data: sub, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError) throw subError;

    if (Number(sub.current_balance) < cost) {
      return res.status(400).json({ error: 'رصيد غير كافٍ' }); // Insufficient balance
    }

    const newBalance = Number(sub.current_balance) - cost;
    
    // Calculate new expires_at
    const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
    const baseDate = currentExpiry > new Date() ? currentExpiry : new Date();
    baseDate.setMonth(baseDate.getMonth() + Number(num_months));

    const { data: newSub, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        current_balance: newBalance,
        max_wallets: Number(num_wallets),
        expires_at: baseDate.toISOString(),
        status: 'active'
      })
      .eq('user_id', userId)
      .select('*')
      .single();

    if (updateError) throw updateError;
    res.json(newSub);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/subscription/toggle-auto-renew', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { auto_renew } = req.body;
    
    const { error } = await supabase
      .from('subscriptions')
      .update({ auto_renew })
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, auto_renew });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Wallets ---
router.get('/wallets', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from('wallets')
      .select('id, wallet_address, account_number, name, status, created_at, updated_at')
      .eq('user_id', userId);

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wallets/link/init', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    // Check max_wallets from subscription
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('max_wallets, status')
      .eq('user_id', userId)
      .single();

    if (!sub || sub.status !== 'active') {
       return res.status(403).json({ error: 'Subscription is not active' });
    }

    const { count: activeWallets } = await supabase
      .from('wallets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    if (activeWallets && activeWallets >= sub.max_wallets) {
       return res.status(403).json({ error: 'يجب ترقية اشتراكك لإضافة محافظ إضافية' }); // Must upgrade to add more wallets
    }

    // Insert pending wallet
    const { data: wallet, error } = await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        name: name || 'My ShamCash Wallet',
        wallet_address: null,
        account_number: null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;

    // Start linking
    const qrPayload = await ShamCashService.initiateWalletLink(wallet.id, userId);

    res.json({ walletId: wallet.id, qrPayload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallets/link/status/:walletId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { walletId } = req.params;

    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('status')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    res.json({ linked: wallet.status === 'active' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/wallets/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { error } = await supabase.from('wallets').delete().eq('id', req.params.id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Wallet Actions (Real API calls) ---
router.get('/wallets/:id/balance', requireActiveSubscription, async (req, res) => {
  try {
    const userId = req.user!.id;
    const client = await ShamCashService.getClientForWallet(req.params.id, userId);
    const balances = await client.account.getBalances();
    res.json(balances);
  } catch (error: any) {
    if (error.message.includes('401')) {
       await supabase.from('wallets').update({ status: 'expired' }).eq('id', req.params.id);
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallets/:id/profile', requireActiveSubscription, async (req, res) => {
  try {
    const userId = req.user!.id;
    const client = await ShamCashService.getClientForWallet(req.params.id, userId);
    const profile = await client.account.getMyProfile();
    res.json(profile);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/wallets/:id/transactions', requireActiveSubscription, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { page = '1', limit = '20', direction = 'all' } = req.query;
    const client = await ShamCashService.getClientForWallet(req.params.id, userId);
    const tx = await client.history.getLogs(Number(page), Number(limit), { direction });
    res.json(tx);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wallets/:id/transfer', requireActiveSubscription, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { peer_account, amount, currencyId, note, pin } = req.body;
    console.log("Transfer input:", { peer_account, amount, currencyId, note, pin });
    const client = await ShamCashService.getClientForWallet(req.params.id, userId);
    const parsedAmount = Number(amount);
    const parsedCurrencyId = Number(currencyId);
    
    if (isNaN(parsedAmount) || isNaN(parsedCurrencyId) || !parsedCurrencyId) {
      return res.status(400).json({ error: 'amount and currencyId must be valid numbers' });
    }
    
    console.log("Transfer executing:", { peer_account, parsedAmount, parsedCurrencyId, note, pin });
    const result = await client.transfer.executeTransaction(peer_account, parsedAmount, parsedCurrencyId, note || '', pin || '');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/wallets/:id/resolve-account', requireActiveSubscription, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { address } = req.body;
    console.log("Resolving account:", address);
    const client = await ShamCashService.getClientForWallet(req.params.id, userId);
    const result = await client.transfer.resolveAccount(address);
    console.log("Resolved result:", result);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Deposits ---
router.get('/settings/exchange-rate', async (req, res) => {
  try {
    const { data: settings } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', ['syp_to_usd_rate', 'deposit_wallet_address']);
      
    let rate = 15000;
    let depositAddress = null;
    
    settings?.forEach(s => {
      if (s.key === 'syp_to_usd_rate') rate = Number(s.value) || 15000;
      if (s.key === 'deposit_wallet_address' && s.value) depositAddress = s.value;
    });

    res.json({ success: true, syp_to_usd_rate: rate, deposit_wallet_address: depositAddress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposit/request', depositRateLimiter, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tx_id } = req.body;

    if (!tx_id) {
       return res.status(400).json({ error: 'tx_id is required' });
    }

    const { data: existing } = await supabase
       .from('deposit_requests')
       .select('id, status')
       .eq('tx_id', tx_id)
       .maybeSingle();

    if (existing) {
       if (existing.status === 'pending_verification') {
         return res.status(400).json({ error: 'يتم التحقق من هذه العملية بالفعل، يرجى الانتظار أو إعادة التحقق.' });
       }
       return res.status(400).json({ error: 'رقم العملية مسجل مسبقاً' });
    }

    let status = 'pending_verification';
    let amount_usd = null;
    let message = 'لم يتم العثور على العملية الآن. سيتم التحقق منها قريباً.';
    let success = false;

    try {
      const verification = await ShamCashService.verifyDepositTransaction(tx_id);
      if (verification.found && verification.amount_usd) {
        status = 'approved';
        amount_usd = verification.amount_usd;
        success = true;
        message = `تم إضافة $${amount_usd} إلى رصيدك!`;
        
        const { data: sub } = await supabase.from('subscriptions').select('current_balance').eq('user_id', userId).single();
        if (sub) {
          const newBal = Number(sub.current_balance) + amount_usd;
          await supabase.from('subscriptions').update({ current_balance: newBal }).eq('user_id', userId);
        }
      }
    } catch (e: any) {
      if (e.message?.includes('لم يتم ربط محفظة الإيداع بعد') || e.message?.includes('محفظة الإيداع غير نشطة')) {
         console.warn(`[Deposit Request] Auto-verification skipped: ${e.message}`);
         status = 'pending'; // Manual review needed since the system cannot access the wallet
      } else {
         console.error('Auto verification failed', e);
      }
    }

    const { error: insertErr } = await supabase
      .from('deposit_requests')
      .insert({
        user_id: userId,
        tx_id,
        amount_usd: amount_usd || 0,
        status: status,
        ...(status === 'approved' ? { reviewed_at: new Date().toISOString() } : {})
      });

    if (insertErr) throw insertErr;

    res.json({ success, message, amount_usd, status });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposit/reverify', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { tx_id } = req.body;

    if (!tx_id) return res.status(400).json({ error: 'tx_id is required' });

    const { data: reqData } = await supabase
      .from('deposit_requests')
      .select('id, status')
      .eq('tx_id', tx_id)
      .eq('user_id', userId)
      .single();

    if (!reqData || reqData.status !== 'pending_verification') {
       return res.status(400).json({ error: 'الطلب غير موجود أو لا يحتاج إلى تحقق' });
    }

    try {
      const verification = await ShamCashService.verifyDepositTransaction(tx_id);
      
      if (verification.found && verification.amount_usd) {
        const { data: sub } = await supabase.from('subscriptions').select('current_balance').eq('user_id', userId).single();
        if (sub) {
          const newBal = Number(sub.current_balance) + verification.amount_usd;
          await supabase.from('subscriptions').update({ current_balance: newBal }).eq('user_id', userId);
        }

        await supabase
          .from('deposit_requests')
          .update({
            status: 'approved',
            amount_usd: verification.amount_usd,
            reviewed_at: new Date().toISOString()
          })
          .eq('id', reqData.id);

        return res.json({ success: true, message: `تم التحقق! تمت إضافة $${verification.amount_usd} لرصيدك.` });
      } else {
        return res.json({ success: false, message: 'لم يتم العثور الشحنة بعد.' });
      }
    } catch (e: any) {
      if (e.message?.includes('لم يتم ربط محفظة الإيداع بعد') || e.message?.includes('محفظة الإيداع غير نشطة')) {
         return res.status(400).json({ error: 'التحقق الآلي معطل حالياً (المحفظة غير متصلة). يرجى انتظار التحقق اليدوي من الإدارة.' });
      }
      console.error('Reverify failed', e);
      return res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بنظام شام كاش.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/deposit/requests', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- API Keys ---
// ... API keys logic remains the same
router.get('/api-keys', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, created_at, last_used_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const rawKey = 'sk_' + crypto.randomBytes(24).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 8) + '...' + rawKey.substring(rawKey.length - 4);

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        user_id: userId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix
      })
      .select('id, name, key_prefix, created_at')
      .single();

    if (error) throw error;
    res.json({ ...data, rawKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { error } = await supabase.from('api_keys').delete().eq('id', req.params.id).eq('user_id', userId);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

