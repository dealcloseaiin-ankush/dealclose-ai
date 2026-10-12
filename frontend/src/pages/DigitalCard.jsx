import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  Globe, MessageSquare, 
  MapPin, Phone, CreditCard, ShoppingBag, ExternalLink, 
  Sparkles, CheckCircle2, ShieldAlert, Star, Share2, Copy,
  Download, Mail, Navigation, Play, Video, Tag, Check, ArrowRight, Zap
} from 'lucide-react';

const InstagramIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const YoutubeIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"></polygon>
  </svg>
);

const FacebookIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

export default function DigitalCard() {
  const { userId } = useParams();
  const location = useLocation();

  // Form State for Customer Details (Name, Phone, City)
  const [formData, setFormData] = useState({ name: '', phoneNumber: '', city: '', notes: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Business Profile & Workspace Config
  const [cardLinks, setCardLinks] = useState(null);
  const [customLinks, setCustomLinks] = useState([]);
  const [businessName, setBusinessName] = useState('Our Business');
  const [ownerName, setOwnerName] = useState('');
  const [designation, setDesignation] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessMapsUrl, setBusinessMapsUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [businessTagline, setBusinessTagline] = useState('');
  const [products, setProducts] = useState([]);
  const [recentMedia, setRecentMedia] = useState([]);
  const [featuredVideo, setFeaturedVideo] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [activeWsId, setActiveWsId] = useState(null);
  const [vCardSaved, setVCardSaved] = useState(false);
  
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

  // Fetch Public Visiting Card & Config + Record Page View
  useEffect(() => {
    const getCardProfile = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const wsParam = queryParams.get('workspaceId') || queryParams.get('ws');
        setActiveWsId(wsParam);
        
        const targetLookupId = userId || 'me';
        let cardData = null;

        // 1. Try public card endpoint first (works for stranger customers tapping NFC with zero login)
        try {
          const res = await api.get(`/users/public-card/${targetLookupId}`, {
            params: { ws: wsParam }
          });
          if (res.data?.success && res.data?.card) {
            cardData = res.data.card;
          }
        } catch (pubErr) {
          console.debug("Public card lookup falling back to auth profile:", pubErr.message);
        }

        // 2. Fallback to /users/profile if public lookup returned 404 or empty
        if (!cardData) {
          try {
            const { data } = await api.get('/users/profile');
            const savedData = data.user || data.data || data;
            
            let targetWs = null;
            if (wsParam && savedData.workspaces && Array.isArray(savedData.workspaces)) {
              targetWs = savedData.workspaces.find(
                w => String(w._id) === String(wsParam) || 
                     String(w.id) === String(wsParam) || 
                     String(w.name).toLowerCase() === String(wsParam).toLowerCase()
              ) || (savedData.workspaces[parseInt(wsParam, 10)] || null);
            }

            const cleanName = targetWs ? targetWs.name.toLowerCase().replace(/\s+/g, '') : (savedData.businessName || 'business').toLowerCase().replace(/\s+/g, '');
            const cardCfg = savedData.digitalCardConfig || {};

            cardData = {
              userId: savedData._id,
              businessName: targetWs?.name || savedData.businessName || 'Our Business',
              ownerName: cardCfg.ownerName || savedData.name || '',
              designation: cardCfg.designation || (targetWs ? 'Branch Manager' : 'Business Owner'),
              tagline: cardCfg.tagline || savedData.brandKit?.category || savedData.businessDescription || 'Welcome to our official digital hub',
              phone: targetWs?.phone || savedData.phone || savedData.ownerPhone || '',
              email: targetWs?.email || savedData.email || '',
              logoUrl: savedData.brandKit?.logoUrl || cardCfg.avatarUrl || '',
              address: cardCfg.address || savedData.brandKit?.address || '',
              mapsUrl: cardCfg.mapsUrl || targetWs?.googleBusinessLink || cardCfg.googleBusiness || '',
              upiId: cardCfg.upiId || targetWs?.upiId || `${cleanName}@upi`,
              socialLinks: {
                instagram: cardCfg.instagram || targetWs?.instagramLink || `https://instagram.com/${cleanName}`,
                youtube: cardCfg.youtube || targetWs?.youtubeLink || `https://youtube.com/@${cleanName}`,
                facebook: cardCfg.facebook || targetWs?.facebookLink || `https://facebook.com/${cleanName}`,
                googleReview: targetWs?.googleBusinessLink || cardCfg.googleReview || `https://g.page/r/${cleanName}-review`,
                website: cardCfg.website || targetWs?.externalApiUrl || savedData.externalApiUrl || ''
              },
              products: Array.isArray(cardCfg.products) ? cardCfg.products : [],
              customLinks: targetWs?.customLinks || cardCfg.customLinks || [],
              recentMedia: [],
              featuredVideo: cardCfg.featuredVideo || '',
              isPremium: savedData.isPremium === true || savedData.role === 'owner' || savedData.role === 'superadmin'
            };
          } catch (profileErr) {
            console.debug("Failed profile fallback:", profileErr.message);
          }
        }

        if (cardData) {
          setBusinessName(cardData.businessName || 'Our Business');
          setOwnerName(cardData.ownerName || '');
          setDesignation(cardData.designation || '');
          setBusinessTagline(cardData.tagline || 'Welcome to our official digital profile');
          setBusinessPhone(cardData.phone || '');
          setBusinessEmail(cardData.email || '');
          setBusinessAddress(cardData.address || '');
          setBusinessMapsUrl(cardData.mapsUrl || (cardData.address ? `https://maps.google.com/?q=${encodeURIComponent(cardData.address)}` : ''));
          setLogoUrl(cardData.logoUrl || '');
          setCardLinks(cardData.socialLinks || {});
          setCustomLinks(cardData.customLinks || []);
          setProducts(cardData.products || []);
          setRecentMedia(cardData.recentMedia || []);
          setFeaturedVideo(cardData.featuredVideo || '');
          setIsPremium(cardData.isPremium === true);

          // 🚀 Real-Time Hub View Tracking
          const trackingTargetId = cardData.userId || userId;
          if (trackingTargetId) {
            api.post('/tracking/view-card', {
              userId: trackingTargetId,
              workspaceId: wsParam || 'main',
              referrer: document.referrer || ''
            }).catch(() => {});
          }
        }

      } catch (err) { 
        console.error("Error loading digital card profile:", err); 
      }
    };
    getCardProfile();
  }, [location.search, userId]);

  // 🚀 1-Tap Save Contact to Phonebook (.vcf Virtual Contact Card)
  const handleSaveContactToPhone = () => {
    try {
      const formattedName = ownerName ? `${ownerName} (${businessName})` : businessName;
      const cleanPhone = (businessPhone || '').replace(/[^0-9+]/g, '');
      const websiteUrl = cardLinks?.website || window.location.href;

      const vCardLines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN:${formattedName}`,
        `ORG:${businessName}`,
        designation ? `TITLE:${designation}` : '',
        cleanPhone ? `TEL;TYPE=CELL,VOICE:${cleanPhone}` : '',
        cleanPhone ? `TEL;TYPE=WORK,VOICE:${cleanPhone}` : '',
        businessEmail ? `EMAIL;TYPE=WORK,INTERNET:${businessEmail}` : '',
        businessAddress ? `ADR;TYPE=WORK:;;${businessAddress.replace(/,/g, ';')};;;;` : '',
        websiteUrl ? `URL:${websiteUrl}` : '',
        `NOTE:Saved from DealClose AI Smart NFC Profile | ${businessTagline}`,
        'END:VCARD'
      ].filter(Boolean).join('\r\n');

      const blob = new Blob([vCardLines], { type: 'text/vcard;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const tempLink = document.createElement('a');
      tempLink.href = downloadUrl;
      const fileSafeName = (businessName || 'Business_Card').replace(/[^a-zA-Z0-9]/g, '_');
      tempLink.setAttribute('download', `${fileSafeName}.vcf`);
      document.body.appendChild(tempLink);
      tempLink.click();
      document.body.removeChild(tempLink);
      window.URL.revokeObjectURL(downloadUrl);

      setVCardSaved(true);
      setTimeout(() => setVCardSaved(false), 4000);
    } catch (err) {
      console.error("vCard Save Error:", err);
      alert('Could not download contact file. Please save manually.');
    }
  };

  // 🚀 Track Link Click on Server & CRM Lead Capture
  const handleLinkClick = async (link, e) => {
    try {
      api.post('/tracking/click-link', {
        userId: userId || 'active-user',
        workspaceId: activeWsId || 'main',
        linkId: link.id || link._id,
        linkTitle: link.title,
        linkUrl: link.url
      }).catch(err => console.debug('Click track skipped:', err));
    } catch (e) {}
  };

  // Helper to render icon by name
  const renderLinkIcon = (iconName) => {
    const icon = (iconName || '').toLowerCase();
    switch (icon) {
      case 'whatsapp': return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'instagram': return <InstagramIcon className="w-5 h-5 text-pink-400" />;
      case 'youtube': return <YoutubeIcon className="w-5 h-5 text-red-500" />;
      case 'facebook': return <FacebookIcon className="w-5 h-5 text-blue-500" />;
      case 'upi':
      case 'payment': return <CreditCard className="w-5 h-5 text-teal-400" />;
      case 'catalog':
      case 'shop': return <ShoppingBag className="w-5 h-5 text-amber-400" />;
      case 'review':
      case 'google': return <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />;
      case 'location':
      case 'map': return <MapPin className="w-5 h-5 text-red-400" />;
      case 'phone':
      case 'call': return <Phone className="w-5 h-5 text-green-400" />;
      default: return <Globe className="w-5 h-5 text-blue-400" />;
    }
  };

  // Enforce Free Tier (Max 3 links) vs Paid Tier (Unlimited)
  const visibleCustomLinks = React.useMemo(() => {
    const active = (customLinks || []).filter(l => l.isActive !== false);
    if (!isPremium) {
      return active.slice(0, 3);
    }
    return active;
  }, [customLinks, isPremium]);

  // Handle Star Click (Review Gating Filter Logic)
  const handleSelectRating = (stars) => {
    setSelectedRating(stars);
    if (stars <= 3) {
      setFeedbackMode('negative');
    } else {
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
      setComplaintSubmitted(true);
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
        source: 'NFC Tap / Smart Visiting Card',
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
    const shareText = `Connect with *${businessName}*! Check our Smart NFC Visiting Card, 5-Star Reviews, & Location here:\n👉 ${currentUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Copy Card Link
  const handleCopyCardLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center py-6 px-3 sm:px-4 font-sans selection:bg-amber-500/30">
      <div className="w-full max-w-md bg-[#0e0e14] border border-gray-800 rounded-[32px] p-5 sm:p-7 shadow-2xl relative overflow-hidden space-y-6">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-44 bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-blue-600/20 blur-3xl pointer-events-none"></div>

        {/* ─────────────────────────────────────────────────────────────
            HEADER & NFC SMART BADGE
        ───────────────────────────────────────────────────────────── */}
        <div className="relative z-10 text-center space-y-3">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-black tracking-wider uppercase shadow-sm">
            <Zap className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>NFC Smart Card Connected</span>
          </div>

          {/* Logo or Brand Avatar */}
          <div className="relative mx-auto w-24 h-24">
            <div className="w-full h-full bg-gradient-to-tr from-amber-500 via-purple-600 to-blue-500 rounded-3xl p-1 shadow-2xl shadow-purple-950/40">
              <div className="w-full h-full bg-[#111116] rounded-[22px] flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt={businessName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-black text-amber-400">🏢</span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#0e0e14] flex items-center justify-center text-[10px] font-bold" title="Online Active">
              ✓
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5">
              <h1 className="text-2xl font-black tracking-tight text-white">{businessName}</h1>
              <span className="text-amber-400 text-sm font-bold" title="Verified Business">✓</span>
            </div>
            
            {ownerName && (
              <p className="text-xs font-semibold text-gray-300 mt-0.5">
                {ownerName} {designation && <span className="text-gray-500">• {designation}</span>}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
              {businessTagline}
            </p>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            QUICK ACTION BAR (CALL, WHATSAPP, DIRECTIONS, EMAIL)
        ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2 pt-1 pb-1">
          {businessPhone && (
            <a
              href={`tel:${businessPhone.replace(/[^0-9+]/g, '')}`}
              className="flex flex-col items-center justify-center p-2.5 bg-[#161622] hover:bg-emerald-950/60 border border-gray-800 hover:border-emerald-500/50 rounded-2xl transition-all active:scale-95 group shadow-sm"
              title="Direct Call"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Phone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-300 mt-1.5">Call</span>
            </a>
          )}

          {businessPhone && (
            <a
              href={`https://wa.me/${businessPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${businessName}! I visited your smart digital card and would like to connect.`)}`}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-[#161622] hover:bg-emerald-950/60 border border-gray-800 hover:border-emerald-500/50 rounded-2xl transition-all active:scale-95 group shadow-sm"
              title="Chat on WhatsApp"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageSquare className="w-5 h-5 fill-emerald-400/20" />
              </div>
              <span className="text-[10px] font-bold text-gray-300 mt-1.5">WhatsApp</span>
            </a>
          )}

          {businessMapsUrl ? (
            <a
              href={businessMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-2.5 bg-[#161622] hover:bg-blue-950/60 border border-gray-800 hover:border-blue-500/50 rounded-2xl transition-all active:scale-95 group shadow-sm"
              title="Open Location in Google Maps"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Navigation className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-300 mt-1.5">Navigate</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-2.5 bg-[#161622]/40 border border-gray-900 rounded-2xl opacity-40">
              <div className="w-10 h-10 rounded-xl bg-gray-800/40 text-gray-500 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 mt-1.5">Navigate</span>
            </div>
          )}

          {businessEmail ? (
            <a
              href={`mailto:${businessEmail}`}
              className="flex flex-col items-center justify-center p-2.5 bg-[#161622] hover:bg-purple-950/60 border border-gray-800 hover:border-purple-500/50 rounded-2xl transition-all active:scale-95 group shadow-sm"
              title="Send Email"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-300 mt-1.5">Email</span>
            </a>
          ) : (
            <div className="flex flex-col items-center justify-center p-2.5 bg-[#161622]/40 border border-gray-900 rounded-2xl opacity-40">
              <div className="w-10 h-10 rounded-xl bg-gray-800/40 text-gray-500 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold text-gray-500 mt-1.5">Email</span>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            💾 PRIMARY CTA: 1-TAP SAVE CONTACT TO PHONE (.VCF)
        ───────────────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={handleSaveContactToPhone}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 shadow-xl shadow-amber-950/40 transition-all active:scale-98 cursor-pointer"
          >
            <Download className="w-5 h-5 stroke-[2.5]" />
            <span>💾 1-Tap Save Contact to Phone</span>
          </button>
          
          {vCardSaved && (
            <p className="text-[11px] text-center text-emerald-400 font-bold animate-bounce">
              ✓ Contact file downloaded! Check your Contacts app to confirm save.
            </p>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            🛍️ WHAT WE SELL / FEATURED PRODUCTS & SERVICES
        ───────────────────────────────────────────────────────────── */}
        {products && products.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> What We Sell / Services
              </span>
              <span className="text-[10px] text-gray-400">{products.length} Products</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {products.map((item, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-gradient-to-r from-[#12121a] to-[#171722] border border-gray-800/80 hover:border-amber-500/40 rounded-2xl flex items-center justify-between gap-3 shadow-md group transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-black/60 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <Tag className="w-5 h-5 text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                        {item.name || item.title}
                      </div>
                      {item.description && (
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                      {item.price && (
                        <span className="inline-block text-[11px] font-black text-emerald-400 mt-0.5">
                          {item.price}
                        </span>
                      )}
                    </div>
                  </div>

                  {businessPhone && (
                    <a
                      href={`https://wa.me/${businessPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${businessName}! I am interested in "${item.name || item.title}" (${item.price || ''}) from your digital card.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-[10px] font-bold flex items-center gap-1 shrink-0 transition-all active:scale-95"
                    >
                      <span>Inquire 💬</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            🎥 RECENT REELS & POSTS SHOWCASE (AUTO-FETCHED ZERO URL INPUT)
        ───────────────────────────────────────────────────────────── */}
        {recentMedia && recentMedia.length > 0 && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" /> Recent Reels & Posts
              </span>
              {cardLinks?.instagram && (
                <a 
                  href={cardLinks.instagram} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-pink-400 hover:underline font-bold"
                >
                  View All on IG ↗
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {recentMedia.slice(0, 6).map((post, idx) => (
                <a
                  key={post.id || idx}
                  href={post.permalink || cardLinks?.instagram || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="aspect-square relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-pink-500/50 group shadow-md"
                >
                  {post.mediaUrl ? (
                    <img 
                      src={post.mediaUrl} 
                      alt={post.caption || 'Reel post'} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-xs">
                      📸
                    </div>
                  )}

                  {post.mediaType === 'video' && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-white text-[10px]">
                      <Play className="w-2.5 h-2.5 fill-white text-white ml-0.5" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                    <span className="text-[9px] text-white line-clamp-1">
                      {post.caption || 'Watch'}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            📍 GPS STORE LOCATION & DIRECTIONS
        ───────────────────────────────────────────────────────────── */}
        {businessAddress && (
          <div className="p-4 bg-gradient-to-r from-blue-950/30 to-purple-950/20 border border-blue-500/30 rounded-2xl space-y-2.5 shadow-md">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 block">
                  Store / Office Location
                </span>
                <p className="text-xs text-gray-200 font-medium leading-relaxed mt-0.5">
                  {businessAddress}
                </p>
              </div>
            </div>

            {businessMapsUrl && (
              <a
                href={businessMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-98"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get Directions on Google Maps ↗</span>
              </a>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            CUSTOM LINKS (WEBSITE, CATALOG, MENUS)
        ───────────────────────────────────────────────────────────── */}
        {visibleCustomLinks && visibleCustomLinks.length > 0 && (
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center">
              Important Links
            </span>
            <div className="space-y-2">
              {visibleCustomLinks.map((link, idx) => (
                <a
                  key={link.id || idx}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleLinkClick(link, e)}
                  className="w-full p-3.5 bg-gradient-to-r from-gray-900/90 to-[#15151c] hover:from-purple-950/40 hover:to-blue-950/40 border border-gray-800 hover:border-purple-500/50 rounded-2xl flex items-center justify-between group transition-all duration-200 active:scale-98 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-black/60 border border-gray-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {renderLinkIcon(link.icon)}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                        {link.title}
                      </div>
                      {link.category && (
                        <span className="text-[10px] text-gray-400 block truncate">
                          {link.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-gray-800/80 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center text-gray-400 transition-all shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

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

          {/* NEGATIVE FEEDBACK GATING (1-3 STARS) -> PRIVATE COMPLAINT */}
          {feedbackMode === 'negative' && (
            <div className="space-y-3 pt-2 border-t border-gray-800 animate-fade-in">
              <div className="flex items-center gap-2 p-2.5 bg-rose-950/40 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
                <p className="leading-tight">
                  We are deeply sorry for your experience. Please share your complaint privately with the management:
                </p>
              </div>

              {complaintSubmitted ? (
                <div className="p-4 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-center text-xs font-bold space-y-1">
                  <div>✓ Complaint Received Privately!</div>
                  <p className="text-[10px] text-gray-400 font-normal">Our manager will personally contact you to resolve this.</p>
                </div>
              ) : (
                <form onSubmit={handleComplaintSubmit} className="space-y-2 text-xs">
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    value={complaintData.name}
                    onChange={(e) => setComplaintData({ ...complaintData, name: e.target.value })}
                    className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="WhatsApp Number *"
                    value={complaintData.phoneNumber}
                    onChange={(e) => setComplaintData({ ...complaintData, phoneNumber: e.target.value })}
                    className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  />
                  <textarea
                    required
                    rows="3"
                    placeholder="What went wrong? Tell us what happened..."
                    value={complaintData.complaint}
                    onChange={(e) => setComplaintData({ ...complaintData, complaint: e.target.value })}
                    className="w-full bg-black/80 border border-gray-800 rounded-xl p-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={complaintLoading}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all active:scale-98 disabled:opacity-50"
                  >
                    {complaintLoading ? 'Sending Complaint...' : 'Send Direct to Management 🛡️'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* POSITIVE FEEDBACK (4-5 STARS) -> 1-TAP AI REVIEW BOOSTER */}
          {feedbackMode === 'positive' && (
            <div className="space-y-3 pt-2 border-t border-gray-800 animate-fade-in">
              <div className="text-center">
                <span className="text-xs font-bold text-emerald-400">
                  🎉 Thank you! Choose a 1-tap review to post on Google:
                </span>
              </div>

              <div className="space-y-2">
                {aiReviewTemplates.map((template, idx) => {
                  const formattedText = template.text.replace(/\[Business\]/g, businessName);
                  return (
                    <div
                      key={idx}
                      className="p-3 bg-[#13131c] border border-gray-800 hover:border-amber-500/50 rounded-2xl space-y-2 text-xs transition-all shadow-sm"
                    >
                      <p className="text-gray-300 italic text-[11px] leading-relaxed">
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
                onClick={() => handleLinkClick({ title: 'UPI Payment', url: cardLinks.upiId })}
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
                onClick={() => handleLinkClick({ title: 'Instagram Profile', url: cardLinks.instagram })}
                className="py-2.5 px-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:opacity-90 transition-all active:scale-98"
              >
                <InstagramIcon className="w-4 h-4" />
                <span>Follow on Instagram</span>
              </a>
            )}

            {cardLinks?.youtube && (
              <a
                href={cardLinks.youtube}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick({ title: 'YouTube Channel', url: cardLinks.youtube })}
                className="py-2.5 px-3 bg-red-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-red-500 transition-all active:scale-98"
              >
                <YoutubeIcon className="w-4 h-4" />
                <span>Watch on YouTube</span>
              </a>
            )}

            {cardLinks?.facebook && (
              <a
                href={cardLinks.facebook}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick({ title: 'Facebook Page', url: cardLinks.facebook })}
                className="py-2.5 px-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-1.5 shadow-md hover:bg-blue-500 transition-all active:scale-98"
              >
                <FacebookIcon className="w-4 h-4" />
                <span>Connect on Facebook</span>
              </a>
            )}

            {cardLinks?.website && (
              <a
                href={cardLinks.website}
                target="_blank"
                rel="noreferrer"
                onClick={() => handleLinkClick({ title: 'Official Website', url: cardLinks.website })}
                className="py-2.5 px-3 bg-gray-900 border border-gray-700 text-gray-200 rounded-xl flex items-center justify-center gap-1.5 hover:text-white transition-all active:scale-98"
              >
                <Globe className="w-4 h-4" />
                <span>Visit Website</span>
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
                    placeholder="e.g. Mumbai, Surat"
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
            <Share2 className="w-4 h-4" />
            <span>Share on WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCardLink}
            className="py-2.5 px-3 bg-gray-900 border border-gray-700 text-gray-300 hover:text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all active:scale-98"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{shareCopied ? '✓ Copied!' : 'Copy Link'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}