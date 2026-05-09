import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Copy, ArrowUpRight, ArrowDownLeft, Send } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function WalletDetails() {
  const { walletId } = useParams();
  const [activeTab, setActiveTab] = useState<'syp' | 'usd' | 'eur'>('syp');
  
  const [profile, setProfile] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [transferData, setTransferData] = useState({
    address: '',
    amount: '',
    note: ''
  });
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, [walletId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, balanceRes, txRes] = await Promise.all([
        fetchApi(`/api/dashboard/wallets/${walletId}/profile`),
        fetchApi(`/api/dashboard/wallets/${walletId}/balance`),
        fetchApi(`/api/dashboard/wallets/${walletId}/transactions?page=1&limit=20`)
      ]);
      
      if (profileRes.ok) {
        setProfile(await profileRes.json());
      } else {
        const errData = await profileRes.json();
        setErrorMsg(errData.error || 'فشل جلب الحساب');
      }
      
      if (balanceRes.ok) {
        const balData = await balanceRes.json();
        setBalances(balData.balances || balData || []);
      }
      
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.log || txData || []);
      }
    } catch (e) {
      console.error('Error loading wallet details', e);
    } finally {
      setLoading(false);
    }
  };

  const getBalance = (currencyId: string) => {
    const bal = balances.find(b => b.currencyId === currencyId || b.currency === currencyId || (b.currencyName && b.currencyName.toLowerCase().includes(currencyId.toLowerCase())));
    return bal ? (bal.balance ?? bal.amount ?? bal.money ?? bal.value ?? bal.total ?? bal.currentBalance ?? 0) : 0;
  };

  const resolveAccount = async () => {
    setTransferError('');
    setRecipientName(null);
    if (!transferData.address) return;
    try {
      const res = await fetchApi(`/api/dashboard/wallets/${walletId}/resolve-account`, {
        method: 'POST',
        body: JSON.stringify({ address: transferData.address })
      });
      const data = await res.json();
      
      const recipientName = data.name || data.fullName || data.accountName || data.account_name || (data.data && data.data.name);
      
      if (res.ok && !data.error && data.succeeded !== false && recipientName && recipientName !== transferData.address) {
        setRecipientName(recipientName);
      } else {
        setTransferError('لم يتم العثور على حساب صحيح');
      }
    } catch (e) {
      setTransferError('خطأ أثناء التحقق من الحساب');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    setTransferSuccess('');
    
    // Map activeTab to actual currencyId depending on library spec. 
    // Normally 'USD' is 1, 'SYP' is 2, 'EUR' is 3
    const currencyMap: any = { syp: 2, usd: 1, eur: 3 };
    
    try {
      const res = await fetchApi(`/api/dashboard/wallets/${walletId}/transfer`, {
        method: 'POST',
        body: JSON.stringify({
          peer_account: transferData.address,
          amount: Number(transferData.amount),
          currencyId: currencyMap[activeTab],
          note: transferData.note
        })
      });
      
      const data = await res.json();
      if (res.ok) {
         setTransferSuccess(`تم التحويل بنجاح! رقم العملية: ${data.txId}`);
         setTransferData({ address: '', amount: '', note: '' });
         setRecipientName(null);
         loadData(); // Reload balances
      } else {
         setTransferError(data.error || 'فشلت عملية التحويل');
      }
    } catch (e: any) {
       setTransferError(e.message || 'حدث خطأ');
    }
  };

  if (loading) {
     return <div className="p-10 text-center text-gray-500">جاري التحميل...</div>;
  }

  if (!profile) {
     return (
       <div className="p-10 text-center">
         <div className="text-red-500 font-medium mb-2">حدث خطأ أو الجلسة منتهية، يرجى محاولة الربط مجدداً.</div>
         {errorMsg && <div className="text-sm text-gray-500 bg-gray-100 p-2 rounded inline-block" dir="ltr">{errorMsg}</div>}
       </div>
     );
  }

  return (
    <div>
      <Link to="/dashboard/wallets" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-primary mb-4 md:mb-6">
        العودة للمحافظ
        <ArrowLeft className="w-4 h-4" />
      </Link>

      <h1 className="text-2xl md:text-3xl font-bold text-[#0936AD] mb-6 md:mb-8">تفاصيل المحفظة</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Profile Card */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <h2 className="flex items-center gap-2 font-bold text-lg mb-4 pb-4 border-b border-gray-100">
              <User className="w-5 h-5" />
              معلومات الحساب
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center"><span className="text-gray-500 min-w-[50px]">الاسم:</span> <span className="font-medium text-left break-words">{profile.name}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 min-w-[50px]">الهاتف:</span> <span className="font-medium text-left" dir="ltr">{profile.phone}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 shrink-0">الحساب:</span> <span className="font-medium font-mono break-all text-left max-w-[60%]">{profile.accountNumber}</span></div>
              <div className="flex justify-between items-center"><span className="text-gray-500 shrink-0">العنوان:</span> <span className="font-medium font-mono break-all text-left max-w-[60%]">{profile.address || profile.walletAddress}</span></div>
            </div>
          </div>

          {/* Balances Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
             <h2 className="font-bold text-lg mb-4">الأرصدة الحالية</h2>
             <div className="space-y-3 md:space-y-4 text-center">
               <div className="p-3 md:p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                 <span className="text-gray-500 font-medium text-sm md:text-base">دولار أمريكي</span>
                 <span className="text-lg md:text-xl font-bold font-mono">${Number(getBalance('USD') || 0).toFixed(2)}</span>
               </div>
               <div className="p-3 md:p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                 <span className="text-gray-500 font-medium text-sm md:text-base">ليرة سورية</span>
                 <span className="text-lg md:text-xl font-bold font-mono">ل.س {Number(getBalance('SYP') || 0).toLocaleString()}</span>
               </div>
               <div className="p-3 md:p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                 <span className="text-gray-500 font-medium text-sm md:text-base">يورو</span>
                 <span className="text-lg md:text-xl font-bold font-mono">€{Number(getBalance('EUR') || 0).toFixed(2)}</span>
               </div>
             </div>
          </div>
        </div>

        {/* Tranactions and Transfer */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* Transfer Form */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <h2 className="flex items-center gap-2 font-bold text-lg mb-6">
              <Send className="w-5 h-5" />
              تحويل مبلغ
            </h2>
            
            <div className="mb-4 flex flex-col sm:flex-row bg-gray-100 p-1 rounded-lg border border-gray-200 gap-1">
              <button type="button" onClick={() => setActiveTab('syp')} className={`flex-1 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'syp' ? 'bg-white shadow-sm text-primary border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>ل.س ليرة سورية</button>
              <button type="button" onClick={() => setActiveTab('usd')} className={`flex-1 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'usd' ? 'bg-white shadow-sm text-primary border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>$ دولار</button>
              <button type="button" onClick={() => setActiveTab('eur')} className={`flex-1 py-2 sm:py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'eur' ? 'bg-white shadow-sm text-primary border border-gray-200/50' : 'text-gray-500 hover:text-gray-700'}`}>€ يورو</button>
            </div>

            <form className="space-y-4" onSubmit={handleTransfer}>
              <div>
                <label className="block text-sm text-gray-700 mb-1">عنوان محفظة المستفيد</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="text" 
                    value={transferData.address}
                    onChange={(e) => setTransferData({...transferData, address: e.target.value})}
                    onBlur={resolveAccount}
                    className="flex-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                    placeholder="مثال: abc123def..."
                    required
                  />
                  <button type="button" onClick={resolveAccount} className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 w-full sm:w-auto shrink-0">تحقق</button>
                </div>
                {recipientName && <p className="text-sm text-green-600 mt-1.5">الاسم: {recipientName}</p>}
                {transferError && <p className="text-sm text-red-600 mt-1.5">{transferError}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">المبلغ</label>
                <input 
                  type="number" 
                  value={transferData.amount}
                  onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  placeholder="0.00" 
                  dir="ltr"
                  required
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">ملاحظة (اختياري)</label>
                <input 
                  type="text" 
                  value={transferData.note}
                  onChange={(e) => setTransferData({...transferData, note: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-sm" 
                  placeholder="أضف ملاحظة..."
                />
              </div>
              
              {transferSuccess && (
                <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
                  {transferSuccess}
                </div>
              )}
              
              <button 
                type="submit" 
                disabled={!transferData.address || !transferData.amount}
                className="w-full bg-primary text-white px-4 py-3 sm:py-3.5 rounded-lg font-medium hover:bg-primary-dark flex justify-center items-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4 ml-1" />
                تحويل
              </button>
            </form>
          </div>

          {/* History */}
          <div className="bg-white rounded-xl border border-gray-200 pt-1 flex flex-col">
            <h2 className="font-bold text-lg p-4 md:p-5 border-b border-gray-100 flex-shrink-0">سجل الحركات</h2>
            <div className="overflow-x-auto text-sm w-full">
              <table className="w-full text-right min-w-[700px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">النوع</th>
                    <th className="px-5 py-3 font-medium">المبلغ</th>
                    <th className="px-5 py-3 font-medium">الطرف الآخر</th>
                    <th className="px-5 py-3 font-medium">التاريخ</th>
                    <th className="px-5 py-3 font-medium">رقم العملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((tx: any, idx) => {
                    const isIncoming = tx.tranKind === 1 || tx.type === 'in' || tx.type === 'income';
                    return (
                    <tr key={tx.tranId || tx.id || idx} className="hover:bg-gray-50">
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isIncoming ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <ArrowDownLeft className="w-3.5 h-3.5" /> استلام
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <ArrowUpRight className="w-3.5 h-3.5" /> إرسال
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold whitespace-nowrap" dir="ltr">
                        {isIncoming 
                          ? <span className="text-green-600">+{tx.amount} {tx.currencyName || tx.currency}</span> 
                          : <span className="text-red-600">-{tx.amount} {tx.currencyName || tx.currency}</span>}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                         <div className="font-medium truncate max-w-[150px]">{tx.peerUserName || tx.peer || tx.peerAccountInfo?.name || 'غير متوفر'}</div>
                         <div className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{tx.peerAccountNumber || tx.peerAccountAddress || ''}</div>
                      </td>
                      <td className="px-5 py-4 text-gray-500 whitespace-nowrap" dir="ltr">
                        {tx.tranDate} {tx.tranTime}
                      </td>
                      <td className="px-5 py-4 font-mono text-gray-500 text-xs">
                        <div className="flex items-center gap-2">
                           <span className="truncate max-w-[100px] block" title={tx.tranId || tx.id}>{tx.tranId || tx.id}</span>
                           <Copy className="w-3.5 h-3.5 cursor-pointer hover:text-primary shrink-0" onClick={() => navigator.clipboard.writeText(tx.tranId || tx.id)} />
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                     <tr><td colSpan={5} className="p-8 text-center text-gray-500">لا يوجد حركات لعرضها</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
