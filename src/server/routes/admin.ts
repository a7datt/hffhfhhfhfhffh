import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../db.js';
import { ShamCashService, pendingLinks } from '../../services/shamy.js';

const router = express.Router();
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'separate_secret_for_admin_tokens_change_me';


// Middleware for admin validation
const authenticateAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  jwt.verify(token, ADMIN_JWT_SECRET, (err, user) => {
    if (err) {
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    (req as any).admin = user;
    next();
  });
};

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, email, password_hash')
      .eq('email', email)
      .single();

    if (error || !admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ adminId: admin.id, role: 'admin' }, ADMIN_JWT_SECRET, { expiresIn: '7d' });

    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes below
router.use(authenticateAdmin);

router.get('/users', async (req, res) => {
  try {
    const { data: users, error: usersErr } = await supabase.from('users').select('id, name, email, created_at');
    if (usersErr) throw usersErr;

    const { data: subs, error: subsErr } = await supabase.from('subscriptions').select('user_id, status, current_balance, expires_at');
    if (subsErr) throw subsErr;

    const { data: wallets, error: walletsErr } = await supabase.from('wallets').select('user_id, id');
    if (walletsErr) throw walletsErr;

    const { data: deposits, error: depErr } = await supabase.from('deposit_requests').select('user_id, amount_usd').eq('status', 'approved');
    if (depErr) throw depErr;

    // Combine data
    const result = users.map(u => {
      const uSub = subs.find(s => s.user_id === u.id) || { current_balance: 0, status: 'inactive', expires_at: null };
      const uWallets = wallets.filter(w => w.user_id === u.id);
      const uDeposits = deposits.filter(d => d.user_id === u.id).reduce((acc, curr) => acc + Number(curr.amount_usd), 0);
      return {
        ...u,
        current_balance: uSub.current_balance,
        subscription_status: uSub.status,
        expires_at: uSub.expires_at,
        wallets_count: uWallets.length,
        total_deposits: uDeposits
      };
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { data: subs } = await supabase.from('subscriptions').select('current_balance');
    const totalBalance = subs?.reduce((acc, curr) => acc + Number(curr.current_balance), 0) || 0;
    
    // pending + pending_verification
    const { count: pendingCount } = await supabase.from('deposit_requests')
      .select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'pending_verification']);
      
    const { count: walletsCount } = await supabase.from('wallets').select('*', { count: 'exact', head: true }).eq('status', 'active');
    
    const { data: recentDeposits } = await supabase.from('deposit_requests')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      users: usersCount || 0,
      total_balance: totalBalance,
      pending_deposits: pendingCount || 0,
      active_wallets: walletsCount || 0,
      recent_deposits: recentDeposits || []
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users/:id/add-balance', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(Number(amount))) return res.status(400).json({ error: 'Valid amount is required' });
    
    const userId = req.params.id;
    
    const { data: sub, error: subErr } = await supabase
       .from('subscriptions')
       .select('current_balance')
       .eq('user_id', userId)
       .single();

    if (subErr) throw subErr;

    const newBal = Number(sub.current_balance) + Number(amount);
    await supabase.from('subscriptions').update({ current_balance: newBal }).eq('user_id', userId);
    
    await supabase.from('deposit_requests').insert({
      user_id: userId,
      amount_usd: Number(amount),
      tx_id: `manual-${Date.now()}`,
      status: 'approved',
      admin_note: 'Added manually by admin',
      reviewed_at: new Date().toISOString()
    });

    res.json({ success: true, new_balance: newBal });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposit-wallet/init', async (req, res) => {
  try {
    const { data: adminWallet, error } = await supabase
      .from('admin_wallets')
      .insert({ status: 'pending', name: 'Deposit Wallet' })
      .select('id')
      .single();
      
    if (error) throw error;
    
    const { data: existing } = await supabase.from('system_settings').select('key').eq('key', 'deposit_wallet_id').maybeSingle();
    if (existing) {
      await supabase.from('system_settings').update({ value: adminWallet.id }).eq('key', 'deposit_wallet_id');
    } else {
      await supabase.from('system_settings').insert({ key: 'deposit_wallet_id', value: adminWallet.id });
    }

    const qrPayload = await ShamCashService.initiateWalletLink(adminWallet.id, 'system', 'admin_wallets');
    res.json({ walletId: adminWallet.id, qrPayload });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug-admin-wallet/:id', async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from('admin_wallets').select('*').eq('id', id).maybeSingle();
  res.json({ data, error });
});

router.get('/debug-update/:id', async (req, res) => {
  const { id } = req.params;
  const { error, data } = await supabase
    .from('admin_wallets')
    .update({
      status: 'active',
      session_data: { foo: 'bar'},
      account_number: '123'
    })
    .eq('id', id);
    
  res.json({ error, data });
});

router.get('/deposit-wallet/status/:walletId', async (req, res) => {
  try {
    const { walletId } = req.params;
    
    if (!walletId) return res.json({ linked: false });
    
    const { data: wallet, error } = await supabase
      .from('admin_wallets')
      .select('status, wallet_address, session_data')
      .eq('id', walletId)
      .maybeSingle();

    if (error) console.error("Error fetching admin_wallets in status:", error);
      
    if (wallet && wallet.status === 'failed') {
       res.json({ linked: false, failed: true, error: (wallet.session_data as any)?.error });
    } else if (wallet && wallet.status === 'active') {
       res.json({ linked: true, address: wallet.wallet_address });
    } else {
       res.json({ linked: false });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/deposit-wallet/profile', async (req, res) => {
  try {
    const client = await ShamCashService.getClientForAdminWallet();
    const profile = await client.account.getMyProfile();
    let balances = [];
    try {
       const balRes = await client.account.getBalances();
       balances = balRes.balances || balRes || [];
    } catch (e) {
       console.error("Error fetching admin wallet balances:", e);
    }
    res.json({ ...profile, balances });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/deposit-wallet/transactions', async (req, res) => {
  try {
    const { page = '1', limit = '20', direction = 'all' } = req.query;
    const client = await ShamCashService.getClientForAdminWallet();
    const tx = await client.history.getLogs(Number(page), Number(limit), { direction });
    res.json(tx);
  } catch (error: any) {
    if (error.message?.includes('محفظة الإيداع غير نشطة') || error.message?.includes('لم يتم ربط')) {
       return res.json({ log: [], msg: 'لم يتم ربط المحفظة' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const { data } = await supabase.from('system_settings').select('*');
    const settings = data?.reduce((acc: any, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {}) || {};
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: 'Key is required' });
    
    // Check if exists first to decide update or insert
    const { data: existing } = await supabase.from('system_settings').select('key').eq('key', key).maybeSingle();
    
    if (existing) {
       const { error } = await supabase
         .from('system_settings')
         .update({ value, updated_at: new Date().toISOString() })
         .eq('key', key);
       if (error) throw error;
    } else {
       const { error } = await supabase
         .from('system_settings')
         .insert({ key, value, updated_at: new Date().toISOString() });
       if (error) throw error;
    }
      
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposits/:id/reverify', async (req, res) => {
  try {
    const depId = req.params.id;

    // Fetch the request
    const { data: reqData, error: reqErr } = await supabase
      .from('deposit_requests')
      .select('user_id, status, tx_id')
      .eq('id', depId)
      .single();

    if (reqErr || !reqData || !['pending', 'pending_verification'].includes(reqData.status)) {
       return res.status(400).json({ error: 'Request not found or cannot be verified' });
    }

    let verification;
    try {
      verification = await ShamCashService.verifyDepositTransaction(reqData.tx_id); // allow slightly older for admin reverify
    } catch (e: any) {
      if (e.message?.includes('لم يتم ربط محفظة الإيداع بعد') || e.message?.includes('محفظة الإيداع غير نشطة')) {
         return res.status(400).json({ error: 'لم يتم ربط محفظة الإيداع بعد. يرجى ربطها أولاً لعمل التحقق الآلي.' });
      }
      throw e;
    }
    
    if (verification.found && verification.amount_usd) {
       // Make sure it doesn't already exist with approved status
       const { data: existing } = await supabase.from('deposit_requests').select('id').eq('tx_id', reqData.tx_id).eq('status', 'approved').single();
       
       if (existing) {
          return res.status(400).json({ error: 'هذه العملية تم إضافتها مسبقاً.' });
       }
       
       const { error: updErr } = await supabase
         .from('deposit_requests')
         .update({ 
            status: 'approved', 
            amount_usd: verification.amount_usd, 
            reviewed_at: new Date().toISOString() 
         })
         .eq('id', depId);

       if (updErr) throw updErr;

       const { data: sub, error: subErr } = await supabase
          .from('subscriptions')
          .select('current_balance')
          .eq('user_id', reqData.user_id)
          .single();

       const newBal = Number(sub?.current_balance || 0) + Number(verification.amount_usd);
       await supabase.from('subscriptions').update({ current_balance: newBal }).eq('user_id', reqData.user_id);

       return res.json({ success: true, message: `Transaction verified! $${verification.amount_usd} added.` });
    } else {
       // Keep it pending_verification
       await supabase.from('deposit_requests').update({ status: 'pending_verification' }).eq('id', depId);
       return res.status(400).json({ error: 'Transaction not found or invalid' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/change-password', async (req, res) => {
  try {
     const { current_password, new_password } = req.body;
     const adminId = (req as any).admin.adminId;
     
     const { data: admin } = await supabase.from('admins').select('password_hash').eq('id', adminId).single();
     if (!admin) return res.status(404).json({ error: 'Admin not found' });
     
     const valid = await bcrypt.compare(current_password, admin.password_hash);
     if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
     
     const newHash = await bcrypt.hash(new_password, 10);
     await supabase.from('admins').update({ password_hash: newHash }).eq('id', adminId);
     
     res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/deposits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deposit_requests')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposits/:id/approve', async (req, res) => {
  try {
    const { amount_usd } = req.body;
    if (!amount_usd) return res.status(400).json({ error: 'amount_usd is required' });

    const depId = req.params.id;

    // Fetch the request
    const { data: reqData, error: reqErr } = await supabase
      .from('deposit_requests')
      .select('user_id, status')
      .eq('id', depId)
      .single();

    if (reqErr || !reqData || reqData.status !== 'pending') {
       return res.status(400).json({ error: 'Request not found or not pending' });
    }

    // Update status
    const { error: updErr } = await supabase
       .from('deposit_requests')
       .update({ status: 'approved', amount_usd, reviewed_at: new Date().toISOString() })
       .eq('id', depId);

    if (updErr) throw updErr;

    // Get current balance
    const { data: sub, error: subErr } = await supabase
       .from('subscriptions')
       .select('current_balance')
       .eq('user_id', reqData.user_id)
       .single();

    if (subErr) throw subErr;

    // Add to balance
    const newBal = Number(sub.current_balance) + Number(amount_usd);
    const { error: balErr } = await supabase
       .from('subscriptions')
       .update({ current_balance: newBal })
       .eq('user_id', reqData.user_id);

    if (balErr) throw balErr;

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/deposits/:id/reject', async (req, res) => {
  try {
    const { admin_note } = req.body;
    const depId = req.params.id;

    const { error } = await supabase
       .from('deposit_requests')
       .update({ status: 'rejected', admin_note, reviewed_at: new Date().toISOString() })
       .eq('id', depId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
