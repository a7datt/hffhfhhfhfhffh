import express from 'express';
import { supabase } from '../db.js';
import { authenticateApiKey } from '../middleware.js';
import { ShamCashService } from '../../services/shamy.js';

const router = express.Router();

router.use(authenticateApiKey);

// 1. Get all wallets
router.get('/wallets', async (req, res) => {
  try {
    const userId = req.apiKeyUser?.id;
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, wallet_address, account_number, name, status, created_at')
      .eq('user_id', userId);

    if (error) throw error;

    const formattedWallets = wallets.map(w => ({
      id: w.id,
      provider: 'shamcash',
      providerDisplayName: 'ShamCash',
      label: w.name || null,
      phone: null,
      walletAddress: w.wallet_address,
      accountNumber: w.account_number,
      region: null,
      status: w.status
    }));

    res.json(formattedWallets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to resolve wallet address to ID for a given user
async function getWalletByAddress(address: string, userId: string) {
  // First attempt to match by id if address is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (uuidRegex.test(address)) {
    const { data: walletById } = await supabase
      .from('wallets')
      .select('id, status')
      .eq('user_id', userId)
      .eq('id', address)
      .single();
    
    if (walletById) return walletById;
  }

  // Next, try wallet_address or account_number
  const { data: wallet, error } = await supabase
    .from('wallets')
    .select('id, status')
    .eq('user_id', userId)
    .or(`wallet_address.eq.${address},account_number.eq.${address}`)
    .single();

  if (error || !wallet) return null;
  return wallet;
}

// 2. Wallet balances
router.get('/wallets/shamcash/:walletAddress/balance', async (req, res) => {
  try {
    const userId = req.apiKeyUser!.id;
    const { walletAddress } = req.params;

    const wallet = await getWalletByAddress(walletAddress, userId);
    if (!wallet) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wallet not found' });
    if (wallet.status !== 'active') return res.status(401).json({ error: 'WALLET_SESSION_EXPIRED', message: 'Wallet session expired' });

    const client = await ShamCashService.getClientForWallet(wallet.id, userId);
    const balancesResponse = await client.account.getBalances();
    
    const formattedBalances = (balancesResponse.balances || balancesResponse || []).map((b: any) => ({
      currency: b.currencyName || (b.currencyId === 1 ? 'USD' : b.currencyId === 2 ? 'SYP' : b.currencyId === 3 ? 'EUR' : 'UNK'),
      amount: Number(b.amount || b.balance || b.money || 0),
      label: null
    }));

    res.json(formattedBalances);
  } catch (error: any) {
    res.status(502).json({ error: 'WALLET_UPSTREAM_ERROR', message: error.message });
  }
});

// 3. Transactions history
router.get('/wallets/shamcash/:walletAddress/transactions', async (req, res) => {
  try {
    const userId = req.apiKeyUser!.id;
    const { walletAddress } = req.params;
    const { direction = 'all', page = '1', limit = '50' } = req.query;

    const wallet = await getWalletByAddress(walletAddress, userId);
    if (!wallet) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wallet not found' });

    const client = await ShamCashService.getClientForWallet(wallet.id, userId);
    const logs = await client.history.getLogs(Number(page), Number(limit), { direction });
    
    let rawTransactions = Array.isArray(logs) ? logs : (logs.log || []);
    
    if (direction === 'in') {
      rawTransactions = rawTransactions.filter((t: any) => t.tranKind === 1 || t.type === 'in' || t.type === 'income');
    } else if (direction === 'out') {
      rawTransactions = rawTransactions.filter((t: any) => t.tranKind === 2 || t.type === 'out' || t.type === 'outgoing');
    }

    const formattedLogs = rawTransactions.map((t: any) => {
       const isIncoming = t.tranKind === 1 || t.type === 'in' || t.type === 'income';
       const dateStr = t.tranDate;
       const timeStr = t.tranTime;
       let occurredAt = null;
       if (dateStr && timeStr) {
           occurredAt = `${dateStr}T${timeStr}`;
       }
       return {
          id: t.tranId?.toString() || t.id?.toString(),
          type: isIncoming ? 'credit' : 'debit',
          amount: Number(t.amount || 0),
          currency: t.currencyName || t.currency || 'SYP',
          counterparty: t.peerUserName || t.peer || t.peerAccountInfo?.name || null,
          description: t.note || null,
          status: null,
          occurredAt
       };
    });

    res.json(formattedLogs);
  } catch (error: any) {
    res.status(502).json({ error: 'WALLET_UPSTREAM_ERROR', message: error.message });
  }
});

// 4. Transfer money
router.get('/wallets/shamcash/:walletAddress/qr', async (req, res) => {
  try {
    const userId = req.apiKeyUser!.id;
    const { walletAddress } = req.params;

    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, wallet_address')
      .eq('user_id', userId)
      .eq('wallet_address', walletAddress)
      .single();

    if (!wallet) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wallet not found' });

    const client = await ShamCashService.getClientForWallet(wallet.id, userId);
    const profile = await client.account.getMyProfile();
    
    // Most apps expect simple qr code data base64 or string, we'll try to extract it from profile
    const qrData = profile.qrCode || profile.qr_code || profile.qr || profile.qrData || btoa(JSON.stringify(profile));
    
    res.json({ success: true, address: profile.address || profile.walletAddress || walletAddress, qr_data: qrData });
  } catch (error: any) {
    if (error.response?.data?.error === 'INVALID_SESSION') {
       return res.status(401).json({ error: 'INVALID_SESSION', message: 'Session expired. Please reconnect wallet in dashboard.' });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/wallets/shamcash/:walletAddress/transfer', async (req, res) => {
  try {
    const userId = req.apiKeyUser!.id;
    const { walletAddress } = req.params;
    const { recipientAddress, amount, currencyId, note } = req.body;

    if (!recipientAddress || !amount || !currencyId) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'recipientAddress, amount, and currencyId are required' });
    }

    const wallet = await getWalletByAddress(walletAddress, userId);
    if (!wallet) return res.status(404).json({ error: 'NOT_FOUND', message: 'Wallet not found' });

    const client = await ShamCashService.getClientForWallet(wallet.id, userId);
    const parsedAmount = Number(amount);
    const parsedCurrencyId = Number(currencyId);
    
    if (isNaN(parsedAmount) || isNaN(parsedCurrencyId) || !parsedCurrencyId) {
      return res.status(400).json({ error: 'amount and currencyId must be valid numbers' });
    }
    
    const result = await client.transfer.executeTransaction(recipientAddress, parsedAmount, parsedCurrencyId, note || '');

    res.json({ success: true, message: 'تم التحويل بنجاح', rawData: result });
  } catch (error: any) {
    res.status(502).json({ error: 'PROVIDER_ERROR', message: error.message });
  }
});

export default router;
