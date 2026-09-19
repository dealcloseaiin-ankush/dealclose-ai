import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react';
import { 
  Award, Star, Gift, CheckCircle, Smartphone, 
  MapPin, Store, Sparkles, ExternalLink, ShieldCheck, 
  Share2, ArrowLeft, RefreshCw 
} from 'lucide-react';
import loyaltyOffersApi from './services/loyaltyOffersApi';

export default function CustomerPassView() {
  const { phone } = useParams();
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [passData, setPassData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPass();
  }, [phone, merchantId]);

  const loadPass = async () => {
    if (!phone) return;
    try {
      setLoading(true);
      setError(null);
      const res = await loyaltyOffersApi.getPublicCustomerPass(phone, merchantId);
      if (res.success) {
        setPassData(res);
      } else {
        setError(res.message || 'डिजिटल पास लोड नहीं हो सका।');
      }
    } catch (err) {
      console.error('Error loading pass:', err);
      setError(err.response?.data?.message || 'डिजिटल पास लोड नहीं हो सका। कृपया बाद में प्रयास करें।');
    } finally {
      setLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    const passUrl = window.location.href;
    const text = `मेरा ${passData?.shop?.name || 'स्टोर'} डिजिटल लॉयल्टी पास:\n👉 ${passUrl}\n\nकाउंटर पर स्टैम्प और उपहार पाने के लिए यह पास खोलें!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-4 text-white">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 flex items-center justify-center animate-spin mb-4">
          <Star className="w-7 h-7 text-amber-400" />
        </div>
        <p className="text-base font-bold text-amber-200">आपका डिजिटल पास लोड हो रहा है...</p>
        <p className="text-xs text-gray-400 mt-1">सुरक्षित डेटा प्राप्त किया जा रहा है</p>
      </div>
    );
  }

  if (error || !passData) {
    return (
      <div className="min-h-screen bg-[#0d0d12] flex flex-col items-center justify-center p-4 text-white text-center">
        <div className="bg-[#181820] border border-gray-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
            <Award className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">पास लोड करने में समस्या</h2>
          <p className="text-sm text-gray-400">{error || 'इस मोबाइल नंबर से कोई पास नहीं मिला।'}</p>
          <button
            onClick={loadPass}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> पुनः प्रयास करें
          </button>
        </div>
      </div>
    );
  }

  const { customer, shop, coupons } = passData;
  const target = customer.targetVisits || 5;
  const completed = customer.completedVisits || 0;
  const visitsLeft = Math.max(0, target - completed);
  const isTargetAchieved = completed >= target || customer.rewardUnlocked;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(`dealclose-stamp:${customer.phone}`)}`;

  return (
    <div className="min-h-screen bg-[#09090c] text-white p-4 sm:p-6 flex flex-col items-center justify-start antialiased selection:bg-amber-500 selection:text-black">
      {/* Top Floating App Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-2 mb-3 text-xs text-gray-400 border-b border-gray-800/80">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-gray-300 truncate max-w-[200px]">{shop.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCopyLink}
            className="hover:text-white transition-colors bg-gray-800/60 px-2.5 py-1 rounded-md"
          >
            {copied ? '✓ लिंक कॉपी हुआ' : '🔗 लिंक कॉपी'}
          </button>
          <button 
            onClick={handleShareWhatsApp}
            className="text-emerald-400 hover:text-emerald-300 transition-colors bg-emerald-950/40 px-2.5 py-1 rounded-md flex items-center gap-1 border border-emerald-800/40"
          >
            <Share2 className="w-3 h-3" /> शेयर
          </button>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Main Digital Pass Card */}
        <div className="relative bg-gradient-to-b from-[#1c1a29] via-[#151320] to-[#121218] border-2 border-amber-500/40 rounded-3xl p-5 shadow-[0_10px_35px_rgba(245,158,11,0.15)] overflow-hidden">
          {/* Subtle Decorative Glows */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

          {/* Store & Customer Header */}
          <div className="flex items-start justify-between border-b border-gray-800/80 pb-4">
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-amber-400 bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-full inline-block mb-1">
                ⭐ वीआईपी डिजिटल लॉयल्टी पास
              </span>
              <h1 className="text-xl font-black text-white leading-tight">{customer.name}</h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">+91 {customer.phone}</p>
            </div>

            <div className="text-right">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-md ml-auto">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-amber-300 mt-1">{completed} / {target} स्टैम्प</p>
            </div>
          </div>

          {/* Reward Status Alert */}
          {customer.rewardUnlocked ? (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg animate-pulse">
              <div className="flex items-center gap-3">
                <Gift className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide">🎉 बधाई! आपका इनाम अनलॉक है!</h4>
                  <p className="text-xs font-semibold mt-0.5">
                    {customer.rewardDescription || '1 मुफ़्त विशेष उपहार'}
                  </p>
                  {customer.activeRewardCoupon && (
                    <div className="mt-2 bg-black/85 text-amber-300 px-3 py-1 rounded-lg text-xs font-mono font-black inline-block tracking-wider">
                      कूपन: {customer.activeRewardCoupon}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-3 rounded-2xl bg-[#1d1a29]/90 border border-amber-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-gray-300">
                  {visitsLeft === 1 ? (
                    <strong className="text-amber-300">केवल 1 स्टैम्प और बाकी है!</strong>
                  ) : (
                    <>अगले इनाम के लिए <strong>{visitsLeft} और विजिट्स</strong> बाकी हैं</>
                  )}
                </span>
              </div>
              <span className="text-[11px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full">
                लक्ष्य: {target}
              </span>
            </div>
          )}

          {/* Visual Stamp Card Progress Bar */}
          <div className="my-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-300">स्टैम्प कार्ड प्रगति:</span>
              <span className="text-xs font-mono text-amber-400 font-bold">{Math.round((completed / target) * 100)}% पूरा</span>
            </div>

            {/* Stamp Circles */}
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: target }).map((_, index) => {
                const isStamped = index < completed;
                const isFinal = index === target - 1;

                return (
                  <div 
                    key={index}
                    className={`flex flex-col items-center justify-center aspect-square rounded-2xl border transition-all duration-300 relative ${
                      isStamped 
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300 text-black shadow-lg shadow-amber-500/30 scale-105' 
                        : isFinal 
                          ? 'bg-amber-950/30 border-dashed border-amber-500/60 text-amber-400' 
                          : 'bg-gray-900/60 border-dashed border-gray-700 text-gray-500'
                    }`}
                  >
                    {isStamped ? (
                      <>
                        <Star className="w-6 h-6 fill-black stroke-black" />
                        <span className="text-[9px] font-black mt-0.5">#{index + 1}</span>
                      </>
                    ) : isFinal ? (
                      <>
                        <Gift className="w-6 h-6 animate-bounce text-amber-400" />
                        <span className="text-[8px] font-bold text-amber-300 mt-0.5">उपहार</span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full border border-gray-600 flex items-center justify-center text-[10px] font-mono">
                          {index + 1}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* High-Contrast QR Code for Merchant Camera Scan */}
          <div className="bg-white rounded-2xl p-5 text-center flex flex-col items-center shadow-inner">
            <div className="bg-white p-2 rounded-xl shadow-md border border-gray-200">
              <img 
                src={qrCodeUrl} 
                alt="Customer QR Pass" 
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>

            <div className="mt-3 space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-purple-100 text-purple-900 px-3 py-1 rounded-full text-xs font-bold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>कैशियर को स्कैन कराएं</span>
              </div>
              <p className="text-xs text-gray-700 font-medium max-w-[240px]">
                बिलिंग के समय यह QR कोड कैशियर को दिखाएं ताकि आपका स्टैम्प दर्ज हो सके।
              </p>
            </div>
          </div>

          {/* Security & Verification Info */}
          <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% सुरक्षित डिजिटल पास</span>
            </div>
            <span className="font-mono text-[10px] text-gray-500">ID: {customer.phone.slice(-4)}</span>
          </div>
        </div>

        {/* Active Coupons (if any) */}
        {coupons && coupons.length > 0 && (
          <div className="bg-[#14141c] border border-gray-800 rounded-3xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" />
                <span>आपके सक्रिय कूपन ({coupons.length})</span>
              </h3>
              <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded-full border border-purple-800/50 font-semibold">
                स्टोर पर रिडीम करें
              </span>
            </div>

            <div className="space-y-2">
              {coupons.map((c) => (
                <div 
                  key={c._id || c.code}
                  className="bg-[#1a1924] border border-gray-700/80 rounded-2xl p-3.5 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-black font-mono tracking-wider text-purple-300 bg-purple-900/50 px-2.5 py-1 rounded-lg border border-purple-500/30">
                      {c.code}
                    </span>
                    <p className="text-xs font-bold text-gray-200 mt-1.5">{c.title}</p>
                    {c.validUntil && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        वैधता: {new Date(c.validUntil).toLocaleDateString('hi-IN')} तक
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-800/40">
                      सक्रिय
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Store Location / Contact Card */}
        <div className="bg-[#14141c] border border-gray-800 rounded-3xl p-5 text-xs text-gray-400 space-y-2">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Store className="w-4 h-4 text-amber-400" />
            <span>{shop.name}</span>
          </div>
          {shop.address && (
            <p className="flex items-center gap-1.5 text-gray-300">
              <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span>{shop.address}</span>
            </p>
          )}
          {shop.phone && (
            <p className="flex items-center gap-1.5 text-gray-300">
              <Smartphone className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span>हेल्पलाइन / स्टोर नंबर: +91 {shop.phone}</span>
            </p>
          )}
          <p className="text-[10px] text-gray-500 pt-2 border-t border-gray-800/80">
            * स्टैम्प केवल वास्तविक स्टोर विजिट और खरीदारी के समय ही कैशियर द्वारा पंच किया जा सकता है। घर से स्कैनिंग मान्य नहीं है।
          </p>
        </div>
      </div>
    </div>
  );
}
