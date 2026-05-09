import React, { useState, useEffect } from 'react';
import { ToggleRight, ToggleLeft } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function Subscription() {
  const [sub, setSub] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [numWallets, setNumWallets] = useState(1);
  const [numMonths, setNumMonths] = useState(1);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');

  useEffect(() => {
    loadSub();
  }, []);

  const loadSub = async () => {
    try {
      const res = await fetchApi('/api/dashboard/subscription');
      const data = await res.json();
      setSub(data);
      setNumWallets(data.max_wallets || 1);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoRenew = async () => {
    try {
      const newValue = !sub.auto_renew;
      await fetchApi('/api/dashboard/subscription/toggle-auto-renew', {
        method: 'POST',
        body: JSON.stringify({ auto_renew: newValue })
      });
      setSub({ ...sub, auto_renew: newValue });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpgrade = async () => {
    setUpgradeError('');
    setUpgradeSuccess('');
    try {
      const res = await fetchApi('/api/dashboard/subscription/upgrade', {
        method: 'POST',
        body: JSON.stringify({ num_wallets: numWallets, num_months: numMonths })
      });
      const data = await res.json();
      if (res.ok) {
        setUpgradeSuccess('تم بنجاح!');
        loadSub();
      } else {
        setUpgradeError(data.error);
      }
    } catch (e: any) {
      setUpgradeError(e.message || 'Error occurred');
    }
  };

  if (loading) return <div className="p-10 text-center">جاري التحميل...</div>;
  if (!sub) return null;

  const cost = numWallets * numMonths * 0.50;
  const newBalance = Number(sub.current_balance) - cost;
  const canAfford = newBalance >= 0;
  const isExpired = sub.expires_at ? new Date(sub.expires_at) < new Date() : true;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[#0936AD]">الاشتراك والرصيد</h1>
      
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <h2 className="font-bold text-lg">حالة الاشتراك</h2>
        
        <div className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
          <span className="text-gray-500 font-medium">الرصيد المتاح (USD)</span>
          <span className="text-2xl font-bold font-mono">${Number(sub.current_balance || 0).toFixed(2)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg flex flex-col justify-center items-center text-center">
            <span className="text-gray-500 font-medium text-sm mb-1">الحالة</span>
            {isExpired ? (
              <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded text-sm mb-1">منتهي</span>
            ) : (
              <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-sm mb-1">نشط</span>
            )}
            <span className="text-xs text-gray-500" dir="ltr">
              {sub.expires_at ? `ينتهي ${new Date(sub.expires_at).toLocaleDateString()}` : 'ليس لديك اشتراك'}
            </span>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg flex flex-col justify-center items-center text-center">
            <span className="text-gray-500 font-medium text-sm mb-1">المحافظ</span>
            <span className="text-xl font-bold font-mono" dir="ltr">{sub.active_wallets_count || 0} / {sub.max_wallets || 0}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
        {sub.auto_renew ? 
          <ToggleRight className="w-8 h-8 text-primary flex-shrink-0 cursor-pointer" onClick={handleToggleAutoRenew} /> :
          <ToggleLeft className="w-8 h-8 text-gray-300 flex-shrink-0 cursor-pointer" onClick={handleToggleAutoRenew} />
        }
        <div>
          <h3 className="font-bold mb-1">التجديد التلقائي {sub.auto_renew ? <span className="text-green-600 font-normal text-sm">مفعل</span> : <span className="text-gray-500 font-normal text-sm">معطل</span>}</h3>
          <p className="text-sm text-gray-500">
            التجديد التلقائي مفعل، عند انتهاء اشتراكك، سيتم خصم تكلفة التجديد من رصيدك تلقائياً بنفس عدد المحافظ ولمدة حتى 1 شهر. <br/><br/>
            إذا كان رصيدك لا يكفي لكامل المدة، يتم التجديد لأقصى عدد من الأشهر يكفيه الرصيد، وإذا لم يكف حتى لشهر واحد، تتجمد الخدمة.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-6">تجديد أو ترقية الاشتراك</h2>
        
        <div className="bg-gray-50 p-3 rounded-lg text-sm text-center mb-6">
          السعر الحالي: <strong>$0.50</strong> لكل محفظة لمدة 30 يوم
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm text-gray-700 mb-1">عدد المحافظ</label>
            <input 
              type="number" 
              value={numWallets} 
              onChange={e => setNumWallets(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono" 
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">الحد الكلي للمحافظ التي تريدها - لديك {sub.active_wallets_count || 0} مربوطة حالياً</p>
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-1">عدد الأشهر الإضافية</label>
            <input 
              type="number" 
              value={numMonths} 
              onChange={e => setNumMonths(Math.max(1, Number(e.target.value)))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary font-mono" 
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">تضاف فوق مدة اشتراكك الحالية</p>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg grid grid-cols-2 gap-4 mb-6 text-center">
          <div>
            <div className="text-sm text-gray-500 mb-1">التكلفة الإجمالية</div>
            <div className="text-xl font-bold font-mono">${cost.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 mb-1">سيتبقى من رصيدك</div>
            {canAfford ? (
              <div className="text-xl font-bold font-mono text-green-600">${newBalance.toFixed(2)}</div>
            ) : (
              <div className="text-xl font-bold font-mono text-red-600">رصيد غير كاف</div>
            )}
          </div>
        </div>

        {upgradeError && <p className="text-red-500 text-sm mb-4">{upgradeError}</p>}
        {upgradeSuccess && <p className="text-green-500 text-sm mb-4">{upgradeSuccess}</p>}

        <button 
          onClick={handleUpgrade}
          disabled={!canAfford}
          className="w-full bg-primary text-white px-4 py-3 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ترقية / تجديد
        </button>
      </div>

    </div>
  );
}
