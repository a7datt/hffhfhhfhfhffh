import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet as WalletIcon, QrCode } from 'lucide-react';
import { fetchApi } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

interface Wallet {
  id: string;
  wallet_address: string;
  name: string;
  status: string;
}

export default function Wallets() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [newWalletName, setNewWalletName] = useState('');
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);
  const [linkError, setLinkError] = useState('');

  useEffect(() => {
    loadWallets();
  }, []);

  const loadWallets = async () => {
    try {
      const res = await fetchApi('/api/dashboard/wallets');
      const data = await res.json();
      setWallets(data);
    } catch (e) {
      console.error(e);
      toast.error('فشل جلب الحسابات');
    } finally {
      setLoading(false);
    }
  };

  const handleInitLink = async (e: React.FormEvent, existingWalletId?: string) => {
    if(e) e.preventDefault();
    setLinkError('');
    try {
      let endpoint = '/api/dashboard/wallets/link/init';
      let payload = { name: newWalletName || 'محفظة جديدة' };
      // Note: we might not have a specific re-link endpoint, so we just create a new link session and delete old if we want to replace,
      // Or we can just let them create a new wallet, and delete the expired one. But let's assume we use same endpoint
      // actually, the backend /api/dashboard/wallets/link/init generates a new wallet. We don't have a relink for existing yet.
      // So let's just make it create a new one. Wait, if it generates new, the old one will be there. We should delete the old one when doing this.

      const res = await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        if(existingWalletId) {
          // delete existing expired wallet before polling completes
          await fetchApi(`/api/dashboard/wallets/${existingWalletId}`, { method: 'DELETE' });
        }
        setPendingWalletId(data.walletId);
        setQrPayload(data.qrPayload);
        setStep(2);
      } else {
        setLinkError(data.error || 'حدث خطأ غير متوقع');
        toast.error(data.error || 'حدث خطأ غير متوقع');
      }
    } catch (e: any) {
      setLinkError(e.message || 'حدث خطأ');
      toast.error(e.message || 'حدث خطأ');
    }
  };

  const deleteWallet = async (e: React.MouseEvent, id: string) => {
     e.preventDefault();
     if(confirm('هل أنت متأكد من حذف هذه المحفظة؟')) {
       try {
         await fetchApi(`/api/dashboard/wallets/${id}`, { method: 'DELETE' });
         toast.success('تم حذف المحفظة بنجاح');
         loadWallets();
       } catch(err) {
         console.error(err);
         toast.error('فشل في حذف المحفظة');
       }
     }
  };

  useEffect(() => {
    let interval: any;
    if (step === 2 && pendingWalletId) {
      interval = setInterval(async () => {
        try {
          const res = await fetchApi(`/api/dashboard/wallets/link/status/${pendingWalletId}`);
          const data = await res.json();
          if (data.linked) {
             clearInterval(interval);
             setShowAddModal(false);
             setStep(1);
             setNewWalletName('');
             setQrPayload(null);
             setPendingWalletId(null);
             toast.success('تم ربط حساب شام كاش بنجاح!');
             loadWallets();
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [step, pendingWalletId]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#0936AD]">المحافظ</h1>
        <button 
          onClick={() => { setShowAddModal(true); setStep(1); setLinkError(''); setNewWalletName(''); }}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          إضافة محفظة شام كاش
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500 flex justify-center items-center gap-2"><span className="w-5 h-5 border-2 border-gray-300 border-t-primary-dark rounded-full animate-spin"></span> جاري التحميل...</div>
      ) : wallets.filter(w => w.status !== 'pending').length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center flex flex-col items-center">
          <WalletIcon className="w-12 h-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-[#0936AD] mb-1">لا توجد محافظ مضافة</h3>
          <p className="text-gray-500 mb-6 text-sm max-w-sm">
            يتيح لك هذه الصفحة ربط حسابات شام كاش وإدارتها عن طريق مسح رمز QR من تطبيق شام كاش.
          </p>
          <button 
            onClick={() => { setShowAddModal(true); setStep(1); setLinkError(''); setNewWalletName(''); }}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            إضافة حساب شام كاش
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.filter(w => w.status !== 'pending').map(wallet => (
            <div key={wallet.id} className="relative group">
              <Link 
                to={wallet.status === 'active' ? `/dashboard/wallets/${wallet.id}` : '#'} 
                className={`bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow block h-full ${wallet.status !== 'active' ? 'cursor-default' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${wallet.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                    <WalletIcon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-2">
                    {wallet.status === 'active' ? (
                       <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded">نشطة</span>
                    ) : (
                       <span className="bg-red-100 text-red-700 text-xs font-semibold px-2 py-1 rounded">منتهية الصلاحية</span>
                    )}
                  </div>
                </div>
                <h3 className="font-bold text-[#0936AD] truncate mb-1">{wallet.name || 'محفظة جديدة'}</h3>
                <p className="text-xs text-gray-500 break-all font-mono" dir="ltr">{wallet.wallet_address || '----'}</p>
                {wallet.status === 'expired' && (
                  <button 
                     onClick={(e) => { e.preventDefault(); setShowAddModal(true); setStep(1); setLinkError(''); setNewWalletName(wallet.name); handleInitLink(e, wallet.id); }}
                     className="mt-4 w-full bg-primary text-white text-sm py-2 rounded font-medium hover:bg-primary-dark transition"
                  >
                     إعادة الربط (تحديث الجلسة)
                  </button>
                )}
              </Link>
              
              <button 
                 onClick={(e) => deleteWallet(e, wallet.id)}
                 className="absolute top-4 left-4 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                 title="حذف المحفظة"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Wallet Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-primary/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => { setShowAddModal(false); setPendingWalletId(null); setStep(1); }}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                <WalletIcon className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">ربط حساب شام كاش</h2>
            </div>
            
            {step === 1 ? (
              <form onSubmit={handleInitLink}>
                <p className="text-sm text-gray-600 mb-4">
                  فضلاً قم بتسمية المحفظة ليسهل التعرف عليها لاحقاً.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">اسم المحفظة</label>
                  <input 
                    type="text" 
                    value={newWalletName}
                    onChange={(e) => setNewWalletName(e.target.value)}
                    required
                    placeholder="مثال: رقمي الشخصي / دفعات العمل"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {linkError && <p className="text-red-500 text-sm mb-4">{linkError}</p>}
                <button 
                  type="submit"
                  className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                >
                  التالي: توليد الرمز (QR)
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-6 text-center">
                  افتح تطبيق شام كاش ثم توجه إلى الحساب ثم الأجهزة المرتبطة ثم مسح code qr لربط الجهاز ووجه الكاميرا إلى المربع أدناه.
                </p>
                
                <div className="bg-white p-6 rounded-xl flex items-center justify-center mb-6 border-2 border-gray-100 shadow-sm mx-auto w-fit">
                  {qrPayload ? (
                     <QRCodeSVG value={qrPayload} size={200} level="H" />
                  ) : (
                     <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400">لا يوجد بيانات QR</div>
                  )}
                </div>

                <p className="text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-gray-300 border-t-primary-dark rounded-full animate-spin"></span>
                  ننتظر تأكيد الربط من التطبيق...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
