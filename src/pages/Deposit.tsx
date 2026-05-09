import React, { useState, useEffect } from 'react';
import { Smartphone, Copy, QrCode, RefreshCcw } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

export default function Deposit() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [depositAddress, setDepositAddress] = useState('...');
  const [exchangeRate, setExchangeRate] = useState<number>(15000);
  
  const [txId, setTxId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subRes, reqRes, rateRes] = await Promise.all([
        fetchApi('/api/dashboard/subscription'),
        fetchApi('/api/dashboard/deposit/requests'),
        fetchApi('/api/dashboard/settings/exchange-rate')
      ]);
      const subData = await subRes.json();
      setBalance(Number(subData.current_balance || 0));
      
      const reqData = await reqRes.json();
      setRequests(reqData);

      const rateData = await rateRes.json();
      if(rateData.success) {
        setExchangeRate(rateData.syp_to_usd_rate);
        setDepositAddress(rateData.deposit_wallet_address || 'not_linked');
      }
    } catch (e) {
      console.error('Failed to load data', e);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    toast.success('تم النسخ!');
  };

  const handleDepositRequest = async () => {
    if (!txId) return;
    setSubmitting(true);
    
    try {
       const res = await fetchApi('/api/dashboard/deposit/request', {
         method: 'POST',
         body: JSON.stringify({ tx_id: txId })
       });
       const data = await res.json();
       
       if (res.ok) {
         if (data.status === 'approved') {
            toast.success(`تم التحقق بنجاح! تمت إضافة \$${data.amount_usd} إلى رصيدك.`);
         } else {
            toast('تم تقديم طلب الإيداع. المعاملة غير متوفرة بعد، يرجى المحاولة لاحقاً', { icon: '⏳' });
         }
         setTxId('');
         loadData();
       } else {
         toast.error(data.error || 'حدث خطأ');
       }
    } catch (e: any) {
       toast.error(e.message || 'حدث خطأ غير متوقع');
    } finally {
       setSubmitting(false);
    }
  };

  const reVerify = async (requestId: string) => {
    setVerifyingId(requestId);
    try {
      const res = await fetchApi(`/api/dashboard/deposit/reverify`, {
        method: 'POST',
        body: JSON.stringify({ request_id: requestId })
      });
      const data = await res.json();
      if (res.ok) {
         if (data.status === 'approved') {
            toast.success(`تم التحقق بنجاح! تمت إضافة \$${data.amount_usd} إلى رصيدك.`);
         } else {
            toast('لم يتم العثور على المعاملة بعد، حاول مجدداً بعد دقائق', { icon: '⏳' });
         }
         loadData();
      } else {
         toast.error(data.error || 'حدث خطأ');
      }
    } catch (e: any) {
       toast.error(e.message || 'حدث خطأ');
    } finally {
       setVerifyingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-[#0936AD] mb-6">إيداع رصيد</h1>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="text-gray-500 font-medium mb-4">الرصيد الحالي</div>
        <div className="text-4xl font-bold font-mono">${balance.toFixed(2)}</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-bold text-lg mb-4">1. طريقة الإيداع المتاحة</h2>
        <div className="grid grid-cols-1 gap-4">
          <div 
            className="p-4 border border-primary bg-gray-50 rounded-xl flex flex-col items-center justify-center gap-3 cursor-default"
          >
            <img src="https://i.ibb.co/sSsmypR/image.jpg" alt="طريقة الدفع شام كاش" className="h-16 md:h-20 object-contain rounded-lg" />
            <div className="font-bold text-sm">شام كاش</div>
            <div className="text-xs text-gray-500">متاح فقط الإيداع عبر شام كاش حالياً</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 text-center">
        <h2 className="font-bold text-lg mb-4">2. حوّل إلى المحفظة أدناه</h2>
        
        {depositAddress === 'not_linked' ? (
           <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-lg">لم يتم تعيين محفظة الإيداع من قبل الإدارة بعد.</div>
        ) : (
          <>
            <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg text-sm mb-6 flex flex-col items-center">
              <p className="font-medium">حول المبلغ المطلوب إلى العنوان التالي وأدخل رقم العملية للتحقق التلقائي.</p>
              <p className="mt-1">سعر الصرف المعتمد: <span className="font-bold font-mono" dir="ltr">1 USD = {exchangeRate} SYP</span></p>
            </div>

            <div className="mb-2 text-sm text-gray-500">عنوان شام كاش للإيداع</div>
            <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden mb-6">
              <button onClick={copyToClipboard} className="p-3 bg-gray-100 hover:bg-gray-200 border-l border-gray-200 text-gray-600 transition-colors">
                <Copy className="w-5 h-5" />
              </button>
              <div className="flex-1 p-3 font-mono text-sm break-all text-left" dir="ltr">
                {depositAddress}
              </div>
            </div>

            <div className="inline-block p-4 border border-gray-200 rounded-xl bg-white shadow-sm">
              {depositAddress && depositAddress.length > 10 && <QRCodeSVG value={depositAddress} size={150} level="H" />}
            </div>
            <div className="text-sm mt-2 text-gray-500">أو امسح رمز QR</div>
          </>
        )}
      </div>

      {depositAddress !== 'not_linked' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-bold text-lg mb-4">3. أدخل رقم العملية</h2>
          <div className="mb-4">
            <label className="block text-sm text-gray-700 mb-1">رقم العملية (Transaction ID)</label>
            <input 
                type="text" 
                value={txId}
                onChange={e => setTxId(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left" 
                placeholder="مثال: 12345678" 
                dir="ltr"
            />
          </div>
          <button 
            onClick={handleDepositRequest}
            disabled={submitting || !txId}
            className="w-full bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
            تحقق وأضف الرصيد
          </button>
        </div>
      )}

      {/* Requests History */}
      {requests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mt-6">
            <h2 className="font-bold text-lg mb-4">طلبات الإيداع السابقة</h2>
            <div className="space-y-3">
              {requests.map(req => (
                <div key={req.id} className="p-3 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50">
                    <div>
                      <div className="font-mono text-sm">{req.tx_id}</div>
                      <div className="text-xs text-gray-500">{new Date(req.created_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'pending' && <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded text-xs font-medium">قيد المراجعة اليدوية</span>}
                      {req.status === 'pending_verification' && (
                         <>
                           <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs font-medium">يدخل المراجعة التلقائية</span>
                           <button 
                              onClick={() => reVerify(req.id)}
                              disabled={verifyingId === req.id}
                              className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1 rounded transition disabled:opacity-50"
                              title="إعادة التحقق"
                           >
                              <RefreshCcw className={`w-4 h-4 ${verifyingId === req.id ? 'animate-spin' : ''}`} />
                           </button>
                         </>
                      )}
                      {req.status === 'approved' && <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium">تمت الموافقة (${req.amount_usd})</span>}
                      {req.status === 'rejected' && <span className="text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium">مرفوض</span>}
                    </div>
                </div>
              ))}
            </div>
        </div>
      )}

    </div>
  );
}
