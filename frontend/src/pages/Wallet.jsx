import { useState, useEffect } from 'react';
import api from '../services/api';

export default function Wallet() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiCredits, setAiCredits] = useState(100);
  const [referralCode] = useState('SCALIO-FAST99');

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    try {
      const { data } = await api.get('/users/wallet');
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
      setAiCredits(data.aiCredits || 0);
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async (amount = 99) => {
    try {
      const { data: order } = await api.post('/users/wallet/create-order', { amount });
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || "YOUR_RAZORPAY_KEY_ID_HERE",
        amount: order.amount,
        currency: "INR",
        name: "DealClose AI",
        description: `AI Wallet Recharge (₹${amount})`,
        order_id: order.id,
        handler: async function (response) {
          await api.post('/users/wallet/verify', { ...response, amountToAdd: amount });
          alert("Payment Successful! AI Credits added.");
          fetchWalletData();
        },
        theme: { color: "#a855f7" }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment setup failed", error);
    }
  };

  const copyReferral = () => {
    navigator.clipboard.writeText(referralCode);
    alert("Referral code copied! Share it with friends to get 20% off.");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#050505] text-gray-100 font-sans">
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            Billing & AI Token Wallet
          </span>
        </h1>
        <p className="text-gray-400 text-sm">3 Months Base Validity with Automatic Rollover protection whenever &gt;50% balance remains.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 max-w-5xl">
        {/* AI Credits & Balance Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available AI Token Units</h2>
                <div className="flex items-end gap-3">
                  <p className="text-5xl font-black text-white font-mono">{aiCredits}</p>
                  <span className="text-xs text-purple-400 font-medium mb-1.5 bg-purple-400/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    3-Mo Auto-Rollover 🔄
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">1 Token Unit = 100 Raw AI Tokens (Enough for 2-3 deep DM sales replies)</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button 
                onClick={() => handleAddCredits(99)} 
                className="p-3 bg-gray-900 border border-purple-500/40 hover:border-purple-400 rounded-xl text-center transition-all group"
              >
                <div className="text-[10px] text-purple-400 font-bold uppercase">Starter Pack</div>
                <div className="text-lg font-black text-white font-mono">₹99</div>
                <div className="text-[9px] text-emerald-400 font-bold">+100 Tokens</div>
                <div className="text-[8px] text-gray-500 mt-0.5">3-Mo Rollover</div>
              </button>

              <button 
                onClick={() => handleAddCredits(299)} 
                className="p-3 bg-purple-950/40 border border-purple-500 rounded-xl text-center transition-all shadow-md"
              >
                <div className="text-[10px] text-amber-400 font-bold uppercase">Popular ⭐</div>
                <div className="text-lg font-black text-white font-mono">₹299</div>
                <div className="text-[9px] text-emerald-400 font-bold">+400 Tokens</div>
                <div className="text-[8px] text-amber-300/80 mt-0.5">Max Value</div>
              </button>

              <button 
                onClick={() => handleAddCredits(499)} 
                className="p-3 bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl text-center transition-all"
              >
                <div className="text-[10px] text-gray-400 font-bold uppercase">Pro Scale</div>
                <div className="text-lg font-black text-white font-mono">₹499</div>
                <div className="text-[9px] text-emerald-400 font-bold">+800 Tokens</div>
                <div className="text-[8px] text-gray-500 mt-0.5">High Volume</div>
              </button>
            </div>

            {/* AI Scope Notice */}
            <div className="bg-black/60 border border-gray-800 rounded-xl p-3 text-[11px] text-gray-400 space-y-1">
              <span className="font-bold text-gray-300 block">🎯 AI Token Scope (Zero Tokens Wasted on Comments):</span>
              <p>• Public post comment shortcuts are <strong>100% Free & Unlimited</strong> (Zero tokens used).</p>
              <p>• Tokens are used ONLY for <strong>In-Depth DM Sales Chats</strong>, <strong>Google 5-Star Reviews</strong> & <strong>1-Star Negative Review Auto-Recovery</strong>.</p>
            </div>
          </div>
        </div>

        {/* Refer & Earn Card */}
        <div className="bg-gradient-to-br from-[#1a1525] to-[#111] border border-purple-500/30 rounded-3xl p-8 relative overflow-hidden">
          <h3 className="text-xl font-bold text-white mb-2">🎁 Refer & Get 20% Off</h3>
          <p className="text-sm text-gray-400 mb-6">Share your unique code. When a friend signs up and upgrades, you BOTH get a 20% discount on your next billing or 500 extra AI tokens!</p>
          
          <div className="bg-black/50 border border-gray-800 rounded-xl p-4 flex justify-between items-center mb-4">
            <span className="text-xl font-mono text-purple-400 font-bold tracking-wider">{referralCode}</span>
            <button onClick={copyReferral} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">Copy</button>
          </div>
          <p className="text-xs text-green-400 font-semibold">✨ 1 Friend successfully invited so far!</p>
        </div>
      </div>

      {/* Subscription Plans Status */}
      <div className="mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Your Software Subscriptions</h2>
            <p className="text-xs text-gray-400">Choose modular single-channel or all-in-one automation plans.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Instagram Basic Plan */}
          <div className="bg-gradient-to-br from-[#1a0a14] to-[#111] border border-pink-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-black text-pink-400 uppercase tracking-wider bg-pink-950/60 px-2.5 py-0.5 rounded-full border border-pink-500/30">
                    Rule-Based
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">📸 Instagram Basic</h3>
                </div>
                <span className="text-lg font-black text-white font-mono">₹99 <span className="text-xs font-normal text-gray-400">/mo</span></span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Unlimited keyword Comment-to-DM for reels and posts.</p>
              <ul className="text-xs space-y-1.5 mb-6 text-gray-300">
                <li className="flex items-center gap-2">✓ Unlimited Reel Comment-to-DM</li>
                <li className="flex items-center gap-2">✓ Post & Story DM Auto-responder</li>
                <li className="flex items-center gap-2 text-gray-500">✕ No AI Tokens / No AI Post Analytics</li>
              </ul>
            </div>
            <button className="w-full py-2.5 bg-pink-950/80 hover:bg-pink-900 border border-pink-500/50 text-pink-200 rounded-xl text-xs font-black transition-colors">
              Activate Instagram Basic (₹99)
            </button>
          </div>

          {/* Instagram Creator & AI Analytics Pro Plan */}
          <div className="bg-gradient-to-br from-[#1c0e2a] via-[#111] to-[#0c0c14] border-2 border-purple-500/60 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between shadow-xl shadow-purple-950/40">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-pink-600 text-white font-black text-[9px] px-3 py-1 rounded-bl-xl uppercase tracking-wider">
              10 AI Posts / mo 🔥
            </div>
            <div>
              <div className="flex justify-between items-start mb-3 pt-1">
                <div>
                  <span className="text-[10px] font-black text-purple-300 uppercase tracking-wider bg-purple-950/60 px-2.5 py-0.5 rounded-full border border-purple-500/30">
                    AI Deep Analytics
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">✨ Instagram Creator Pro</h3>
                </div>
                <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-mono">₹199 <span className="text-xs font-normal text-gray-400">/mo</span></span>
              </div>
              <p className="text-xs text-gray-400 mb-4">Comment-to-DM + AI compares top vs low-view posts for viral reach.</p>
              <ul className="text-xs space-y-1.5 mb-6 text-gray-300">
                <li className="flex items-center gap-2">✓ Unlimited Comment-to-DM</li>
                <li className="flex items-center gap-2">✓ <strong>Monthly 10 Deep AI Post Analyses</strong></li>
                <li className="flex items-center gap-2">✓ Viral Hook & Caption Suggestions</li>
                <li className="flex items-center gap-2">✓ Direct DM Lead Capture to CRM</li>
              </ul>
            </div>
            <button className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-purple-600/30">
              Activate Creator Pro (₹199)
            </button>
          </div>

          {/* Google 5-Star Review & Smart Card Plan */}
          <div className="bg-gradient-to-br from-[#1a1408] to-[#111] border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                    Local Business
                  </span>
                  <h3 className="text-lg font-bold text-white mt-1">⭐ Google Review + NFC</h3>
                </div>
                <span className="text-lg font-black text-amber-300 font-mono">₹149 <span className="text-xs font-normal text-gray-400">/mo</span></span>
              </div>
              <p className="text-xs text-gray-400 mb-4">1-Tap Google Review Booster + Smart Digital NFC Business Card.</p>
              <ul className="text-xs space-y-1.5 mb-6 text-gray-300">
                <li className="flex items-center gap-2">✓ 1-Tap 5-Star Google Review Booster QR</li>
                <li className="flex items-center gap-2">✓ Smart Digital Business Card (/card/:id)</li>
                <li className="flex items-center gap-2">✓ Direct WhatsApp Order & Location Link</li>
                <li className="flex items-center gap-2">✓ Zero Meta Connection Needed</li>
              </ul>
            </div>
            <button className="w-full py-2.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 rounded-xl text-xs font-black transition-colors">
              Activate Review Booster (₹149)
            </button>
          </div>
        </div>
      </div>
      
      {/* Transactions Table */}
      <h2 className="text-xl font-bold text-white mb-6">Transaction History</h2>
      <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#1a1a1a] text-gray-400 border-b border-gray-800 text-sm uppercase tracking-wider">
              <th className="p-5 font-semibold">Date</th>
              <th className="p-5 font-semibold">Description</th>
              <th className="p-5 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
               <tr><td colSpan="3" className="text-center p-8 text-gray-500">Loading transactions...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="3" className="text-center p-8 text-gray-500">No transactions yet.</td></tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-900/50 transition-colors">
                  <td className="p-5 text-gray-400">{tx.date}</td>
                  <td className="p-5 font-medium text-gray-200">{tx.description}</td>
                  <td className={`p-5 font-bold text-right ${tx.amount > 0 ? 'text-green-400' : 'text-rose-400'}`}>
                    {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}