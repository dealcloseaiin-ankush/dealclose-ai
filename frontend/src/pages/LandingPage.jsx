import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Sparkles, ArrowRight, Check, CheckCircle2, ShieldCheck, Flame, Search, 
  HelpCircle, Zap, Phone, ShoppingBag, Gem, Hammer, Smartphone, ShoppingCart, 
  Building2, Scissors, Utensils, GraduationCap, X, ChevronRight, MessageSquare
} from 'lucide-react';

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function LandingPage() {
  const [activeIndustry, setActiveIndustry] = useState('real-estate');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerQuery, setScannerQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [otpVolume, setOtpVolume] = useState(25000);
  const [activeCodeLang, setActiveCodeLang] = useState('curl');

  const industriesData = {
    'real-estate': {
      name: 'Real Estate & Builders',
      badge: 'Property Developers & Brokers',
      stat: '85% Faster Site Visits',
      title: 'Automated Property Lead Qualification & Brochure Delivery',
      desc: 'When a prospective buyer clicks your Meta Ad or comments on your property reel, DealClose AI automatically qualifies their budget (2BHK vs 3BHK), delivers the project walkthrough & floorplan PDF, and books a site visit directly into your CRM.',
      crmLead: 'Vikram Oberoi',
      crmReq: '3BHK Luxury (₹1.5 - 2 Cr)',
      crmStage: 'Site Visit Scheduled (Sunday 11 AM)',
      crmSource: 'Instagram Reel Ad',
      crmAssign: 'Relationship Manager 1',
      botName: 'DealClose Property Assistant',
      trigger: '"Interested in 3BHK flat at Palm Heights. Send brochure and price."',
      botMsg: 'Namaste Vikram Ji! 🏢 Palm Heights 3BHK Luxury apartments start at ₹1.45 Cr with private balcony & clubhouse access. Attached is the complete Floor Plan & Master Layout PDF.',
      buttons: ['📄 Download 3BHK Brochure PDF', '🚗 Schedule Free Site Visit', '📞 Connect with Property Manager']
    },
    'fashion-boutique': {
      name: 'Clothes & Fashion Boutiques',
      badge: 'Boutiques, Sarees & Apparel',
      stat: '4.8x Higher Reel Sales',
      title: 'Instant Reel Comment-to-DM & Size Chart Checkout',
      desc: 'Turn every viral Instagram Reel into direct WhatsApp orders. The moment a user comments "PRICE", DealClose AI DMs the photo catalog, size chart, and instant UPI checkout link.',
      crmLead: 'Ananya Sharma',
      crmReq: 'Royal Blue Anarkali (Size XL)',
      crmStage: 'Cart Created (₹1,499 UPI Pending)',
      crmSource: 'Reel Comment: "PRICE"',
      crmAssign: 'Auto-Checkout Bot',
      botName: 'Fashion Boutique AI Assistant',
      trigger: 'Reel Comment: "Price for XL blue kurta?"',
      botMsg: 'Hey Ananya! ✨ The Royal Blue Anarkali Kurta (XL) is ₹1,499. Pure Cotton Silk with Free Shipping! Tap below to order instantly.',
      buttons: ['🛍️ Buy Now via UPI (₹1,499)', '📏 View Size Chart PDF', '💬 Chat with Stylist on WhatsApp']
    },
    'jewellery': {
      name: 'Jewellery & Gold Showrooms',
      badge: 'Gold & Diamond Showrooms',
      stat: '90% Quick Gold Rate Capture',
      title: 'Daily Gold Rate Broadcast & Bridal Consultations',
      desc: 'Broadcast daily 22K/24K gold rate updates to past buyers and allow new brides to browse lightweight bridal jewellery catalogs and book private showroom consultations.',
      crmLead: 'Pooja Agarwal',
      crmReq: 'Bridal Choker Set (Gold + Polki)',
      crmStage: 'Showroom Consultation Booked (Saturday 4 PM)',
      crmSource: 'WhatsApp Inbound',
      crmAssign: 'Senior Jewellery Consultant',
      botName: 'Jewellery Showroom AI',
      trigger: '"Today 22K gold rate & bridal collection brochure?"',
      botMsg: 'Namaste Pooja Ji! 🌟 Today 22K Gold Rate is ₹6,850/gm. We have 20+ new lightweight Bridal Sets in stock. Would you like to view our PDF catalog or book a showroom visit?',
      buttons: ['📖 View Bridal Collection PDF', '📅 Book Showroom Consultation', '📞 Call Store Manager']
    },
    'hardware-materials': {
      name: 'Hardware & Construction',
      badge: 'Plywood, Sanitary & Hardware',
      stat: '10x Faster Rate Cards',
      title: 'Wholesale Contractor Inquiries & Instant PDF Rate Cards',
      desc: 'Contractors and carpenters type keyword "RATES" and get the latest updated price list PDF 24/7. Wholesale bulk inquiries are automatically saved into your CRM.',
      crmLead: 'Sharma Builders & Contractors',
      crmReq: '19mm Marine Plywood (80 Sheets)',
      crmStage: 'Quotation Sent (₹1.85 Lakh)',
      crmSource: 'WhatsApp Keyword: "RATES"',
      crmAssign: 'Wholesale Sales Desk',
      botName: 'Hardware Wholesale Assistant',
      trigger: '"Send rate list for 19mm Marine Plywood & Asian Paints"',
      botMsg: 'Hello Sharma Builders! 🏗️ Attached is our Latest Wholesale Price Sheet. For orders above ₹50,000, enjoy an extra 5% bulk contractor discount!',
      buttons: ['📄 Download Price Sheet PDF', '📝 Submit Material List for Quote', '👤 Talk to Branch Manager']
    },
    'mobile-electronics': {
      name: 'Mobiles & Electronics',
      badge: 'Smartphones & Electronics',
      stat: '3x More Store Footfall',
      title: 'Model Specs, 0% EMI Calculator & Repair Job Tracking',
      desc: 'Help buyers compare mobile phone models, calculate Bajaj 0% EMI schemes, and check live repair status without waiting on phone calls.',
      crmLead: 'Amit Verma',
      crmReq: 'OnePlus 13 (256GB Black)',
      crmStage: 'Reserved for In-Store Pickup',
      crmSource: 'Website WhatsApp Widget',
      crmAssign: 'Counter Sales Agent',
      botName: 'Electronics Store Bot',
      trigger: '"OnePlus 13 price with 0% Bajaj EMI options?"',
      botMsg: 'Hi Amit! 📱 OnePlus 13 (12GB/256GB) is in stock at ₹69,999. Bajaj Finserv 0% EMI starts at ₹5,833/mo for 12 months with ₹2,000 instant bank discount!',
      buttons: ['💳 Check 0% EMI Eligibility', '📍 Store Location & Directions', '🎁 Reserve Device at Store']
    },
    'grocery-supermarket': {
      name: 'Supermarkets & Ration Stores',
      badge: 'Supermarkets & Grocery',
      stat: '92% Repeat Orders',
      title: 'List-to-Order Processing & Automated 25-Day Ration Reminders',
      desc: 'Customers send list photos or text; AI confirms receipt and calculates total. Automatically sends refill reminders every 25 days to keep customers loyal.',
      crmLead: 'Sunita Verma',
      crmReq: 'Monthly Ration Pack (14 Items - ₹3,420)',
      crmStage: 'Out for Delivery (45 Mins)',
      crmSource: 'Monthly Reminder Flow',
      crmAssign: 'Delivery Team',
      botName: 'Supermarket Fast Order Bot',
      trigger: 'Customer sends handwritten grocery list photo',
      botMsg: 'Namaste Verma Ji! 🛒 We received your monthly ration list (14 items). Our team is packing your order. Estimated total: ₹3,420. Delivery within 45 mins!',
      buttons: ['💳 Pay via UPI QR', '➕ Add More Items', '🛵 Live Delivery Tracking']
    },
    'salon-clinic': {
      name: 'Salons & Healthcare Clinics',
      badge: 'Salons, Spas & Clinics',
      stat: '40% Fewer No-Shows',
      title: '24/7 Appointment Booking & Advance WhatsApp Reminders',
      desc: 'Clients choose service and time slot directly in WhatsApp. Automated 2-hour advance reminders eliminate no-shows and collect 5-star Google reviews.',
      crmLead: 'Kavita Roy',
      crmReq: 'Hair Spa & Keratin Treatment',
      crmStage: 'Appointment Confirmed (Tomorrow 3:30 PM)',
      crmSource: 'Instagram Bio Link',
      crmAssign: 'Stylist Neha',
      botName: 'Salon & Spa Appointment AI',
      trigger: '"Book appointment for Hair Spa tomorrow afternoon"',
      botMsg: 'Hello Kavita! 💆‍♀️ We have slots available tomorrow at 3:30 PM and 5:30 PM with Senior Stylist Neha. Which time suits you best?',
      buttons: ['⏰ Confirm 3:30 PM Slot', '⏰ Confirm 5:30 PM Slot', '💅 View Full Rate Card']
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannerQuery) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const { data } = await api.post('/scaniq/search', { query: scannerQuery });
      if (data.success && data.analysis) {
        setScanResult(data.analysis);
      } else {
        alert(data.message || 'Could not analyze query.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to run scanner. Please check your query.');
    } finally {
      setIsScanning(false);
    }
  };

  const currentInd = industriesData[activeIndustry] || industriesData['real-estate'];

  const faqs = [
    {
      q: 'Why do I need Official WhatsApp Cloud API instead of normal WhatsApp?',
      a: 'Normal WhatsApp numbers get banned if you send bulk messages. Official Meta WhatsApp Cloud API allows unlimited verified broadcasts, blue green-tick verified sender name, interactive buttons, and zero ban risk.'
    },
    {
      q: 'How does the in-built CRM work?',
      a: 'Every time a lead messages on WhatsApp or comments on an Instagram Reel, DealClose AI automatically creates a contact in your CRM, tags their requirement (e.g. "3BHK Flat" or "XL Kurta"), and tracks their sales pipeline stage.'
    },
    {
      q: 'How does AI learn my business details?',
      a: 'You can upload your product catalogs, price sheets, brochures, or website link. In under 60 seconds, our AI reads and indexes your documents to answer customer questions in fluent Hindi and English 24/7.'
    },
    {
      q: 'Do you charge any markup on WhatsApp messages?',
      a: 'No! DealClose AI gives you 100% transparent zero-markup WhatsApp API. You only pay actual Meta conversation charges directly without middlemen margins.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 selection:bg-purple-500/30 font-sans">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-emerald-900/50 border-b border-purple-500/20 text-center py-2 px-4 text-xs font-semibold text-purple-200">
        🚀 <span>Official Meta Cloud API • 0% Message Markup • 14-Day Full Access Free Trial</span>
        <Link to="/register" className="ml-3 underline font-bold text-emerald-300 hover:text-white">Get Started Free →</Link>
      </div>

      {/* Main Navbar */}
      <nav className="border-b border-gray-900/80 bg-black/70 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <img src="/logo.png" alt="DealClose AI Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">DealClose<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI</span></span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs font-bold text-gray-400">
            <Link to="/industries" className="hover:text-white transition-colors">Industries</Link>
            <Link to="/compare" className="hover:text-white transition-colors">Compare vs Others</Link>
            <Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link to="/mobile" className="text-emerald-400 hover:text-emerald-300 font-black transition-colors flex items-center gap-1">
              <Smartphone size={14} /> Mobile App (PWA)
            </Link>
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1"
            >
              <Flame size={14} /> Ad Spy Scanner
            </button>
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link to="/mobile" className="text-xs font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/60 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
              <Smartphone size={13} /> Open App
            </Link>
            <Link to="/login" className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-all">
              Login
            </Link>
            <Link to="/register" className="text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 rounded-lg shadow-md hover:opacity-95 transition-all">
              Start Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-black uppercase tracking-wider mb-5">
          <Sparkles size={13} /> Official Meta WhatsApp API + AI CRM Engine
        </div>
        <h1 className="text-3xl sm:text-6xl font-black text-white tracking-tight leading-tight mb-5">
          Turn Instagram Comments & WhatsApp <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400">
            Into a 24/7 Sales Machine
          </span>
        </h1>
        <p className="text-sm sm:text-lg text-gray-400 max-w-2xl mx-auto mb-8 leading-relaxed">
          The all-in-one automation platform for Indian builders, boutiques, showrooms, and local businesses. Zero message markup, instant AI document learning, and built-in CRM.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap mb-10">
          <Link
            to="/register"
            className="px-8 py-3.5 bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-black text-xs sm:text-sm rounded-xl shadow-xl hover:opacity-95 transition-all flex items-center gap-2"
          >
            Start 14-Day Free Trial <ArrowRight size={16} />
          </Link>
          <Link
            to="/mobile"
            className="px-6 py-3.5 bg-purple-950/80 border border-purple-500/50 text-purple-200 font-black text-xs sm:text-sm rounded-xl hover:bg-purple-900/80 hover:text-white transition-all flex items-center gap-2 shadow-lg"
          >
            <Smartphone size={16} className="text-emerald-400" /> Open / Install Mobile App 📱
          </Link>
          <button
            onClick={() => setIsScannerOpen(true)}
            className="px-6 py-3.5 bg-gray-900 border border-gray-800 text-white font-bold text-xs sm:text-sm rounded-xl hover:bg-gray-800 hover:border-gray-700 transition-all flex items-center gap-2"
          >
            <Search size={15} className="text-amber-400" /> Run Free Competitor Ad Scan
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center justify-center gap-6 text-[11px] font-bold text-gray-400 flex-wrap">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-400" /> Meta Official Cloud Partner</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-purple-400" /> In-built Auto CRM</span>
          <span className="flex items-center gap-1.5"><Zap size={15} className="text-pink-400" /> 0.8s Instant Response</span>
        </div>
      </section>

      {/* 3 Core Knowledge Pillars */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#0d0d12] border border-gray-800/80 rounded-3xl p-6 relative overflow-hidden shadow-lg hover:border-purple-500/40 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl mb-4">🧠</div>
            <h3 className="text-base font-bold text-white mb-2">How AI Learns Your Business</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              Upload your property brochures, price lists, or catalog PDFs. In under 60 seconds, our AI learns your entire inventory and answers customer questions in natural Hindi & English.
            </p>
            <div className="text-[11px] font-bold text-purple-300 bg-purple-950/30 px-3 py-1 rounded-lg inline-block border border-purple-800/40">
              ✓ 60-Sec PDF & Catalog Ingestion
            </div>
          </div>

          <div className="bg-[#0d0d12] border border-gray-800/80 rounded-3xl p-6 relative overflow-hidden shadow-lg hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xl mb-4">📋</div>
            <h3 className="text-base font-bold text-white mb-2">In-Built WhatsApp CRM</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              No need to buy expensive software. Every buyer who chats or comments is auto-saved with Name, Phone, Budget, Requirements, and Pipeline Stage (e.g. "Site Visit Booked").
            </p>
            <div className="text-[11px] font-bold text-emerald-300 bg-emerald-950/30 px-3 py-1 rounded-lg inline-block border border-emerald-800/40">
              ✓ Auto Contact Tagging & Pipelines
            </div>
          </div>

          <div className="bg-[#0d0d12] border border-gray-800/80 rounded-3xl p-6 relative overflow-hidden shadow-lg hover:border-pink-500/40 transition-all">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center text-xl mb-4">📲</div>
            <h3 className="text-base font-bold text-white mb-2">Viral Reel to DM Funnel</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-4">
              When buyers comment "PRICE" or "LINK" on your Instagram reels or ads, DealClose AI automatically replies to the comment and DMs the full PDF catalog & WhatsApp buy link.
            </p>
            <div className="text-[11px] font-bold text-pink-300 bg-pink-950/30 px-3 py-1 rounded-lg inline-block border border-pink-800/40">
              ✓ 100% Automated Reel DM Checkout
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Industry Simulator */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <div className="bg-[#0a0a0e] border-2 border-purple-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
            <div>
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider">Live Interactive Simulator</span>
              <h2 className="text-xl sm:text-3xl font-black text-white mt-0.5">Experience Your Exact Industry Workflow</h2>
            </div>
            <Link to="/industries" className="text-xs font-bold text-purple-400 hover:text-white flex items-center gap-1">
              View All 9 Industry Pages →
            </Link>
          </div>

          {/* Industry Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs font-bold">
            {Object.entries(industriesData).map(([key, item]) => (
              <button
                key={key}
                onClick={() => setActiveIndustry(key)}
                className={`px-4 py-2.5 rounded-xl shrink-0 transition-all flex items-center gap-2 ${
                  activeIndustry === key
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20 scale-105'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                <span>{item.name}</span>
              </button>
            ))}
          </div>

          {/* Simulation View Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#111116] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-400 uppercase tracking-wider">{currentInd.badge}</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded-md">{currentInd.stat}</span>
                </div>
                <h3 className="text-lg font-black text-white">{currentInd.title}</h3>
                <p className="text-xs text-gray-300 leading-relaxed">{currentInd.desc}</p>
              </div>

              {/* CRM Card */}
              <div className="bg-[#111116] border border-gray-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <span className="text-emerald-400">📊</span> Live CRM Contact Auto-Captured:
                </div>
                <div className="bg-black/60 border border-gray-800 rounded-xl p-3 text-xs space-y-2 font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Lead Name: <strong className="text-white font-sans">{currentInd.crmLead}</strong></span>
                    <span className="text-emerald-400 font-sans font-bold">● Active Lead</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Requirement: <strong className="text-purple-300 font-sans">{currentInd.crmReq}</strong></span>
                    <span>Stage: <strong className="text-amber-400 font-sans">{currentInd.crmStage}</strong></span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-sans border-t border-gray-800 pt-1.5 flex items-center justify-between">
                    <span>Auto-tagged from: <strong>{currentInd.crmSource}</strong></span>
                    <span className="text-blue-400">Assigned: {currentInd.crmAssign}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/register"
                  className="px-5 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center gap-1.5"
                >
                  Deploy This Flow in 1-Click ⚡
                </Link>
                <Link to={`/industries/${activeIndustry}`} className="text-xs font-bold text-gray-400 hover:text-white underline">
                  Explore full {currentInd.name} page
                </Link>
              </div>
            </div>

            {/* Phone Mockup */}
            <div className="lg:col-span-5 bg-[#0e0e13] border border-gray-800 rounded-3xl p-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    AI
                  </div>
                  <div>
                    <div className="font-bold text-white leading-tight">{currentInd.botName}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">● Verified WhatsApp Bot</div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">0.8s reply</div>
              </div>

              <div className="space-y-2.5 text-xs font-sans min-h-[280px] flex flex-col justify-end">
                <div className="bg-gray-900 text-gray-300 p-2.5 rounded-2xl rounded-tl-sm border border-gray-800 text-[11px]">
                  <span className="text-[10px] font-bold text-purple-400 block mb-0.5">Customer Message:</span>
                  {currentInd.trigger}
                </div>

                <div className="bg-emerald-950/40 text-emerald-100 p-3 rounded-2xl rounded-tr-sm border border-emerald-500/30 shadow-md text-[11px] leading-relaxed">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-black mb-1">
                    ⚡ Instant AI Response
                  </div>
                  {currentInd.botMsg}
                </div>

                <div className="space-y-1.5 pt-1">
                  {currentInd.buttons.map((btn, idx) => (
                    <button
                      key={idx}
                      className="w-full bg-gray-900 hover:bg-purple-900/40 border border-gray-700 hover:border-purple-500 text-gray-200 py-2 rounded-xl font-bold text-[11px] transition-all text-center"
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* B2B WHATSAPP OTP SAAS & INTERACTIVE SAVINGS CALCULATOR */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="bg-gradient-to-b from-[#0e0e14] to-[#08080c] border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-8">
          
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1 rounded-full text-emerald-400 font-black text-xs uppercase tracking-wider">
              <Zap size={14} className="text-emerald-400" />
              <span>B2B WhatsApp OTP API for Developers & Apps</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white">
              Cut OTP Costs by 40% with <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">0.8s WhatsApp Delivery</span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              Ditch expensive SMS gateways and tedious DLT entity approvals. Integrate our high-speed WhatsApp Authentication API into your Website, Mobile App, or CRM with 3 lines of code.
            </p>
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-black/60 border border-gray-800 rounded-3xl p-6 sm:p-8">
            
            {/* Left: Interactive Slider & Savings */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-300">Monthly OTP / Login Volume:</span>
                  <span className="font-black text-emerald-400 font-mono text-base bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-500/40">
                    {otpVolume.toLocaleString('en-IN')} OTPs / Mo
                  </span>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="200000"
                  step="5000"
                  value={otpVolume}
                  onChange={(e) => setOtpVolume(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>5K / month</span>
                  <span>50K</span>
                  <span>100K</span>
                  <span>200K / month</span>
                </div>
              </div>

              {/* Comparison Metric Cards */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-red-950/20 border border-red-900/40 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-red-400 font-bold">Traditional SMS OTP</div>
                  <div className="text-xl font-black text-white font-mono">
                    ₹{Math.round(otpVolume * 0.28).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-400">@ ₹0.28/SMS + DLT compliance</div>
                  <div className="text-[10px] text-red-400/80 font-bold">⚠️ 82% Avg Delivery Rate</div>
                </div>

                <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-2xl space-y-1">
                  <div className="text-[11px] text-emerald-400 font-bold">DealClose WhatsApp OTP</div>
                  <div className="text-xl font-black text-emerald-300 font-mono">
                    ₹{Math.round(otpVolume * 0.18).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-400">@ ₹0.18/OTP (Zero DLT)</div>
                  <div className="text-[10px] text-emerald-400 font-bold">⚡ 99.8% 0.8s Instant Delivery</div>
                </div>
              </div>

              {/* Monthly Net Savings Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider block">Your Monthly Net Savings</span>
                  <span className="text-2xl font-black text-white font-mono">
                    ₹{Math.round(otpVolume * 0.10).toLocaleString('en-IN')} <span className="text-xs font-normal text-emerald-300 font-sans">/ month saved</span>
                  </span>
                </div>
                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs rounded-xl shadow-lg transition-all"
                >
                  Get API Key 🚀
                </Link>
              </div>
            </div>

            {/* Right: Developer Code Snippet & Live Phone Bubble */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#0b0f14] border border-gray-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setActiveCodeLang('curl')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeCodeLang === 'curl' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      cURL
                    </button>
                    <button
                      onClick={() => setActiveCodeLang('javascript')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeCodeLang === 'javascript' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Node.js / Fetch
                    </button>
                    <button
                      onClick={() => setActiveCodeLang('python')}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeCodeLang === 'python' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                      Python
                    </button>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">3-Line Setup</span>
                </div>

                <div className="bg-black/90 p-3 rounded-xl font-mono text-[11px] text-gray-300 overflow-x-auto leading-relaxed border border-gray-900">
                  {activeCodeLang === 'curl' && (
                    <pre>
{`curl -X POST https://dealcloseai.in/api/v1/otp/send \\
  -H "x-api-key: dcl_live_998822" \\
  -H "Content-Type: application/json" \\
  -d '{"phoneNumber": "+919876543210", "appName": "MyStore"}'`}
                    </pre>
                  )}
                  {activeCodeLang === 'javascript' && (
                    <pre>
{`// 1-Line WhatsApp OTP Call
const res = await fetch('https://dealcloseai.in/api/v1/otp/send', {
  method: 'POST',
  headers: {
    'x-api-key': 'dcl_live_998822',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phoneNumber: '+919876543210',
    appName: 'MyStore'
  })
});`}
                    </pre>
                  )}
                  {activeCodeLang === 'python' && (
                    <pre>
{`import requests

res = requests.post(
  'https://dealcloseai.in/api/v1/otp/send',
  headers={'x-api-key': 'dcl_live_998822'},
  json={'phoneNumber': '+919876543210', 'appName': 'MyStore'}
)`}
                    </pre>
                  )}
                </div>

                {/* WhatsApp Phone Mock Message Bubble with 1-Tap Copy Code */}
                <div className="bg-[#0b141a] border border-[#202c33] p-3 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
                    <span className="text-emerald-400 font-bold">DealClose Verified Authentication</span>
                    <span>Just Now</span>
                  </div>
                  <p className="text-gray-200 text-[11px]">
                    *8492* is your verification code for MyStore. Valid for 5 minutes. Do not share this code with anyone.
                  </p>
                  <button className="w-full py-1.5 bg-[#202c33] hover:bg-[#2a3942] text-[#53bdeb] font-bold text-[11px] rounded-xl flex items-center justify-center gap-1.5 transition-all">
                    <span>📋 Copy Code</span>
                    <span className="text-[9px] bg-[#111b21] px-1.5 py-0.5 rounded text-gray-400">8492</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* 4 Core B2B Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-emerald-400">⚡</span> 0.8s Instant Delivery
              </div>
              <p className="text-gray-400 text-[11px]">Direct tier-1 Meta Cloud pipes ensuring zero OTP queue lag or drop-offs.</p>
            </div>

            <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-purple-400">🛡️</span> Zero DLT Registration
              </div>
              <p className="text-gray-400 text-[11px]">No cumbersome Indian telecom DLT portal registration or template delays.</p>
            </div>

            <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-blue-400">📊</span> Live Masked Logs
              </div>
              <p className="text-gray-400 text-[11px]">Complete developer audit logs with masked phone numbers for 100% GDPR compliance.</p>
            </div>

            <div className="bg-black/40 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="text-amber-400">💰</span> 40%+ Cost Savings
              </div>
              <p className="text-gray-400 text-[11px]">Transparent pay-as-you-go billing with real-time balance recharge alerts.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Transparent Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <span className="text-xs font-black text-purple-400 uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full">
            Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">Simple, Honest Plans for Every Business</h2>
          <p className="text-xs sm:text-sm text-gray-400">
            14 Days 100% Free Trial • Zero credit card required • Zero markup on Meta conversations.
          </p>

          {/* Duration Selector Tabs: 1 Month vs 3 Months vs 6 Months vs 12 Months */}
          <div className="inline-flex items-center bg-gray-900 border border-gray-800 p-1 rounded-2xl shadow-inner mt-4 flex-wrap justify-center gap-1">
            <button
              onClick={() => setBillingCycle('1mo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${billingCycle === '1mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              1 Month
            </button>
            <button
              onClick={() => setBillingCycle('3mo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '3mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              3 Months <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black px-1.5 py-0.5 rounded-full">New ⚡</span>
            </button>
            <button
              onClick={() => setBillingCycle('6mo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '6mo' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              6 Months <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[9px] font-black px-1.5 py-0.5 rounded-full">Popular</span>
            </button>
            <button
              onClick={() => setBillingCycle('12mo')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === '12mo' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md' : 'text-gray-400 hover:text-white'}`}
            >
              12 Months (1 Year) <span className="bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">Unlimited Products 🔥</span>
            </button>
          </div>
        </div>

        {/* 🏆 SPECIAL VIP EARLY ADOPTER OFFER (FIRST 100 CUSTOMERS ONLY) */}
        <div className="bg-gradient-to-r from-amber-950/60 via-[#181206] to-amber-950/60 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-black text-[10px] sm:text-xs px-4 py-1.5 rounded-bl-2xl uppercase tracking-wider shadow-md">
            🔥 First 100 Customers Special (Limited Time)
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👑</span>
                <h3 className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                  Early Adopter VIP Founder Access
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Get full access to <strong>WhatsApp API + Instagram Comment-to-DM + Google 1-Tap Review Booster + Pre-built Industry Posts & Flow Automations</strong> at an unbeatable founder rate!
              </p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-amber-200/90 pt-1">
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ WhatsApp Official Cloud API</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ Instagram Reel DMs</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ Google Review Booster</span>
                <span className="bg-amber-950/80 px-2.5 py-1 rounded-lg border border-amber-500/40">✓ Unlimited Products Included</span>
              </div>
              <p className="text-[10px] text-gray-400 italic">
                *Note: Conversational AI Replies & AI Voice Calling separate via minimum recharge wallet (₹499).
              </p>
            </div>

            {/* 2 VIP Pricing Cards */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-black/70 border border-amber-500/50 p-4 rounded-2xl text-center space-y-2 hover:border-amber-400 transition-all">
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block">3 Months Pass</span>
                <div className="text-gray-500 line-through text-xs">₹2,999</div>
                <div className="text-2xl font-black text-white font-mono">₹599</div>
                <span className="text-[10px] text-emerald-400 font-bold block">(Just ₹199 / mo)</span>
                <Link
                  to="/register"
                  className="w-full py-2 bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black text-xs rounded-xl block hover:opacity-90 shadow-md transition-all"
                >
                  Claim 3-Mo Pass ⚡
                </Link>
              </div>

              <div className="bg-black/90 border-2 border-amber-400 p-4 rounded-2xl text-center space-y-2 shadow-lg shadow-amber-500/20 relative">
                <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider block">12 Months (1 Year)</span>
                <div className="text-gray-500 line-through text-xs">₹8,999</div>
                <div className="text-2xl font-black text-amber-300 font-mono">₹2,499</div>
                <span className="text-[10px] text-emerald-400 font-bold block">(Only ₹208 / mo)</span>
                <Link
                  to="/register"
                  className="w-full py-2 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-black text-xs rounded-xl block hover:opacity-90 shadow-md transition-all"
                >
                  Claim 1-Year Pass 🚀
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Standard Plans Grid with Duration-based Prices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Plan 1: Essential Growth */}
          <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between hover:border-gray-700 transition-all space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Essential Growth</span>
                <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
                  14 Days Free Trial
                </span>
              </div>
              
              <div>
                {billingCycle === '1mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹999 / month</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹599</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">/ 1 month (100 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '3mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹2,997 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹1,699</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 3 months (~₹566/mo • 250 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '6mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹5,994 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹3,499</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 6 months (~₹583/mo • 500 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '12mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹11,988 (₹999/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-baseline gap-2">
                      <span>₹5,999</span>
                      <span className="text-xs text-emerald-400 font-bold font-sans">/ 1 Year (₹499/mo • 🌟 UNLIMITED Products)</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">Perfect for local retail boutiques, salons, cafes & solo shops.</p>

              <div className="space-y-2.5 text-xs text-gray-300 border-t border-gray-800/80 pt-4">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> WhatsApp Official Meta Cloud API</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Instagram Comment-to-DM Auto-Replies</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Ready-Made Niche Social Media Posts</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Visual Drag & Drop Flow Builder</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Product Catalog & PDF Brochure Dispatch</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> 0% Markup on Meta Conversation Rates</div>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-black text-xs text-center transition-all border border-gray-700"
            >
              Start 14-Day Free Trial (₹0) ⚡
            </Link>
          </div>

          {/* Plan 2: Omnichannel Pro */}
          <div className="bg-gradient-to-b from-purple-950/40 via-gray-950 to-black border-2 border-purple-500/80 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-purple-500/10 space-y-6 relative">
            <div className="absolute -top-3 left-8 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
              Most Popular ⭐ Recommended
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] font-black text-purple-300 uppercase tracking-wider">Omnichannel Pro Automation</span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  14 Days Free Trial
                </span>
              </div>
              
              <div>
                {billingCycle === '1mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹1,499 / month</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹899</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">/ 1 month (100 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '3mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹4,497 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹2,499</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 3 months (~₹833/mo • 250 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '6mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹8,994 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono flex items-baseline gap-2">
                      <span>₹4,799</span>
                      <span className="text-xs text-gray-400 font-normal font-sans">for 6 months (~₹799/mo • 500 Products)</span>
                    </div>
                  </div>
                )}
                {billingCycle === '12mo' && (
                  <div>
                    <div className="text-sm text-gray-500 line-through font-mono">₹17,988 (₹1,499/mo)</div>
                    <div className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 font-mono flex items-baseline gap-2">
                      <span>₹8,999</span>
                      <span className="text-xs text-emerald-400 font-bold font-sans">/ 1 Year (₹749/mo • 🌟 UNLIMITED Products)</span>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400">For high-growth real estate builders, gym clubs, clinics & e-commerce brands.</p>

              <div className="space-y-2.5 text-xs text-gray-300 border-t border-gray-800/80 pt-4">
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> <strong>Everything in Essential Growth +</strong></div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> <strong>1-Tap 5-Star Google Review Booster</strong></div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Multi-Agent Shared Team Inbox (3 Staff Included)</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Automated CRM Lead Stages & Distribution</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> Meta Approved Bulk Template Broadcaster</div>
                <div className="flex items-center gap-2"><Check size={14} className="text-emerald-400 shrink-0" /> 1-Click Social Media Batch Publisher</div>
              </div>
            </div>

            <Link
              to="/register"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 text-black font-black text-xs text-center transition-all shadow-lg hover:opacity-95"
            >
              Start 14-Day Free Trial (₹0) 🚀
            </Link>
          </div>

        </div>

        {/* Modular Add-Ons & AI Recharge Box */}
        <div className="bg-[#0b0f14] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-800 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Modular Add-Ons & AI Response Wallet</h3>
              <p className="text-[11px] text-gray-400">Scale as you grow without paying high rigid bundle pricing.</p>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30">
              Pay Only For What You Use
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-black/50 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="text-gray-400 font-bold">Extra Social / WA Channel</div>
              <div className="text-lg font-black text-white font-mono">₹249 <span className="text-[10px] text-gray-400 font-normal">/ channel / mo</span></div>
              <p className="text-[10px] text-gray-500">Connect extra WhatsApp numbers or FB pages.</p>
            </div>

            <div className="bg-black/50 border border-gray-800 p-4 rounded-2xl space-y-1">
              <div className="text-gray-400 font-bold">Extra Staff Login Seat</div>
              <div className="text-lg font-black text-white font-mono">₹99 <span className="text-[10px] text-gray-400 font-normal">/ staff / mo</span></div>
              <p className="text-[10px] text-gray-500">Dedicated staff logins with lead isolation.</p>
            </div>

            <div className="bg-black/50 border border-emerald-500/40 p-4 rounded-2xl space-y-1">
              <div className="text-emerald-300 font-bold">AI Response & Voice Bot Wallet</div>
              <div className="text-lg font-black text-emerald-300 font-mono">Min. ₹499 <span className="text-[10px] text-gray-400 font-normal">recharge</span></div>
              <p className="text-[10px] text-gray-500">Hinglish sales AI chat & Hindi AI calling agent.</p>
            </div>
          </div>
        </div>

      </section>

      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <h3 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-gray-950 border border-gray-800 rounded-2xl p-5">
              <h4 className="font-bold text-sm text-white mb-2 flex items-center gap-2">
                <HelpCircle size={15} className="text-purple-400 shrink-0" /> {faq.q}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed pl-6">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Full Footer with All Site Links */}
      <footer className="border-t border-gray-900 bg-black/90 py-12 text-xs text-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="font-extrabold text-base text-white mb-3">DealClose AI</div>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                Empowering Indian builders, retailers & small businesses with official WhatsApp automation and business intelligence.
              </p>
              <div className="text-[11px] text-emerald-400">● 100% Made with ❤️ in India</div>
            </div>

            <div>
              <div className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Solutions</div>
              <div className="space-y-2">
                <Link to="/industries/real-estate" className="block hover:text-white transition-colors">Real Estate & Builders</Link>
                <Link to="/industries/fashion-boutique" className="block hover:text-white transition-colors">Clothes & Boutiques</Link>
                <Link to="/industries/jewellery" className="block hover:text-white transition-colors">Jewellery Showrooms</Link>
                <Link to="/industries/hardware-materials" className="block hover:text-white transition-colors">Hardware & Construction</Link>
                <Link to="/industries/mobile-electronics" className="block hover:text-white transition-colors">Mobiles & Electronics</Link>
                <Link to="/industries" className="block text-purple-400 hover:text-purple-300 font-bold">All 9 Industry Verticals →</Link>
              </div>
            </div>

            <div>
              <div className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Comparison & Pricing</div>
              <div className="space-y-2">
                <Link to="/compare/wati" className="block hover:text-white transition-colors">DealClose vs WATI</Link>
                <Link to="/compare/manychat" className="block hover:text-white transition-colors">DealClose vs ManyChat</Link>
                <Link to="/compare/gallabox" className="block hover:text-white transition-colors">DealClose vs Gallabox</Link>
                <Link to="/compare/interakt" className="block hover:text-white transition-colors">DealClose vs Interakt</Link>
                <Link to="/pricing" className="block hover:text-white transition-colors font-bold text-emerald-400">Pricing & Add-ons</Link>
              </div>
            </div>

            <div>
              <div className="font-bold text-white mb-3 uppercase tracking-wider text-[11px]">Company & Legal</div>
              <div className="space-y-2">
                <Link to="/about" className="block hover:text-white transition-colors">About Us</Link>
                <Link to="/faq" className="block hover:text-white transition-colors">FAQ</Link>
                <Link to="/help" className="block hover:text-white transition-colors">Help & Support</Link>
                <Link to="/privacy-policy" className="block hover:text-white transition-colors">Privacy Policy</Link>
                <Link to="/terms-and-conditions" className="block hover:text-white transition-colors">Terms & Conditions</Link>
                <Link to="/delete-data" className="block hover:text-white transition-colors">Data Deletion</Link>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-900 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-gray-500">
            <p>© 2026 DealClose AI. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/privacy-policy" className="hover:text-gray-400">Privacy</Link>
              <Link to="/terms-and-conditions" className="hover:text-gray-400">Terms</Link>
              <Link to="/help" className="hover:text-gray-400">Support</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Competitor Ad Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e0e13] border border-purple-500/40 rounded-3xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setIsScannerOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white p-2 rounded-xl bg-gray-900 border border-gray-800"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-wider mb-2">
              <Flame size={16} /> Free Market Intelligence (SerpAPI + Meta Ads)
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white mb-1">Competitor Ad & Local Demand Spy</h3>
            <p className="text-xs text-gray-400 mb-6">Type a business keyword or city (e.g. "Bridal jewellery Jaipur" or "3BHK flats Whitefield") to inspect competitor ads and viral hooks.</p>

            <form onSubmit={handleScanSubmit} className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter business keyword, city, or niche..."
                  value={scannerQuery}
                  onChange={(e) => setScannerQuery(e.target.value)}
                  className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  disabled={isScanning}
                  className="px-6 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-black font-black text-xs rounded-xl shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {isScanning ? 'Scanning Ads...' : 'Scan Now 🔍'}
                </button>
              </div>
            </form>

            {/* Results Box */}
            {scanResult && (
              <div className="bg-black/60 border border-gray-800 rounded-2xl p-5 space-y-4 text-xs animate-fade-in-up">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <span className="font-bold text-white">AI Market Analysis Report</span>
                  <span className="bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-black text-[11px]">
                    Viral Score: {scanResult.viralScore || 88}/100
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 block font-bold mb-1">Executive Summary:</span>
                  <p className="text-gray-300 leading-relaxed">{scanResult.overallSummary || "Scan completed."}</p>
                </div>

                {scanResult.strengths && scanResult.strengths.length > 0 && (
                  <div>
                    <span className="text-emerald-400 block font-bold mb-1">Top Competitor Hooks & Strengths:</span>
                    <ul className="list-disc pl-5 space-y-1 text-gray-300">
                      {scanResult.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {scanResult.actionableTips && (
                  <div className="bg-purple-950/20 border border-purple-500/30 p-3 rounded-xl">
                    <span className="text-purple-300 font-bold block mb-1">Recommended Actionable Tip for You:</span>
                    <p className="text-purple-200">{Array.isArray(scanResult.actionableTips) ? scanResult.actionableTips.join(' ') : scanResult.actionableTips}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}