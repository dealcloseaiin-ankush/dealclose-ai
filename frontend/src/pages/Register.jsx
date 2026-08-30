import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { Sparkles, Check, Phone, Building2, User, Mail, Lock } from 'lucide-react';

const BUSINESS_CATEGORIES = [
  { id: 'ecommerce_d2c', label: '🛍️ E-Commerce & Instagram D2C', desc: 'Auto DM price & order link' },
  { id: 'coaching_edtech', label: '🎓 Coaching & EdTech', desc: 'Demo classes, fees & syllabus' },
  { id: 'services_agency', label: '💼 Services & Agency', desc: 'Portfolio & client booking' },
  { id: 'real_estate', label: '🏢 Real Estate & Builders', desc: 'Site visits & brochure PDF' },
  { id: 'retail_fashion', label: '👗 Fashion & Retail', desc: 'Festive catalog & 20% coupons' },
  { id: 'gym_fitness', label: '💪 Gym & Fitness', desc: '3-Day VIP pass & trainers' },
  { id: 'restaurant_cafe', label: '🍕 Restaurant & Cafe', desc: 'Digital menu & table booking' },
  { id: 'healthcare_clinic', label: '🩺 Healthcare & Clinics', desc: 'Doctor appointment slots' },
  { id: 'salon_beauty', label: '💅 Salon & Beauty Parlour', desc: 'Service rates & slot booking' },
  { id: 'jewellery_luxury', label: '💍 Jewellery & Gold', desc: 'Daily rate card & video call' },
  { id: 'automobile_dealer', label: '🚗 Automobile & Cars', desc: 'Test drives & EMI calculate' },
  { id: 'hardware_sanitary', label: '🔧 Hardware & Sanitary', desc: 'Paints, tools & cement rates' },
  { id: 'electricals_electronics', label: '⚡ Electricals & Electronics', desc: 'Appliances, wiring & EMI' },
  { id: 'mobile_laptops', label: '📱 Mobile & Laptop Store', desc: 'Phone repair, screen & gadgets' },
  { id: 'furniture_interior', label: '🛋️ Furniture & Interior', desc: 'Sofa, beds & modular design' },
  { id: 'b2b_wholesale', label: '📦 B2B Wholesale', desc: 'Bulk rate lists & GST invoice' },
  { id: 'other_business', label: '✨ Other Custom Business', desc: 'Custom AI sales automation' },
];

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['ecommerce_d2c', 'retail_fashion']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const toggleCategory = (catId) => {
    if (selectedCategories.includes(catId)) {
      if (selectedCategories.length > 1) {
        setSelectedCategories(selectedCategories.filter(id => id !== catId));
      }
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        fullName,
        email,
        phone,
        password,
        businessName: businessName || `${fullName}'s Store`,
        categories: selectedCategories
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-gray-100 flex items-center justify-center p-4 selection:bg-purple-500/30">
      <div className="p-6 md:p-8 bg-[#0e0e14] rounded-3xl shadow-2xl border border-gray-800 w-full max-w-lg space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 mx-auto shadow-lg flex items-center justify-center">
            <img src="/logo.png" alt="DealClose AI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300">
            Create DealClose AI Account
          </h1>
          <p className="text-xs text-gray-400">
            Instant ready-made automations, social posts & sales agents for your business
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Full Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">Owner Name *</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">WhatsApp / Phone *</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-3 text-emerald-400" />
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Email & Password */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">Business Email *</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="email"
                  placeholder="rahul@mybusiness.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-300 mb-1">Set Password *</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-3 text-gray-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Business / Brand Name */}
          <div>
            <label className="block text-[11px] font-bold text-gray-300 mb-1">Business / Store Name (Optional)</label>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-3 text-purple-400" />
              <input
                type="text"
                placeholder="e.g. Royal Fashion Boutique / New City Realty"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-black/60 border border-gray-800 rounded-xl pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Multi-Category Selector */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-gray-300">
                Select Your Business Type(s): <span className="text-purple-400 font-normal">(Select 1 or more)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono">{selectedCategories.length} selected</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
              {BUSINESS_CATEGORIES.map(cat => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-2 ${
                      isSelected
                        ? 'bg-purple-950/70 border-purple-500 text-white shadow-md'
                        : 'bg-black/40 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md border mt-0.5 flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-purple-500 border-purple-400 text-white' : 'border-gray-700 bg-black'
                    }`}>
                      {isSelected && <Check size={11} />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[11px] truncate">{cat.label}</div>
                      <div className="text-[9px] text-gray-400 truncate">{cat.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles size={15} />
            <span>{loading ? 'Creating Your Ready-Made Hub...' : 'Get Started with Ready-Made Automations 🚀'}</span>
          </button>
        </form>

        <div className="text-center pt-1 border-t border-gray-800">
          <p className="text-xs text-gray-400">
            Already registered?{' '}
            <Link to="/login" className="text-purple-400 font-bold hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}