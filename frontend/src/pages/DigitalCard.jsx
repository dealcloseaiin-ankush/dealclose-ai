import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../services/api';

export default function DigitalCard() {
  const { userId } = useParams();
  const location = useLocation();

  // Form State for Customer Details (Name, Phone, City)
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', city: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Business Profile & Workspace Config
  const [cardLinks, setCardLinks] = useState(null);
  const [businessName, setBusinessName] = useState('Our Business');
  const [businessPhone, setBusinessPhone] = useState('');
  
  // Smart Review Shield State (1-3 Stars vs 4-5 Stars)
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackMode, setFeedbackMode] = useState(null); // 'negative' (1-3) or 'positive' (4-5)
  const [complaintData, setComplaintData] = useState({ name: '', phoneNumber: '', city: '', complaint: '' });
  const [complaintSubmitted, setComplaintSubmitted] = useState(false);
  const [complaintLoading, setComplaintLoading] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const aiReviewTemplates = [
    { text: "Outstanding experience at [Business]! Super friendly staff, genuine pricing, and top quality. Highly recommended! ⭐⭐⭐⭐⭐" },
    { text: "Best customer service and very quick response. 100% satisfied with the quality and hospitality at [Business]. 👍" },
    { text: "Visited [Business] for the first time. Truly professional, best rates in town, and seamless service. Will visit again! 🌟" }
  ];

  // Fetch Workspace Specific Links & Config
  useEffect(() => {
    const getLinks = async () => {
      try {
        const { data } = await api.get('/users/profile');
        const savedData = data.user || data.data || data;
        
        const queryParams = new URLSearchParams(location.search);
        const wsParam = queryParams.get('workspaceId') || queryParams.get('ws');
        
        let targetWs = null;
        if (wsParam && savedData.workspaces && Array.isArray(savedData.workspaces)) {
          targetWs = savedData.workspaces.find(
            w => String(w._id) === String(wsParam) || 
                 String(w.id) === String(wsParam) || 
                 String(w.name).toLowerCase() === String(wsParam).toLowerCase()
          ) || (savedData.workspaces[parseInt(wsParam, 10)] || null);
        }
        
        if (targetWs) {
          const isProperty = targetWs.name.toLowerCase().includes('property');
          const cleanName = targetWs.name.toLowerCase().replace(/\s+/g, '');
          setCardLinks({
            instagram: targetWs.instagramLink || `https://instagram.com/${cleanName}`,
            youtube: targetWs.youtubeLink || `https://youtube.com/@${cleanName}`,
            facebook: targetWs.facebookLink || `https://facebook.com/${cleanName}`,
            googleReview: targetWs.googleBusinessLink || (isProperty ? 'https://g.page/r/newpropertyhub-review' : `https://g.page/r/${cleanName}-review`),
            upiId: targetWs.upiId || `${cleanName}@upi`,
            website: targetWs.externalApiUrl || '',
            ...(targetWs.digitalCardConfig || {})
          });
          setBusinessName(targetWs.name || 'Our Business');
          setBusinessPhone(targetWs.phone || savedData?.phone || '');
        } else {
          if (savedData?.digitalCardConfig) setCardLinks(savedData.digitalCardConfig);
          setBusinessName(savedData?.businessName || 'Our Business');
          setBusinessPhone(savedData?.phone || '');
        }
      } catch (err) { 
        console.error("Error loading links", err); 
      }
    };
    getLinks();
  }, [location.search]);

  // Handle Star Click (Review Gating Filter Logic)
  const handleSelectRating = (stars) => {
    setSelectedRating(stars);
    if (stars <= 3) {
      // 1, 2, or 3 Stars: Route to Private Feedback Shield (Block Google)
      setFeedbackMode('negative');
    } else {
      // 4 or 5 Stars: Route to Google Maps Booster
      setFeedbackMode('positive');
    }
  };

  // 1-Tap Copy AI Template & Open Google Maps
  const handleCopyAndRedirect = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsg('✅ Review Copied! Opening Google Maps...');
      setTimeout(() => {
        if (cardLinks?.googleReview) {
          window.open(cardLinks.googleReview, '_blank');
        }
        setCopiedMsg('');
      }, 1000);
    } catch (err) {
      if (cardLinks?.googleReview) window.open(cardLinks.googleReview, '_blank');
    }
  };

  // Submit Private Complaint (Negative Feedback Shield -> CRM Only)
  const handleComplaintSubmit = async (e) => {
    e.preventDefault();
    setComplaintLoading(true);
    try {
      await api.post('/leads', {
        name: complaintData.name || 'Anonymous Guest',
        phoneNumber: complaintData.phoneNumber,
        city: complaintData.city || '',
        notes: `[⚠️ RATING: ${selectedRating}/5 STARS] Complaint / Feedback: ${complaintData.complaint}`,
        source: 'QR Review Shield (Private Complaint)',
        status: 'complaint_shield',
        createdBy: userId
      });
      setComplaintSubmitted(true);
    } catch (err) {
      console.error("Complaint Submit Error:", err);
      setComplaintSubmitted(true); // Graceful fallback
    } finally {
      setComplaintLoading(false);
    }
  };

  // Submit Customer Details (Standard Lead Capture)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/leads', {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        city: formData.city,
        notes: formData.notes,
        source: 'QR Scan / Digital Card',
        status: 'new',
        createdBy: userId
      });
      setSubmitted(true);
    } catch (error) {
      console.error("Form Submit Error:", error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Share Card on WhatsApp
  const handleShareOnWhatsApp = () => {
    const currentUrl = window.location.href;
    const shareText = `Connect with *${businessName}*! Check our Digital Card, 5-Star Reviews, & Payment details here:\n👉 ${currentUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Copy Card Link
  const handleCopyCardLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center py-8 px-4 font-sans selection:bg-amber-500/30">
      <div className="w-full max-w-md bg-[#0e0e14] border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-blue-600/20 blur-3xl pointer-events-none"></div>

        {/* Business Header & Verification Badge */}
        <div className="relative z-10 text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-tr from-amber-500 to-purple-600 rounded-3xl mx-auto p-1 shadow-xl flex items-center justify-center">
            <div className="w-full h-full bg-[#111116] rounded-[22px] flex items-center justify-center text-3xl font-black text-white">
              🏢
            </div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-xl font-black tracking-tight text-white">{businessName}</h1>
              <span className="text-amber-400 text-sm" title="Verified Business">✓</span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">Official Digital Business Card & Smart Review Hub</p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            ⭐ SMART GOOGLE REVIEW SHIELD (1-3 STARS VS 4-5 STARS)
        ───────────────────────────────────────────────────────────── */}
        <div className="bg-black/60 border border-amber-500/30 rounded-3xl p-4.5 space-y-3 relative shadow-lg">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
              Smart Review Shield 🛡️
            </span>
            <h2 className="text-sm font-extrabold text-white">How was your experience today?</h2>
            <p className="text-[11px] text-gray-400">Tap stars below to rate our service:</p>
          </div>

          {/* Interactive Glowing Star Buttons */}
          <div className="flex justify-center items-center gap-2 pt-1 pb-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const isFilled = (hoverRating || selectedRating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => handleSelectRating(star)}
                  className={`text-3xl transition-transform active:scale-90 hover:scale-110 cursor-pointer ${
                    isFilled ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.6)]' : 'text-gray-700 hover:text-gray-500'
                  }`}
                  aria-label={`Rate ${star} Stars`}
                >
                  ★
                </button>
              );
            })}
          </div>

          {/* PATH A: 1, 2, or 3 Stars Selected -> PRIVATE FEEDBACK SHIELD FORM */}
          {feedbackMode === 'negative' && (
            <div className="bg-red-950/20 border border-red-500/40 rounded-2xl p-3.5 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center gap-2 text-red-400 font-bold">
                <span className="text-base">🛡️</span>
                <span>We apologize! Help us resolve this directly:</span>
              </div>
              <p className="text-[11px] text-gray-300">
                Your feedback goes directly to our management team privately so we can fix it immediately.
              </p>

              {complaintSubmitted ? (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded-xl text-center font-bold">
                  ✅ Thank you! Your complaint has been privately submitted to the manager. We will contact you shortly to make things right.
                </div>
              ) : (
                <form onSubmit={handleComplaintSubmit} className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Your Name *"
                    value={complaintData.name}
                    onChange={(e) => setComplaintData({ ...complaintData, name: e.target.value })}
                    className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      required
                      placeholder="WhatsApp No. *"
                      value={complaintData.phoneNumber}
                      onChange={(e) => setComplaintData({ ...complaintData, phoneNumber: e.target.value })}
                      className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="City / Area"
                      value={complaintData.city}
                      onChange={(e) => setComplaintData({ ...complaintData, city: e.target.value })}
                      className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-xs"
                    />
                  </div>
                  <textarea
                    rows={2}
                    required
                    placeholder="What went wrong? Tell us what we can improve..."
                    value={complaintData.complaint}
                    onChange={(e) => setComplaintData({ ...complaintData, complaint: e.target.value })}
                    className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={complaintLoading}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all active:scale-98"
                  >
                    {complaintLoading ? 'Submitting to Manager...' : 'Send to Management Privately 📩'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* PATH B: 4 or 5 Stars Selected -> 1-TAP GOOGLE 5-STAR BOOSTER */}
          {feedbackMode === 'positive' && (
            <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-3.5 space-y-3 animate-fade-in text-xs">
              <div className="text-center space-y-0.5">
                <div className="text-amber-300 font-extrabold text-xs">❤️ Thank you for the 5-Star love!</div>
                <p className="text-[10px] text-gray-400">Pick any review below to auto-copy & post on Google Maps:</p>
              </div>

              <div className="space-y-2">
                {aiReviewTemplates.map((rev, idx) => {
                  const formattedText = rev.text.replace(/\[Business\]/g, businessName);
                  return (
                    <div
                      key={idx}
                      className="bg-black/80 border border-gray-800 hover:border-amber-500/60 p-2.5 rounded-xl space-y-1.5 transition-all group"
                    >
                      <p className="text-gray-300 text-[11px] leading-relaxed italic">
                        "{formattedText}"
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopyAndRedirect(formattedText)}
                        className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98 cursor-pointer"
                      >
                        <span>📋 1-Tap Copy & Post on Google 🚀</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              {cardLinks?.googleReview && (
                <a
                  href={cardLinks.googleReview}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center text-[11px] text-amber-400 hover:underline font-bold pt-1"
                >
                  Or write your own custom review on Google Maps ↗
                </a>
              )}

              {copiedMsg && (
                <div className="p-2 bg-emerald-950/90 border border-emerald-500 text-emerald-300 rounded-xl text-center text-xs font-bold animate-bounce">
                  {copiedMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SOCIAL CONNECT & INSTANT PAYMENT ACTIONS
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center">
            Quick Connect & Payments
          </span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold">
            {cardLinks?.upiId && (
              <a
                href={`upi://pay?pa=${cardLinks.upiId}&pn=${encodeURIComponent(businessName)}&cu=INR`}
                className="col-span-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover:opacity-95 transition-all active:scale-98"
              >
                <span>💸 Pay Directly via UPI ({cardLinks.upiId})</span>
              </a>
            )}

            {cardLinks?.instagram && (
              <a
                href={cardLinks.instagram}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 transition-all active:scale-98"
              >
                <span>📸 Follow on Instagram</span>
              </a>
            )}

            {cardLinks?.youtube && (
              <a
                href={cardLinks.youtube}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-red-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-red-500 transition-all active:scale-98"
              >
                <span>▶ Watch on YouTube</span>
              </a>
            )}

            {cardLinks?.facebook && (
              <a
                href={cardLinks.facebook}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-blue-500 transition-all active:scale-98"
              >
                <span>👥 Connect on Facebook</span>
              </a>
            )}

            {cardLinks?.website && (
              <a
                href={cardLinks.website}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 bg-gray-900 border border-gray-700 text-gray-200 rounded-xl flex items-center justify-center gap-1.5 hover:text-white transition-all active:scale-98"
              >
                <span>🌐 Visit Website</span>
              </a>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            CUSTOMER LEAD CAPTURE FORM (NAME, WHATSAPP NO, CITY)
        ───────────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-800/80 pt-5 space-y-3">
          <div className="text-center">
            <h3 className="text-sm font-bold text-white">Save My Contact & Get Special Offers</h3>
            <p className="text-[10px] text-gray-400">Enter your details to receive discount coupons & updates</p>
          </div>

          {submitted ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl text-center font-bold text-xs space-y-1">
              <div>🎉 Details Shared Successfully!</div>
              <p className="text-[10px] text-gray-400">Thank you for connecting with {businessName}.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">WhatsApp Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">City / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Delhi"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-black border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-xs rounded-xl shadow-lg hover:opacity-95 transition-all active:scale-98 disabled:opacity-50"
              >
                {loading ? 'Submitting Details...' : 'Save My Details & Connect 🚀'}
              </button>
            </form>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SHARE DIGITAL CARD HUB (WHATSAPP SHARE & COPY LINK)
        ───────────────────────────────────────────────────────────── */}
        <div className="border-t border-gray-800/80 pt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleShareOnWhatsApp}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
          >
            <span>💬 Share on WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCardLink}
            className="py-2.5 px-3 bg-gray-900 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-98"
          >
            <span>{shareCopied ? '✓ Copied!' : '📋 Copy Link'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}