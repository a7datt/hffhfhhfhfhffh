import { supabase } from '../server/db.js';
import path from 'path';
import { ShamClient } from '@jhad-dev/shamy';

// Global map to hold QR payloads while link is pending
export const pendingLinks = new Map<string, string>();

export class ShamCashService {
  /**
   * Initializes a connection or restores session from DB
   */
  static async getClientForWallet(walletId: string, userId: string) {
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('session_data, status')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.session_data || wallet.status !== 'active') {
      throw new Error('No valid session data found for this wallet. Please re-link.');
    }

    const sessionData = wallet.session_data;
    const client = new ShamClient();
    
    // Set properties explicitly to restore the session without polling QR again
    client.accessToken = sessionData.accessToken;
    client.token = sessionData.token;
    client.clientKey = sessionData.clientKey;

    // Attach custom request interceptor to catch 401s if needed
    // This depends on how the library handles auth expiry.

    return client;
  }

  /**
   * Starts a new link session for a wallet
   */
  static initiateWalletLink(walletId: string, userId: string, tableName = 'wallets'): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const sessionDir = path.join('/tmp', 'shamy-sessions', walletId);
        const client = new ShamClient({ sessionDir: sessionDir });

        client.on('qr', (data: any) => {
           pendingLinks.set(walletId, data);
           resolve(data);
        });

        client.on('ready', async (data: any) => {
           const sessionData = {
               accessToken: client.accessToken,
               token: client.token,
               clientKey: client.clientKey,
               loginTime: new Date().toISOString()
           };

           try {
             let accountNumber = null;
             let walletAddress = null;

             try {
                const profile = await client.account.getMyProfile();
                if (profile) {
                   accountNumber = profile.accountNumber || profile.account_number;
                   walletAddress = profile.walletAddress || profile.address;
                }
             } catch (e) {
                console.error('Failed to prefetch profile', e);
             }

             if (tableName === 'admin_wallets') {
               const { data: updData, error: updErr } = await supabase
                 .from('admin_wallets')
                 .update({
                   session_data: sessionData,
                   status: 'active',
                   updated_at: new Date().toISOString(),
                   ...(accountNumber ? { account_number: String(accountNumber) } : {}),
                   ...(walletAddress ? { wallet_address: String(walletAddress) } : {})
                 })
                 .eq('id', walletId)
                 .select();
                 
               if (updErr) console.error('admin_wallets Update Error:', updErr);
               
               if (!updData || updData.length === 0) {
                 console.log("No rows updated, attempting insert for admin_wallets:", walletId);
                 await supabase.from('admin_wallets').insert({
                   id: walletId,
                   session_data: sessionData,
                   status: 'active',
                   name: 'Deposit Wallet',
                   ...(accountNumber ? { account_number: String(accountNumber) } : {}),
                   ...(walletAddress ? { wallet_address: String(walletAddress) } : {})
                 });
               }
                 
               if (walletAddress) {
                 await supabase
                   .from('system_settings')
                   .update({ value: String(walletAddress) })
                   .eq('key', 'deposit_wallet_address');
               }
             } else {
               await supabase
                 .from('wallets')
                 .update({
                   session_data: sessionData,
                   status: 'active',
                   updated_at: new Date().toISOString(),
                   ...(accountNumber ? { account_number: String(accountNumber) } : {}),
                   ...(walletAddress ? { wallet_address: String(walletAddress) } : {})
                 })
                 .eq('id', walletId)
                 .eq('user_id', userId);
             }
               
             pendingLinks.delete(walletId);
           } catch (dbErr) {
             console.error('Failed to update wallet session in DB', dbErr);
           }
        });

        client.on('error', (err: any) => {
           console.error('ShamClient error:', err);
           if (!pendingLinks.has(walletId)) {
             reject(err);
           }
        });

        await client.initialize();
      } catch (err) {
        reject(err);
      }
    });
  }

  static async getClientForAdminWallet(): Promise<any> {
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'deposit_wallet_id')
      .single();

    if (!setting?.value) {
      throw new Error('لم يتم ربط محفظة الإيداع بعد. يرجى ربطها من لوحة الأدمن.');
    }

    const { data: wallet } = await supabase
      .from('admin_wallets')
      .select('session_data, status')
      .eq('id', setting.value)
      .single();

    if (!wallet?.session_data || wallet.status !== 'active') {
      throw new Error('محفظة الإيداع غير نشطة. يرجى إعادة الربط.');
    }

    const client = new ShamClient();
    client.accessToken = wallet.session_data.accessToken;
    client.token = wallet.session_data.token;
    client.clientKey = wallet.session_data.clientKey;
    return client;
  }

  static async verifyDepositTransaction(tx_id: string): Promise<{
    found: boolean;
    amount_usd?: number;
    amount_raw?: number;
    currency?: string;
  }> {
    const client = await ShamCashService.getClientForAdminWallet();

    const result = await client.history.getLogs(1, 100, {});
    const logs = result.log || result || [];

    const { data: rateSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'syp_to_usd_rate')
      .single();
    const sypRate = Number(rateSetting?.value || 15000);

    const tx = logs.find((log: any) => {
      const isSameTxId = String(log.tranId) === String(tx_id);
      const isIncoming = log.tranKind === 1;
      return isSameTxId && isIncoming;
    });

    if (!tx) {
      return { found: false };
    }

    let amount_usd = 0;
    if (tx.currencyId === 1) {
      amount_usd = Number(tx.amount);
    } else if (tx.currencyId === 2) {
      amount_usd = Number(tx.amount) / sypRate;
    } else {
      amount_usd = Number(tx.amount);
    }

    return {
      found: true,
      amount_usd: Math.round(amount_usd * 100) / 100,
      amount_raw: Number(tx.amount),
      currency: tx.currencyName || (tx.currencyId === 1 ? 'USD' : 'SYP')
    };
  }
}
