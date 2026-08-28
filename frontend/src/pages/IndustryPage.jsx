import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  Sparkles, ArrowRight, CheckCircle2, MessageSquare, Phone, 
  ShoppingBag, Gem, Hammer, Smartphone, ShoppingCart, 
  Building2, Scissors, Utensils, GraduationCap, Zap, Play, Check, ShieldCheck
} from 'lucide-react';

const InstagramIcon = ({ size = 20, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
  </svg>
);

export default function IndustryPage() {
  const { industryKey } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(industryKey || 'fashion-boutique');

  useEffect(() => {
    if (industryKey && industries[industryKey]) {
      setActiveTab(industryKey);
    }
  }, [industryKey]);

  const handleIndustrySelect = (key) => {
    setActiveTab(key);
    navigate(`/industries/${key}`, { replace: true });
  };

  const industries = {
    'fashion-boutique': {
      name: 'Clothes & Fashion Boutiques',
      shortName: 'Fashion & Clothes',
      icon: <ShoppingBag className="text-pink-400" size={22} />,
      badge: 'Boutiques, Sarees & Apparel',
      tagline: 'Turn Viral Instagram Reels & Comments into Instant WhatsApp Orders',
      heroStat: '4.8x Faster Checkout',
      statLabel: 'from Instagram Reel comments',
      problems: [
        'Replying to hundreds of "Price please?", "Sizes available?" manually in DMs.',
        'Customers dropping off before completing payment on website.',
        'High return/RTO rates on Cash on Delivery orders.'
      ],
      solutions: [
        {
          title: 'Instant Reel Comment-to-DM Auto-Reply',
          desc: 'When a buyer types "PRICE" or "LINK" on your Instagram reel or post, DealClose AI instantly DMs the size chart, photo catalog, and direct UPI buy link.',
        },
        {
          title: 'WhatsApp Catalog & PDF Broadcast',
          desc: 'Send newly launched festive or wedding collections to past buyers with 1-click WhatsApp Broadcast without getting banned.',
        },
        {
          title: 'Automated COD Confirmation Bot',
          desc: 'Send an instant WhatsApp button message asking buyer to confirm or cancel their COD order, reducing fake orders by up to 60%.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Instagram Reel Comment: "Price for XL blue kurta?"',
        aiPublicReply: 'DealClose AI Public Reply: "Details & Size Chart sent to your DM! 📩"',
        aiDmMsg: 'Hey Ananya! ✨ The Royal Blue Anarkali Kurta (XL) is ₹1,499. Fabric: Pure Cotton Silk. Tap below to order with Free Shipping!',
        buttons: ['🛍️ Buy Now (UPI/COD)', '📏 View Size Chart', '💬 Chat on WhatsApp']
      }
    },
    'jewellery': {
      name: 'Jewellery & Gold Showrooms',
      shortName: 'Jewellery & Gold',
      icon: <Gem className="text-amber-400" size={22} />,
      badge: 'Gold, Diamond & Silver Showrooms',
      tagline: 'Broadcast Daily Gold Rates & Book High-Value Showroom Appointments',
      heroStat: '85% Enquiry Response Rate',
      statLabel: 'within 5 seconds',
      problems: [
        'Customers constantly calling or messaging for today’s 22K/24K gold rates.',
        'High drop-off on custom bridal jewellery enquiries.',
        'Lost walk-in opportunities during wedding seasons.'
      ],
      solutions: [
        {
          title: 'Automated Daily Gold/Silver Rate Updates',
          desc: 'Send automatic morning WhatsApp updates with live 22K/24K gold rates to VIP customer lists and past jewellery buyers.',
        },
        {
          title: 'Bridal & Custom Design Booking Bot',
          desc: 'Send PDF brochures of new bridal collections and book personalized showroom consultation slots directly on WhatsApp.',
        },
        {
          title: 'Birthday & Anniversary Jewellery Offers',
          desc: 'Trigger personalized discount vouchers on customer anniversaries and birthdays automatically.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Customer WhatsApp: "Today gold rate & bridal sets?"',
        aiPublicReply: 'Instant AI Agent Assistant',
        aiDmMsg: 'Namaste Rajan Ji! 🌟 Today 22K Gold Rate is ₹6,850/gm. We have 15+ new Lightweight Bridal Sets in stock. Would you like to view our digital catalog or book a showroom visit?',
        buttons: ['📖 View Bridal Catalog PDF', '📅 Book Showroom Visit', '📞 Call Jewellery Expert']
      }
    },
    'hardware-materials': {
      name: 'Hardware, Plywood & Construction Materials',
      shortName: 'Hardware & Supplies',
      icon: <Hammer className="text-orange-400" size={22} />,
      badge: 'Plywood, Sanitary, Paints & Hardware',
      tagline: 'Deliver Instant Rate Cards & Capture Wholesale Contractor Inquiries',
      heroStat: '10x Faster Quotations',
      statLabel: 'for contractors & builders',
      problems: [
        'Contractors and carpenters sending long hand-written WhatsApp lists for pricing.',
        'Staff busy calculating quotes while customers wait and buy elsewhere.',
        'Difficulty following up on outstanding payments and wholesale credit.'
      ],
      solutions: [
        {
          title: 'Instant Rate Card & Catalog PDF Dispatch',
          desc: 'Contractors send keyword "RATES" or "PIPES" and get the latest updated price list PDF automatically 24/7.',
        },
        {
          title: 'Wholesale Lead Capture to CRM',
          desc: 'Collect contractor name, project location, and required quantity automatically and assign to your sales executive.',
        },
        {
          title: 'Payment Reminder & Invoice Alerts',
          desc: 'Send gentle WhatsApp reminders with UPI payment QR codes for pending ledger balances.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Contractor Message: "Send rates for 19mm Marine Plywood & Asian Paints"',
        aiPublicReply: 'Automated Hardware Assistant',
        aiDmMsg: 'Hello Sharma Builders! 🏗️ Attached is our Latest Wholesale Price Sheet for 19mm BWP/Marine Plywood & Paints. For orders above ₹50,000, enjoy an extra 5% bulk discount.',
        buttons: ['📄 Download Rate Sheet PDF', '📝 Submit Material List', '👤 Talk to Manager']
      }
    },
    'mobile-electronics': {
      name: 'Mobiles, Laptops & Home Electronics',
      shortName: 'Mobiles & Electronics',
      icon: <Smartphone className="text-cyan-400" size={22} />,
      badge: 'Smartphones, Laptops & Gadgets',
      tagline: 'Automate Model Comparisons, EMI Calculations & Repair Tracking',
      heroStat: '3x More Store Walk-ins',
      statLabel: 'with instant EMI previews',
      problems: [
        'Customers asking "Is iPhone 16 in stock?", "What is Bajaj EMI option?".',
        'Customers calling repeatedly to check phone/laptop repair status.',
        'Losing phone exchange customers to online marketplaces.'
      ],
      solutions: [
        {
          title: 'Instant Stock & EMI Calculator Bot',
          desc: 'Allow customers to select phone models and see instant zero-downpayment EMI options and cashback offers on WhatsApp.',
        },
        {
          title: 'Automated Repair Job Sheet Tracker',
          desc: 'Customers simply enter their Job ID to get live repair status, estimated delivery time, and bill amount.',
        },
        {
          title: 'Exchange Valuation & Booking',
          desc: 'Capture old device condition and offer instant exchange discount coupons for local store redemption.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Customer: "Price of OnePlus 13 with 0% EMI?"',
        aiPublicReply: 'DealClose Electronics Assistant',
        aiDmMsg: 'Hi Amit! 📱 OnePlus 13 (12GB/256GB) is available in Black & Green at ₹69,999. Bajaj Finserv 0% EMI starts at ₹5,833/mo for 12 months with ₹2,000 instant bank discount!',
        buttons: ['💳 Check EMI Eligibility', '📍 Store Location & Directions', '🎁 Reserve at Store']
      }
    },
    'grocery-supermarket': {
      name: 'Supermarkets, Ration & Kirana Stores',
      shortName: 'Supermarkets & Ration',
      icon: <ShoppingCart className="text-emerald-400" size={22} />,
      badge: 'Supermarkets, D-Mart Style & Kirana',
      tagline: 'Accept WhatsApp List Orders & Automate Monthly Grocery Reminders',
      heroStat: '92% Repeat Orders',
      statLabel: 'via automated monthly reminders',
      problems: [
        'Customers sending messy WhatsApp lists or photos that get missed by busy counter staff.',
        'Customers switching to 10-minute grocery delivery apps.',
        'No easy way to notify local colony customers about weekly discounts.'
      ],
      solutions: [
        {
          title: 'Photo / List-to-Order Processing',
          desc: 'Customers send their monthly grocery list photo or text; AI auto-confirms receipt and informs packing time.',
        },
        {
          title: 'Monthly Ration Refill Automated Reminder',
          desc: 'Automatically message past customers after 25 days asking "Time to refill monthly Atta, Rice & Oil?", with a 1-tap re-order button.',
        },
        {
          title: 'Weekly Super Saver Broadcast',
          desc: 'Broadcast weekly grocery discounts (e.g. Wednesday Sabzi Mandi or 1+1 offers) to all nearby apartment residents.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Customer WhatsApp: "Photo of handwritten monthly ration list"',
        aiPublicReply: 'Supermarket Fast Order Bot',
        aiDmMsg: 'Namaste Verma Ji! 🛒 We have received your monthly ration list (14 items). Our team is packing your order. Estimated total: ₹3,420. Delivery within 45 mins!',
        buttons: ['💳 Pay via UPI QR', '➕ Add More Items', '🛵 Live Delivery Status']
      }
    },
    'real-estate': {
      name: 'Real Estate Brokers & Property Developers',
      shortName: 'Real Estate',
      icon: <Building2 className="text-blue-400" size={22} />,
      badge: 'Brokers, Builders & Developers',
      tagline: 'Deliver Property Floorplans in DMs & Auto-Qualify Buyer Budgets',
      heroStat: '70% Qualified Leads',
      statLabel: 'before sales agent picks call',
      problems: [
        'Spending thousands on Meta/Facebook leads that end up being unqualified or fake.',
        'Delayed property brochure delivery leading to lost buyers.',
        'No automated digital visiting card for individual property consultants.'
      ],
      solutions: [
        {
          title: 'Instant Property Brochure & Video Dispatch',
          desc: 'When a buyer comments "BROCHURE" or clicks an ad, DealClose AI delivers the project PDF, video walkthrough, and pricing sheet directly in WhatsApp/DM.',
        },
        {
          title: 'Automated Budget & Timeline Qualification',
          desc: 'Bot asks: "Looking for 2BHK/3BHK?", "Investment or End-use?", "Budget range?" before booking a site visit.',
        },
        {
          title: 'Integrated Digital Visiting Card & Portal Sync',
          desc: 'Brokers get a ready personal digital property profile linking listings, WhatsApp, and CRM in 1 tap (VyaparIndia / NewPropertyHub ready).',
        }
      ],
      chatPreview: {
        customerTrigger: 'Ad Click: "Interested in 3BHK Luxury Flats in Whitefield"',
        aiPublicReply: 'Property Hub AI Assistant',
        aiDmMsg: 'Hello Priya! 🏢 Palm Meadows 3BHK starts at ₹1.45 Cr with private balcony & clubhouse. Here is the Master Floor Plan PDF & Video Walkthrough. When would you like to schedule a free site visit?',
        buttons: ['📥 Download Brochure PDF', '🚗 Book Free Site Visit', '📞 Call Relationship Manager']
      }
    },
    'salon-clinic': {
      name: 'Salons, Spas & Healthcare Clinics',
      shortName: 'Salons & Clinics',
      icon: <Scissors className="text-purple-400" size={22} />,
      badge: 'Hair Salons, Spas, Dental & Skin Clinics',
      tagline: '24/7 Automated Appointment Scheduling & No-Show Reductions',
      heroStat: '40% Fewer No-Shows',
      statLabel: 'with automated WhatsApp reminders',
      problems: [
        'Clients calling while stylists or doctors are busy with appointments.',
        'High appointment no-shows causing revenue loss.',
        'Struggling to collect 5-star Google reviews after service.'
      ],
      solutions: [
        {
          title: 'Self-Serve WhatsApp Appointment Booking',
          desc: 'Clients can select service, choose stylist/doctor, and pick date & time slot directly in WhatsApp.',
        },
        {
          title: 'Automated 2-Hour Advance Reminder',
          desc: 'Send reminder with "Confirm" or "Reschedule" buttons, keeping appointment slots utilized.',
        },
        {
          title: 'Automated 5-Star Google Review Follow-up',
          desc: 'After the appointment, send a happy follow-up with a direct 1-tap Google Maps review link.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Client Message: "Book appointment for Hair Spa & Facial tomorrow"',
        aiPublicReply: 'Salon Booking AI',
        aiDmMsg: 'Hello Pooja! 💆‍♀️ We have slots available tomorrow at 3:00 PM and 5:30 PM with Senior Stylist Neha. Which time suits you best?',
        buttons: ['⏰ Confirm 3:00 PM Slot', '⏰ Confirm 5:30 PM Slot', '💅 View Full Rate Card']
      }
    },
    'restaurant-cafe': {
      name: 'Restaurants, Cafes & Cloud Kitchens',
      shortName: 'Restaurants & Cafes',
      icon: <Utensils className="text-amber-500" size={22} />,
      badge: 'Dine-in, Cafes & Cloud Kitchens',
      tagline: 'Send Digital PDF Menus, Book Tables & Build Direct Loyal Orders',
      heroStat: '0% Aggregator Commission',
      statLabel: 'on direct WhatsApp re-orders',
      problems: [
        'Paying 25% to 30% commission to food delivery aggregators.',
        'Weekend table reservation calls missed during busy dining hours.',
        'Low customer retention on repeat orders.'
      ],
      solutions: [
        {
          title: 'Digital PDF Menu & Table Reservation',
          desc: 'Customers scan table QR code or message on WhatsApp to view food photos, specials, and reserve party tables.',
        },
        {
          title: 'Direct WhatsApp Ordering with 0% Commission',
          desc: 'Take direct repeat orders from nearby customers without paying third-party commissions.',
        },
        {
          title: 'Weekend Special Offers & Party Broadcasts',
          desc: 'Send Friday evening discount coupons to past diners to pack your restaurant tables on weekends.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Customer WhatsApp: "Table for 4 tonight at 8 PM"',
        aiPublicReply: 'Cafe & Bistro Host AI',
        aiDmMsg: 'Hi Rahul! 🍽️ Table for 4 is confirmed for 8:00 PM tonight at Rooftop Lounge. We have reserved a special table for you! Here is our weekend Chef Special Menu.',
        buttons: ['📖 View Weekend Specials', '📍 Get Directions to Cafe', '❌ Modify Reservation']
      }
    },
    'coaching-education': {
      name: 'Coaching, Tutors & Training Institutes',
      shortName: 'Coaching & Education',
      icon: <GraduationCap className="text-emerald-400" size={22} />,
      badge: 'IIT-JEE, NEET, Spoken English & Upskilling',
      tagline: 'Deliver Syllabus PDFs in Seconds & Fill Demo Class Batches',
      heroStat: '5x More Demo Bookings',
      statLabel: 'with instant syllabus delivery',
      problems: [
        'Students and parents inquiring late at night when office staff is unavailable.',
        'Delayed fee payment collection and batch reminder calls.',
        'High student drop-off between inquiry and demo class attendance.'
      ],
      solutions: [
        {
          title: 'Instant Syllabus & Fee Structure Delivery',
          desc: 'Parents receive course brochure, fee structure PDF, and faculty profiles within 3 seconds of asking.',
        },
        {
          title: '1-Click Free Demo Class Registration',
          desc: 'Capture student standard, stream, and preferred batch timing and confirm demo class link via WhatsApp.',
        },
        {
          title: 'Automated Fee Due Reminders with UPI',
          desc: 'Send timely fee installment reminders directly to parents with instant UPI payment buttons.',
        }
      ],
      chatPreview: {
        customerTrigger: 'Parent Message: "Fee structure and syllabus for Class 11 NEET batch?"',
        aiPublicReply: 'Academy Admissions AI',
        aiDmMsg: 'Namaste! 📚 Attached is the NEET 2026 2-Year Program Brochure, Fee Structure & Topper Results. We have a Free Offline Demo Class this Sunday at 10:00 AM.',
        buttons: ['📥 Download NEET Syllabus PDF', '🎟️ Register for Free Demo', '📞 Talk to Senior Counselor']
      }
    }
  };

  const current = industries[activeTab] || industries['fashion-boutique'];

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 selection:bg-purple-500/30">
      {/* Header */}
      <nav className="border-b border-gray-900/80 bg-black/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-purple-500/20 font-black text-black text-lg">
              ⚡
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">DealClose<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400"> AI</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/pricing" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link to="/compare" className="text-xs font-bold text-gray-400 hover:text-white transition-colors">Compare vs Others</Link>
            <Link to="/login" className="text-xs font-bold text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-800 hover:border-gray-700 transition-all">Login</Link>
            <Link to="/register" className="text-xs font-bold text-black bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 rounded-lg shadow-md hover:opacity-95 transition-all">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 pt-12 pb-16">
        
        {/* Industry Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={13} /> Pre-Built Industry Solutions & Templates
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight mb-4">
            Built for <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-emerald-400">Your Exact Business</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Pick your industry below to see how DealClose AI automates your customer chats, reels, calls, and orders in under 3 minutes.
          </p>
        </div>

        {/* Industry Selector Grid / Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2 mb-12">
          {Object.entries(industries).map(([key, data]) => (
            <button
              key={key}
              onClick={() => handleIndustrySelect(key)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all ${
                activeTab === key
                  ? 'bg-gradient-to-b from-purple-900/60 to-gray-950 border-2 border-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105'
                  : 'bg-gray-950/70 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
              }`}
            >
              <div className="p-2 rounded-xl bg-black/40">{data.icon}</div>
              <span className="text-[11px] font-bold leading-tight">{data.shortName}</span>
            </button>
          ))}
        </div>

        {/* Selected Industry Hero Card */}
        <div className="bg-gradient-to-b from-gray-950 to-black border border-gray-800 rounded-3xl p-6 sm:p-10 mb-14 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col lg:flex-row gap-8 items-start justify-between">
            <div className="flex-1">
              <span className="text-xs font-black text-purple-400 uppercase tracking-wider bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full inline-block mb-3">
                {current.badge}
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-3">
                {current.name}
              </h2>
              <p className="text-sm sm:text-base text-gray-300 font-medium mb-6 max-w-xl">
                {current.tagline}
              </p>

              {/* Problem vs Solution quick pill */}
              <div className="space-y-2 mb-8">
                <p className="text-xs font-bold text-rose-400 uppercase tracking-wider">Common Bottlenecks We Eliminate:</p>
                {current.problems.map((prob, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-gray-400">
                    <span className="text-rose-500 font-bold shrink-0">✕</span>
                    <span>{prob}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  to="/register"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-400 to-teal-300 text-black font-black text-xs rounded-xl shadow-lg hover:opacity-95 transition-all flex items-center gap-1.5"
                >
                  Deploy This Template Free <ArrowRight size={14} />
                </Link>
                <Link
                  to="/pricing"
                  className="px-5 py-3 bg-gray-900 border border-gray-800 text-white font-bold text-xs rounded-xl hover:bg-gray-800 transition-all"
                >
                  View ₹199 Starter Plan
                </Link>
              </div>
            </div>

            {/* Live Interactive Chat Simulation Box */}
            <div className="w-full lg:w-[420px] bg-[#0c0c0c] border border-gray-800 rounded-2xl p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-white">Live Automation Preview</span>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">0.8s response</span>
              </div>

              <div className="space-y-3 font-sans text-xs">
                {/* User Trigger */}
                <div className="bg-gray-900 text-gray-300 p-3 rounded-2xl rounded-tl-sm border border-gray-800">
                  <span className="text-[10px] text-purple-400 font-bold block mb-1">Customer Action:</span>
                  {current.chatPreview.customerTrigger}
                </div>

                {/* AI Public Reply */}
                {current.chatPreview.aiPublicReply && (
                  <div className="bg-purple-950/30 text-purple-200 p-2.5 rounded-xl border border-purple-500/20 text-[11px]">
                    💬 {current.chatPreview.aiPublicReply}
                  </div>
                )}

                {/* AI WhatsApp/DM Message */}
                <div className="bg-emerald-950/40 text-emerald-100 p-3 rounded-2xl rounded-tr-sm border border-emerald-500/30 shadow-md">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-black mb-1">
                    <Zap size={12} /> DealClose AI Instant DM
                  </div>
                  <p className="leading-relaxed">{current.chatPreview.aiDmMsg}</p>
                </div>

                {/* Interactive Action Buttons */}
                <div className="space-y-1.5 pt-1">
                  {current.chatPreview.buttons.map((btn, idx) => (
                    <div
                      key={idx}
                      className="bg-black/60 hover:bg-black text-gray-200 border border-gray-800 p-2 rounded-xl text-center font-bold text-[11px] cursor-pointer transition-all hover:border-emerald-500/50"
                    >
                      {btn}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Workflow Modules for this industry */}
        <div className="mb-16">
          <div className="text-left mb-8">
            <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">How It Works</span>
            <h3 className="text-2xl font-bold text-white mt-1">3 Pre-Engineered Growth Modules</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {current.solutions.map((sol, i) => (
              <div key={i} className="bg-gray-950 border border-gray-800 p-6 rounded-3xl flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xs mb-4">
                    0{i + 1}
                  </div>
                  <h4 className="text-base font-bold text-white mb-2">{sol.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4">{sol.desc}</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 pt-3 border-t border-gray-900">
                  <CheckCircle2 size={13} /> Ready in 1-Click
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Switcher Footer CTA */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-emerald-500 rounded-3xl p-8 sm:p-10 text-center text-black shadow-2xl">
          <h3 className="text-2xl sm:text-3xl font-black mb-2">Ready to Automate Your {current.shortName} Business?</h3>
          <p className="text-xs sm:text-sm font-semibold max-w-lg mx-auto mb-6 text-black/80">
            Get started in 5 minutes with zero technical skills. Connect your WhatsApp & Instagram and launch pre-built flows.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link to="/register" className="px-8 py-3.5 bg-black text-white font-black text-xs rounded-xl shadow-xl hover:bg-gray-900 transition-all flex items-center gap-2">
              Start 14-Day Free Trial <ArrowRight size={14} />
            </Link>
            <Link to="/compare" className="px-6 py-3.5 bg-white/30 text-black font-black text-xs rounded-xl hover:bg-white/40 transition-all">
              Compare vs Competitors
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-8 text-center text-xs text-gray-500">
        <p>© 2026 DealClose AI. Built for Modern Indian Retail & Micro-Businesses.</p>
      </footer>
    </div>
  );
}
