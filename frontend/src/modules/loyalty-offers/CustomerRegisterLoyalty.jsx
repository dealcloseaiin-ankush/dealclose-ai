import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Award, Star, Gift, Smartphone, User, MapPin, 
  Sparkles, CheckCircle2, ArrowRight, ShieldCheck, Store 
} from 'lucide-react';
import loyaltyOffersApi from './services/loyaltyOffersApi';

export default function CustomerRegisterLoyalty() {
  const { merchantId: paramMerchantId } = useParams();
  const [searchParams] = useSearchParams();
  const merchantId = paramMerchantId || searchParams.get('merchantId') || '';
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('कृपया 10 अंकों का मान्य व्हाट्सएप नंबर दर्ज करें।');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('कृपया अपना नाम दर्ज करें।');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await loyaltyOffersApi.publicRegisterWalkin({
        merchantId,
        name: name.trim(),
        phone: cleanPhone,
        city: city.trim()
      });

      if (res.success) {
        setSuccessResult(res);
        // Automatically redirect to pass after 2 seconds or let them click
        setTimeout(() => {
          navigate(`/pass/${cleanPhone}${merchantId ? `?merchantId=${merchantId}` : ''}`);
        }, 1800);
      } else {
        setErrorMsg(res.message || 'पंजीकरण में त्रुटि हुई।');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.response?.data?.message || 'पंजीकरण करने में असमर्थ। कृपया पुनः प्रयास करें।');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090c] text-white p-4 sm:p-6 flex flex-col items-center justify-center antialiased selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md space-y-6">
        {/* Top Header Card */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Star className="w-8 h-8 text-black fill-black" />
          </div>
          <span className="text-[11px] font-black tracking-widest text-amber-400 uppercase bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full inline-block">
            🌟 वीआईपी लॉयल्टी क्लब में शामिल हों
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">अपना डिजिटल पास पाएं</h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            हर विजिट पर स्टैम्प पाएं और 5वीं विजिट पर विशेष उपहार या डिस्काउंट अनलॉक करें!
          </p>
        </div>

        {/* Registration Card or Success Card */}
        {successResult ? (
          <div className="bg-[#14141c] border-2 border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-white">बधाई हो! पास तैयार है 🎉</h2>
            <p className="text-xs text-gray-300">
              {successResult.message || 'आपका डिजिटल लॉयल्टी पास सक्रिय कर दिया गया है।'}
            </p>

            <div className="pt-2">
              <button
                onClick={() => navigate(`/pass/${phone.replace(/\D/g, '').slice(-10)}${merchantId ? `?merchantId=${merchantId}` : ''}`)}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>पास देखें</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {successResult.waLink && (
              <a
                href={successResult.waLink}
                target="_blank"
                rel="noreferrer"
                className="block text-xs text-emerald-400 hover:underline pt-1"
              >
                📲 WhatsApp पर पास लिंक सेव करें
              </a>
            )}
          </div>
        ) : (
          <div className="bg-[#14141c] border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-950/50 border border-red-500/40 rounded-xl text-xs text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  आपका नाम (Full Name) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="उदा. राहुल शर्मा"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1b1b26] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  व्हाट्सएप मोबाइल नंबर (WhatsApp Number) *
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10 अंकों का नंबर"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-[#1b1b26] border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  * इसी नंबर पर आपका पास सेव रहेगा और रिवॉर्ड संदेश मिलेगा।
                </p>
              </div>

              {/* City (Optional) */}
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  शहर / इलाका (City / Area - Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="उदा. सिविल लाइन्स, रायपुर"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-[#1b1b26] border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:opacity-90 disabled:opacity-50 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 mt-2"
              >
                {submitting ? (
                  <span>सत्यापित किया जा रहा है...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>मुफ़्त डिजिटल पास प्राप्त करें</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-gray-800/80 text-center text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>100% नि:शुल्क एवं फ्रॉड-सुरक्षित</span>
              </div>
              <p className="text-[10px] text-gray-500">
                नोट: स्टैम्प केवल काउंटर पर खरीदारी के समय कैशियर द्वारा स्कैन करने पर ही जुड़ेगा।
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
