import React, { useState } from 'react';
import { Code, CheckCircle, Copy } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Automations() {
  const { user } = useAuth() || { user: { _id: 'YOUR_WORKSPACE_ID' } };
  const [copied, setCopied] = useState(false);

  const trackingCode = `<!-- DealClose AI Universal Tracker -->
<script>
  !function(e,t,n,a){var c=e.DealCloseTracker=e.DealCloseTracker||[];
  c.init=function(e){c.apiKey=e};var r=t.createElement(n),
  s=t.getElementsByTagName(n)[0];r.async=1,r.src="https://yourwebsite.com/api/pixel.js",
  s.parentNode.insertBefore(r,s)}(window,document,"script");
  
  DealCloseTracker.init("${user?._id || 'YOUR_WORKSPACE_ID'}");
  DealCloseTracker.track("page_view");
</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-[calc(100vh-4rem)] text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 mb-2">Automations & Integrations</h1>
        <p className="text-gray-400">Install the tracking pixel on your website to start recovering abandoned carts and tracking visitors.</p>
      </div>

      <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl shadow-xl max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Code size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-white">Universal Tracking Pixel</h2>
            <p className="text-sm text-gray-400">Paste this code inside the <code className="text-pink-400 bg-gray-900 px-1 rounded">&lt;head&gt;</code> tag of your website.</p>
          </div>
        </div>

        <div className="relative group">
          <pre className="bg-[#0a0a0a] border border-gray-700 p-6 rounded-xl overflow-x-auto text-sm text-gray-300 font-mono shadow-inner">
            <code>{trackingCode}</code>
          </pre>
          <button 
            onClick={handleCopy}
            className="absolute top-4 right-4 bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-semibold border border-gray-600"
          >
            {copied ? <><CheckCircle size={16} className="text-green-400"/> Copied!</> : <><Copy size={16} /> Copy Code</>}
          </button>
        </div>

        <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-sm text-emerald-400 font-medium">
          ✅ Status: Ready to track! Your unique tracking ID is already inserted.
        </div>
      </div>
    </div>
  );
}