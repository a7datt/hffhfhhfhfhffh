import React, { useState, useEffect } from 'react';
import { Key, Copy, Trash } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const res = await fetchApi('/api/dashboard/api-keys');
      const data = await res.json();
      setKeys(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchApi('/api/dashboard/api-keys', {
        method: 'POST',
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();
      setNewRawKey(data.rawKey);
      setNewKeyName('');
      loadKeys();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المفتاح؟')) return;
    try {
      await fetchApi(`/api/dashboard/api-keys/${id}`, { method: 'DELETE' });
      loadKeys();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Key className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-[#0936AD]">مفاتيح API</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-bold text-lg mb-2">إنشاء مفتاح جديد</h2>
        <p className="text-gray-500 text-sm mb-4">اختر اسماً وصفياً للمفتاح</p>
        
        <form onSubmit={handleCreate} className="flex gap-2">
          <input 
            type="text" 
            placeholder="مثال: بوت تيليغرام"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            required
          />
          <button type="submit" className="bg-gray-100 text-primary px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            + إنشاء
          </button>
        </form>

        {newRawKey && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-green-800 font-bold mb-2">تم إنشاء المفتاح بنجاح!</h3>
            <p className="text-sm text-green-700 mb-4">انسخ المفتاح الآن. لن تتمكن من رؤيته مرة أخرى:</p>
            <div className="flex bg-white border border-green-300 rounded overflow-hidden">
              <button 
                onClick={() => navigator.clipboard.writeText(newRawKey)}
                className="p-3 bg-green-100 hover:bg-green-200 text-green-700 border-l border-green-300"
              >
                <Copy className="w-5 h-5" />
              </button>
              <div className="flex-1 p-3 font-mono text-sm break-all" dir="ltr">{newRawKey}</div>
            </div>
            <button 
              onClick={() => setNewRawKey(null)}
              className="mt-4 text-sm text-green-700 underline"
            >
              لقد نسخته، متأكد
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-bold text-lg mb-4">المفاتيح الحالية</h2>
        
        {loading ? (
          <div className="text-gray-500">جاري التحميل...</div>
        ) : keys.length === 0 ? (
          <div className="text-gray-500 text-sm">لا يوجد مفاتيح مضافة</div>
        ) : (
          <div className="space-y-4">
            {keys.map(k => (
              <div key={k.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50 flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm mb-2">{k.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-gray-600 bg-white px-2 py-1 border border-gray-200 rounded" dir="ltr">{k.key_prefix}</span>
                    <Copy className="w-4 h-4 text-gray-400 cursor-pointer hover:text-primary" />
                  </div>
                  <div className="text-xs text-gray-500">
                    تم الإنشاء: <span dir="ltr">{new Date(k.created_at).toLocaleDateString()}</span> • 
                    آخر استخدام: <span dir="ltr">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'لم يستخدم بعد'}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(k.id)} className="text-gray-400 hover:text-red-600 p-2">
                  <Trash className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
