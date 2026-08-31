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
            Billing & AI Wallet
          </span>
        </h1>
        <p className="text-gray-400 text-sm">Pay-as-you-go AI usage credits with lifetime validity. Zero monthly expiry.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 max-w-5xl">
        {/* AI Credits & Balance Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Available AI Credits</h2>
                <div className="flex items-end gap-3">
                  <p className="text-5xl font-black text-white font-mono">{aiCredits}</p>
                  <span className="text-xs text-purple-400 font-medium mb-1.5 bg-purple-400/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
                    Never Expires ♾️
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">1 Credit ≈ 100 AI Tokens / 2-3 Full Chat Inquiries</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <button 
                onClick={() => handleAddCredits(99)} 
                className="p-3 bg-gray-900 border border-purple-500/40 hover:border-purple-400 rounded-xl text-center transition-all group"
              >
                <div className="text-[10px] text-purple-400 font-bold uppercase">Starter</div>
                <div className="text-lg font-black text-white font-mono">₹99</div>
                <div className="text-[9px] text-emerald-400 font-bold">+100 Credits</div>
              </button>

              <button 
                onClick={() => handleAddCredits(299)} 
                className="p-3 bg-purple-950/40 border border-purple-500 rounded-xl text-center transition-all shadow-md"
              >
                <div className="text-[10px] text-amber-400 font-bold uppercase">Popular ⭐</div>
                <div className="text-lg font-black text-white font-mono">₹299</div>
                <div className="text-[9px] text-emerald-400 font-bold">+400 Credits</div>
              </button>

              <button 
                onClick={() => handleAddCredits(499)} 
                className="p-3 bg-gray-900 border border-gray-700 hover:border-gray-600 rounded-xl text-center transition-all"
              >
                <div className="text-[10px] text-gray-400 font-bold uppercase">Pro Scale</div>
                <div className="text-lg font-black text-white font-mono">₹499</div>
                <div className="text-[9px] text-emerald-400 font-bold">+800 Credits</div>
              </button>
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
        <h2 className="text-2xl font-bold text-white mb-6">Your Software Subscriptions</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* WhatsApp Plan */}
          <div className="bg-gradient-to-br from-[#0a1a10] to-[#111] border border-green-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">WhatsApp Automations</h3>
              <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold">1 Month Free Trial</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Expires in 28 days. After trial, choose your plan:</p>
            <ul className="text-sm space-y-2 mb-6">
              <li className="flex justify-between text-gray-300"><span>Basic Automation (Base)</span> <span>₹199 / mo</span></li>
              <li className="flex justify-between text-green-300 font-bold border-t border-gray-800 pt-2 mt-2"><span>1st Month AI Offer</span> <span className="line-through text-gray-500 mr-2">₹299</span><span>₹99 / mo</span></li>
            </ul>
            <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-colors">Select Plan</button>
          </div>

          {/* Instagram Plan */}
          <div className="bg-gradient-to-br from-[#1a0a10] to-[#111] border border-pink-500/30 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Instagram AI Funnel</h3>
              <span className="bg-pink-500/20 text-pink-400 px-3 py-1 rounded-full text-xs font-bold">1 Month Free Trial</span>
            </div>
            <p className="text-sm text-gray-400 mb-4">Expires in 28 days. Includes Profile Growth Audits.</p>
            <ul className="text-sm space-y-2 mb-6">
              <li className="flex justify-between text-gray-300"><span>Basic Auto-DM (Base)</span> <span>₹199 / mo</span></li>
              <li className="flex justify-between text-pink-300 font-bold border-t border-gray-800 pt-2 mt-2"><span>1st Month AI Offer</span> <span className="line-through text-gray-500 mr-2">₹299</span><span>₹99 / mo</span></li>
            </ul>
            <button className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-bold transition-colors">Select Plan</button>
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