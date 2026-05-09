import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

import { Logo } from '../components/Logo';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center bg-white">
      {/* Header */}
      <header className="w-full max-w-5xl mx-auto p-4 md:p-6 flex justify-between items-center bg-white z-10">
        <div className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Logo className="w-8 h-8 rounded" />
          <span className="hidden sm:inline">SYB API</span>
        </div>
        <div className="flex gap-2 mx-2 md:gap-4 flex-shrink-0">
          <Link to="/login" className="text-sm md:text-base text-gray-600 hover:text-primary font-medium self-center px-2 py-2">
            تسجيل الدخول
          </Link>
          <Link to="/register" className="text-sm md:text-base bg-primary text-white px-3 md:px-5 py-2 md:py-2.5 rounded-lg hover:bg-primary-dark transition-colors">
            حساب جديد
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto mt-10 md:mt-20 pb-20">
        <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full mb-6 md:mb-8 text-xs md:text-sm font-medium">
          <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
          مشفر بالكامل. آمن تماماً.
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary mb-4 md:mb-6 leading-tight">
          تحقق سهل وسريع من حوالاتك
        </h1>
        
        <p className="text-lg md:text-xl text-gray-500 mb-8 md:mb-10 max-w-2xl leading-relaxed">
          احصل على API لشام كاش بحيث يمكنك جلب سجل التحويلات والقيام بعملية تحويل من محافظك المربوطة.
        </p>

        <Link to="/register" className="bg-primary text-white px-8 py-3 md:px-10 md:py-4 rounded-xl text-base md:text-lg font-bold hover:bg-primary-dark transition-all transform hover:scale-105 shadow-md">
          ابدأ الآن
        </Link>
        
        <div className="mt-10 flex justify-center">
           <img src="https://i.ibb.co/sSsmypR/image.jpg" alt="طرق الدفع المدعومة شام كاش" className="h-16 md:h-20 object-contain rounded-lg shadow-sm border border-gray-100" />
        </div>
        
        {/* Trust Section */}
        <div className="mt-16 w-full max-w-3xl mx-auto bg-gray-50 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 text-right">
          <h2 className="text-2xl md:text-3xl font-bold mb-5 text-primary text-center">لماذا تثق بنا؟</h2>
          <p className="text-gray-700 leading-relaxed mb-6 text-sm md:text-base">
            لأننا نبني علاقة ثقة مع عملائنا فلا نخفي شيء. 
            <br />
            <span className="font-semibold text-gray-900 mt-2 block">موقعنا الجغرافي:</span> سوريا / حمص / تلبيسة
            <br />
            <span className="font-semibold text-gray-900 mt-1 block">الأسم للمبرمج:</span> أحمد عتون
          </p>
          
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mb-6">
            <a href="https://wa.me/212773963897" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium shadow-sm">
              واتساب الأعمال
            </a>
            <a href="https://wa.me/963982559890" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium shadow-sm">
              واتساب شخصي
            </a>
            <a href="https://chat.whatsapp.com/DELXtdEh9ua5edFTupESNU" target="_blank" rel="noopener noreferrer" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2 text-sm font-medium shadow-sm">
              مجتمع واتساب
            </a>
          </div>

          <p className="text-gray-700 leading-relaxed text-sm bg-blue-50 p-4 rounded-xl border border-blue-100">
            اما زلت لا تثق بنا؟ لأن ثقتك غايتنا سننشر عبر حساباتنا اشتراكات الناس على منصتنا وهذه الاجراءات ليست بغريبة بل لبناء الثقة فشركتنا تسعى دائما لإرضاء عملائها.
          </p>
        </div>
        
        <div className="mt-16 md:mt-24 w-full text-center px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">بياناتك مشفرة ومحمية لدينا</h2>
          <p className="text-sm md:text-base text-gray-500 max-w-lg mx-auto">نحن نهتم بحمايتك أولاً، جميع بياناتك محمية لدينا عن طريق التشفير.</p>
        </div>
      </main>
    </div>
  );
}
