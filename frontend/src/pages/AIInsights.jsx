export default function AIInsights() {

  const copyDataForChatGPT = () => {
    const prompt = `I run an Instagram store named @sneaker_head99. My recent stats: Total posts: 15. Reels get 2000 views on average, Image posts get 200. Bio: "Best sneakers in town". Please act as an expert Instagram Growth Manager and provide 3 actionable tips to improve my profile and increase sales.`;
    navigator.clipboard.writeText(prompt);
    alert("Profile Data Copied! You can now paste this into ChatGPT or Claude for a deep analysis.");
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500 mb-2">AI Business Insights</h1>
        <p className="text-gray-400">Smart observations and recommendations based on your customer chats and calls.</p>
      </div>

      {/* Instagram AI Profile Audit (New Feature) */}
      <div className="mb-10 bg-gradient-to-r from-[#1a1120] to-[#110d14] p-8 rounded-3xl border border-pink-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
              📸 AI Instagram Growth Audit
            </h2>
            <p className="text-gray-400 mt-1">AI scanned your linked IG Profile (@sneaker_head99) and last 15 posts.</p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0">
            <button onClick={copyDataForChatGPT} className="bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
              📋 Export for ChatGPT
            </button>
            <button className="bg-pink-600/20 border border-pink-500/50 hover:bg-pink-600 text-pink-300 hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors">
              ↻ Re-Scan Profile
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="bg-black/50 border border-gray-800 p-5 rounded-2xl">
            <h3 className="text-white font-bold mb-2">1. Bio Optimization</h3>
            <p className="text-sm text-gray-400 leading-relaxed"><span className="text-rose-400">Issue:</span> Your bio lacks a clear Call-To-Action (CTA).<br/><br/><span className="text-green-400">AI Advice:</span> Add "DM 'SHOES' for catalog 👟" to your bio. This will trigger your Auto-DM funnel 40% more effectively.</p>
          </div>
          <div className="bg-black/50 border border-gray-800 p-5 rounded-2xl">
            <h3 className="text-white font-bold mb-2">2. Content & Reach</h3>
            <p className="text-sm text-gray-400 leading-relaxed"><span className="text-rose-400">Issue:</span> Image posts are getting 200 views, but Reels are crossing 2,000 views.<br/><br/><span className="text-green-400">AI Advice:</span> Shift 80% of your content to Reels. Use trending audio and add a "Price?" question in the caption to boost comments.</p>
          </div>
          <div className="bg-black/50 border border-gray-800 p-5 rounded-2xl">
            <h3 className="text-white font-bold mb-2">3. Automation Settings</h3>
            <p className="text-sm text-gray-400 leading-relaxed"><span className="text-rose-400">Issue:</span> You missed 12 leads yesterday who asked questions other than exact keywords.<br/><br/><span className="text-green-400">AI Advice:</span> Upgrade to the 'AI Smart Chat Bot' plan so the bot can naturally answer variations like "kitne ka hai?".</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-[#111] p-6 rounded-2xl border border-orange-500/30 shadow-lg">
          <h3 className="text-orange-400 font-bold mb-2 flex items-center gap-2">🔥 Trending Query</h3>
          <p className="text-white font-medium mb-4">"75% of users asked about 'Cash on Delivery' today."</p>
          <p className="text-sm text-gray-400">AI Advice: Consider adding a clear COD policy message to your auto-reply or welcome menu to increase conversion.</p>
        </div>

        <div className="bg-[#111] p-6 rounded-2xl border border-green-500/30 shadow-lg">
          <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">📈 High Intent Lead</h3>
          <p className="text-white font-medium mb-4">"The product 'Summer Collection Tshirt' is getting high attention."</p>
          <p className="text-sm text-gray-400">AI Advice: Run a promotional WhatsApp template campaign specifically for this item to close pending leads.</p>
        </div>
        
        <div className="bg-[#111] p-6 rounded-2xl border border-rose-500/30 shadow-lg">
          <h3 className="text-rose-400 font-bold mb-2 flex items-center gap-2">⚠️ Drop-off Alert</h3>
          <p className="text-white font-medium mb-4">"Customers are ignoring messages after seeing the shipping charges."</p>
          <p className="text-sm text-gray-400">AI Advice: You might want to offer 'Free Shipping' for orders above ₹999 to reduce cart abandonment.</p>
        </div>
      </div>
    </div>
  );
}