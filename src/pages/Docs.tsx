import { Copy, ChevronDown } from 'lucide-react';

export default function Docs() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const baseUrl = window.location.origin;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold text-[#0936AD] mb-2">توثيق API</h1>
        <p className="text-gray-500">واجهة برمجية للوصول إلى محافظك من أي تطبيق خارجي</p>
      </div>

      {/* Auth */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm">
        <h2 className="font-bold text-xl">المصادقة</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          أضف مفتاح API في ترويسة كل طلب:
        </p>
        
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm relative" dir="ltr">
          <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard('Authorization: Bearer sk_xxx')}><Copy className="w-4 h-4"/></div>
          <pre><code>Authorization: Bearer sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</code></pre>
        </div>
        <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm relative" dir="ltr">
          <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard('X-Api-Key: sk_xxx')}><Copy className="w-4 h-4"/></div>
          <pre><code>أو بديلاً: X-Api-Key: sk_xxx...</code></pre>
        </div>
        
        <div className="mt-4">
          <span className="text-sm text-gray-500 font-medium tracking-wide">العنوان الأساسي لجميع الطلبات:</span>
          <div className="bg-gray-100 text-[#0936AD] rounded-lg p-3 font-mono text-sm relative mt-2 border border-gray-200" dir="ltr">
            {baseUrl}/api
          </div>
        </div>
      </div>

      {/* Endpoint: Wallets */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs font-mono">GET</span>
          <h2 className="font-bold text-lg">المحافظ</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-100 p-3 rounded font-mono text-sm font-medium border border-gray-200" dir="ltr">/v1/wallets</div>
          <p className="text-sm text-gray-600 leading-relaxed">يعيد جميع المحافظ المربوطة بحساب صاحب المفتاح. تختلف حقول كل محفظة حسب المزوّد.</p>
          
          <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
             <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
               <span className="font-semibold text-sm text-[#0936AD]">عرض مثال للطلب والرد (JSON)</span>
               <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
             </summary>
             <div className="p-4 border-t border-gray-200 space-y-4">
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">مثال الطلب</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto relative" dir="ltr">
                     <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard(`curl ${baseUrl}/api/v1/wallets -H "Authorization: Bearer sk_xxx"`)}><Copy className="w-4 h-4"/></div>
                     <pre><code>curl {baseUrl}/api/v1/wallets{'\n'}-H "Authorization: Bearer sk_xxx"</code></pre>
                 </div>
               </div>
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">الرد الناجح</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto" dir="ltr">
                 <pre><code>{`[
  {
    "id": "f9a0738f-eb67-492a-b4ba-e3f08238fac7",
    "provider": "shamcash",
    "providerDisplayName": "ShamCash",
    "label": "محمد أحمد علي",
    "phone": "0991234567",
    "walletAddress": "e5289b724c3a3a47581b575bfdf6cd53",
    "accountNumber": "SC-00012345",
    "region": "دمشق",
    "status": "active"
  },
  {
    "id": "a3c12f88-1b2c-3d4e-5f6a-7b8c9d0e1f2a",
    "provider": "syriatel",
    "providerDisplayName": "Syriatel Cash",
    "label": "محمد",
    "phone": "0931234567",
    "cashCode": "12345678",
    "status": "active"
  }
]`}</code></pre>
                 </div>
               </div>
             </div>
          </details>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
         <h2 className="text-2xl font-bold text-[#0936AD] mb-6">شام كاش</h2>
      </div>

      {/* Endpoint: Shamcash Balance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs font-mono">GET</span>
          <h2 className="font-bold text-lg">الرصيد</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-100 p-3 rounded font-mono text-sm font-medium border border-gray-200" dir="ltr">/v1/wallets/shamcash/{"{walletAddress}"}/balance</div>
          
          <div>
            <h3 className="font-semibold text-sm mb-3">المعاملات</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
               <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                     <tr>
                        <th className="px-4 py-3 font-medium">المعاملة</th>
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">الوصف</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">walletAddress</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600">id المحفظة (UUID) أو عنوان المحفظة (32 hex) أو رقم الحساب</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
             <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
               <span className="font-semibold text-sm text-[#0936AD]">عرض مثال للطلب والرد (JSON)</span>
               <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
             </summary>
             <div className="p-4 border-t border-gray-200 space-y-4">
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">مثال الطلب</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto relative" dir="ltr">
                     <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard(`curl ${baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/balance -H "Authorization: Bearer sk_xxx"`)}><Copy className="w-4 h-4"/></div>
                     <pre><code>curl {baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/balance{'\n'}-H "Authorization: Bearer sk_xxx"</code></pre>
                 </div>
               </div>
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">الرد الناجح</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto" dir="ltr">
                 <pre><code>{`[
  { "currency": "USD", "amount": 4.1, "label": null },
  { "currency": "SYP", "amount": 1606.5, "label": null },
  { "currency": "EUR", "amount": 0, "label": null }
]`}</code></pre>
                 </div>
               </div>
             </div>
          </details>
        </div>
      </div>

      {/* Endpoint: Shamcash Transactions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded text-xs font-mono">GET</span>
          <h2 className="font-bold text-lg">سجل التحويلات (Transactions)</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-100 p-3 rounded font-mono text-sm font-medium border border-gray-200" dir="ltr">/v1/wallets/shamcash/{"{walletAddress}"}/transactions</div>
          <p className="text-sm text-gray-600 leading-relaxed">يدعم فلتر الاتجاه: in (وارد) · out (صادر) · all (الكل، افتراضي)</p>
          
          <div>
            <h3 className="font-semibold text-sm mb-3">المعاملات</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
               <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                     <tr>
                        <th className="px-4 py-3 font-medium">المعاملة</th>
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">الوصف</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">walletAddress</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600">id المحفظة (UUID) أو عنوان المحفظة (32 hex) أو رقم الحساب</td>
                     </tr>
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">direction</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-gray-600 text-xs font-bold bg-gray-100 px-2 py-1 rounded">اختياري</span></td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-sm" dir="ltr">in | out | all <span className="font-sans text-gray-500">(افتراضي: all)</span></td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
             <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
               <span className="font-semibold text-sm text-[#0936AD]">عرض مثال للطلب والرد (JSON)</span>
               <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
             </summary>
             <div className="p-4 border-t border-gray-200 space-y-4">
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">مثال - الحركات الواردة فقط</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto relative" dir="ltr">
                     <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard(`curl "${baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/transactions?direction=in" -H "Authorization: Bearer sk_xxx"`)}><Copy className="w-4 h-4"/></div>
                     <pre><code>curl "{baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/transactions?direction=in"{'\n'}-H "Authorization: Bearer sk_xxx"</code></pre>
                 </div>
               </div>
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">الرد الناجح</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto" dir="ltr">
                 <pre><code>{`[
  {
    "id": "202235201",
    "type": "credit",
    "amount": 1600,
    "currency": "SYP",
    "counterparty": "حسين أحمد يوسف",
    "description": null,
    "status": null,
    "occurredAt": "2026-04-30T20:17:29"
  }
]`}</code></pre>
                 </div>
               </div>
             </div>
          </details>
        </div>
      </div>

      {/* Endpoint: Shamcash Transfer */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
          <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-xs font-mono">POST</span>
          <h2 className="font-bold text-lg">تحويل مالي (Transfer)</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-gray-100 p-3 rounded font-mono text-sm font-medium border border-gray-200" dir="ltr">/v1/wallets/shamcash/{"{walletAddress}"}/transfer</div>
          
          <div>
            <h3 className="font-semibold text-sm mb-3">معاملات المسار (Path Parameter)</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
               <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                     <tr>
                        <th className="px-4 py-3 font-medium">المعاملة</th>
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">الوصف</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">walletAddress</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600">id المحفظة (UUID) أو عنوان المحفظة (32 hex) أو رقم الحساب</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">جسم الطلب (JSON Request Body)</h3>
            <div className="border border-gray-200 rounded-lg overflow-x-auto">
               <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                     <tr>
                        <th className="px-4 py-3 font-medium">الحقل</th>
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                        <th className="px-4 py-3 font-medium">الوصف</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">recipientAddress</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600">عنوان محفظة المستفيد</td>
                     </tr>
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">currencyId</td>
                        <td className="px-4 py-3 font-mono text-blue-600">number</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-sm" dir="ltr">1=USD · 2=SYP · 3=EUR</td>
                     </tr>
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">amount</td>
                        <td className="px-4 py-3 font-mono text-blue-600">number</td>
                        <td className="px-4 py-3"><span className="text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded">مطلوب</span></td>
                        <td className="px-4 py-3 text-gray-600">المبلغ (موجب)</td>
                     </tr>
                     <tr>
                        <td className="px-4 py-3 font-mono font-bold text-[#0936AD]" dir="ltr">note</td>
                        <td className="px-4 py-3 font-mono text-blue-600">string</td>
                        <td className="px-4 py-3"><span className="text-gray-600 text-xs font-bold bg-gray-100 px-2 py-1 rounded">اختياري</span></td>
                        <td className="px-4 py-3 text-gray-600">ملاحظة اختيارية مع التحويل</td>
                     </tr>
                  </tbody>
               </table>
            </div>
          </div>

          <details className="group border border-gray-200 rounded-lg overflow-hidden bg-white">
             <summary className="flex items-center justify-between p-4 cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
               <span className="font-semibold text-sm text-[#0936AD]">عرض مثال للطلب والرد (JSON)</span>
               <ChevronDown className="w-5 h-5 text-gray-500 transition-transform group-open:rotate-180" />
             </summary>
             <div className="p-4 border-t border-gray-200 space-y-4">
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">مثال الطلب</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto relative" dir="ltr">
                     <div className="absolute right-3 top-3 text-gray-400 hover:text-white cursor-pointer" onClick={() => copyToClipboard(`curl -X POST ${baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/transfer -H "Authorization: Bearer sk_xxx" -H "Content-Type: application/json" -d '{"recipientAddress": "cf3a8cd33b27ba7a31793b069d919a44", "currencyId": 2, "amount": 500}'`)}><Copy className="w-4 h-4"/></div>
                     <pre><code>{`curl -X POST ${baseUrl}/api/v1/wallets/shamcash/e5289b724c3a3a47581b575bfdf6cd53/transfer \\
-H "Authorization: Bearer sk_xxx" \\
-H "Content-Type: application/json" \\
-d '{
  "recipientAddress": "cf3a8cd33b27ba7a31793b069d919a44",
  "currencyId": 2,
  "amount": 500
}'`}</code></pre>
                 </div>
               </div>
               <div>
                 <h3 className="font-medium text-xs text-gray-500 mb-2 uppercase tracking-wider">الرد الناجح</h3>
                 <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-x-auto" dir="ltr">
                 <pre><code>{`{
  "success": true,
  "message": "تم التحويل بنجاح"
}`}</code></pre>
                 </div>
               </div>
             </div>
          </details>
        </div>
      </div>
      
      <div className="mt-8 text-center text-sm text-gray-500">
         لأي استفسارات بخصوص الربط، يرجى التواصل مع الدعم الفني.
      </div>
    </div>
  );
}
