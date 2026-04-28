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
      // Jab backend route ban jayega tab ise uncomment karein:
      // const { data } = await api.get('/users/wallet');
      // setTransactions(data.transactions);
      
      // Temporary fallback until backend is linked:
      setTransactions([
        { id: 1, date: '2024-03-04', description: 'AI Call (3 min)', amount: -9.00 },
        { id: 2, date: '2024-03-03', description: 'Credits Added', amount: 1000.00 },
        { id: 3, date: '2024-03-02', description: 'WhatsApp Message', amount: -0.50 },
      ]);
      setAiCredits(85); // Mock 85 credits left out of 100
    } catch (error) {
      console.error("Failed to fetch wallet data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredits = async () => {
    const upgradeAmount = 299; // Fixed price for AI upgrade
    
    try {
      
      // 1. Backend se Order ID create karein
      const { data: order } = await api.post('/users/wallet/create-order', { amount: upgradeAmount });
      
      // 2. Razorpay Window Open karein
      const options = {
        key: "YOUR_RAZORPAY_KEY_ID_HERE", // Replace this temporarily or pass from frontend .env
        amount: order.amount,
        currency: "INR",
        name: "CloseDeal AI",
        description: "Wallet Recharge",
        order_id: order.id,
        handler: async function (response) {
          // 3. Payment Verify karein backend par
          // Passing placeholder userId for MVP
          await api.post('/users/wallet/verify', { ...response, amountToAdd: upgradeAmount, userId: "60d0fe4f5311236168a109ca" });
          alert("Payment Successful! Credits added.");
          fetchWalletData(); // Refresh balance
        },
        theme: { color: "#eab308" }
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
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            Billing & Wallet
          </span>
        </h1>
        <p className="text-gray-400 text-lg">Manage your AI credits, view transactions, and top up your balance.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10 max-w-5xl">
        {/* AI Credits & Balance Card */}
        <div className="bg-[#111111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Smart Replies Left</h2>
                <div className="flex items-end gap-4">
                  <p className="text-5xl font-extrabold text-white">{aiCredits}</p>
                  <span className="text-xs text-purple-400 font-medium mb-2 bg-purple-400/10 px-2 py-1 rounded">Free Trial</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={handleAddCredits} className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all whitespace-nowrap">
                Upgrade to 2000 Replies (₹299)
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