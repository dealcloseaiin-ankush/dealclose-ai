import { useState } from 'react';

export default function Automations() {
  const [activeTab, setActiveTab] = useState('pixel');

  // Mock User ID - in real app, get from useAuth()
  const USER_ID = "60d0fe4f5311236168a109ca"; 
  
  const pixelCode = `
<!-- AI Agent Universal Tracking Pixel -->
<script>
  window.AIAgent = window.AIAgent || {};
  window.AIAgent.pixelId = "${USER_ID}";
  (function() {
    var script = document.createElement('script');
    script.src = "https://your-domain.com/pixel.js";
    script.async = true;
    document.head.appendChild(script);
  })();
</script>
<!-- End AI Agent Pixel -->
  `.trim();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixelCode);
    alert("Pixel code copied to clipboard!");
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-8 bg-[#0a0a0a] text-gray-100 font-sans">
      {/* Header Section */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight mb-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
            Omnichannel Automations
          </span>
        </h1>
        <p className="text-gray-400 text-lg">
          Deploy intelligent AI retargeting across all your platforms seamlessly.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b border-gray-800 pb-px">
        {['pixel', 'shopify', 'workflows'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-2 text-sm font-semibold capitalize transition-all duration-300 ${
              activeTab === tab 
                ? 'text-purple-400 border-b-2 border-purple-400' 
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab === 'pixel' ? 'Universal Pixel' : tab === 'shopify' ? 'Shopify Webhooks' : 'Active Workflows'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Configuration Card */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'pixel' && (
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
              
              <h2 className="text-xl font-bold text-white mb-2">Custom & Mini-Website Integration</h2>
              <p className="text-gray-400 mb-6 text-sm">
                Paste this tracking pixel inside the <code className="text-pink-400 bg-pink-400/10 px-1 rounded">&lt;head&gt;</code> tag of your custom coded website, WordPress, or mini-site. It automatically captures leads and triggers AI workflows.
              </p>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur opacity-20"></div>
                <div className="relative bg-[#050505] border border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">JavaScript Pixel</span>
                    <button onClick={copyToClipboard} className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded-md transition-colors">
                      Copy Code
                    </button>
                  </div>
                  <pre className="text-sm text-green-400 overflow-x-auto p-2 font-mono">
                    {pixelCode}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shopify' && (
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">Shopify & WooCommerce</h2>
              <p className="text-gray-400 mb-6 text-sm">Connect your store to automatically rescue abandoned carts with our AI agent.</p>
              <div className="p-4 border border-dashed border-gray-700 rounded-xl bg-gray-900/50 flex flex-col items-center justify-center py-10 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-green-500/20">
                  <span className="text-3xl">🛍️</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">Connect Shopify Store</h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm">Install our private app in your Shopify admin to enable 1-click cart recovery.</p>
                <button className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                  Link Store
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Status Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-[#1a1525] to-[#111111] border border-purple-900/30 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Automation Status</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-gray-800">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></div>
                  <span className="text-sm text-gray-300">WhatsApp Engine</span>
                </div>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">Active</span>
              </div>

              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <p className="text-sm text-purple-300 font-medium">Smart AI Delay</p>
                <p className="text-xs text-purple-400/70 mt-1">If a customer drops off, the AI waits 15 minutes before sending a WhatsApp ping to ensure it feels natural.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}