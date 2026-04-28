import React, { useState } from 'react';

export default function InstagramAutomation() {
  const [activeTab, setActiveTab] = useState('general'); // 'general' or 'posts'

  // Mock Data for Analytics
  const stats = {
    totalCommentsAnalyzed: 1240,
    leadsExtracted: 85, // Phone numbers found silently
    dmsSent: 320,
    whatsappConversationsStarted: 42,
    conversionRate: '34%' // Leads to WhatsApp conversion
  };

  // Mock Data for Config
  const [config, setConfig] = useState({
    aiSmartReply: true,
    autoDmOnComment: true,
    extractPhoneNumbers: true,
    forceWhatsappRedirect: true
  });

  // Mock Data for IG Leads
  const [igLeads] = useState([
    { id: 1, handle: '@sneaker_head99', trigger: 'Comment: "Price for size 9?"', intent: 'High', action: 'Sent DM with WA Link', status: 'Pending in DM' },
    { id: 2, handle: '@rahul_sharma', trigger: 'Comment: "Call me 98765XXXXX"', intent: 'High', action: 'Direct WA Message Sent', status: 'Converted to WA' },
    { id: 3, handle: '@priya_style', trigger: 'DM: "Do you have this in red?"', intent: 'Medium', action: 'AI Replied in DM', status: 'Chatting' },
    { id: 4, handle: '@random_bot', trigger: 'Comment: "🔥🔥🔥"', intent: 'Low', action: 'Ignored', status: 'Dropped' }
  ]);

  // Mock Data for Post-Specific Customization (E-commerce Focus)
  const [recentPosts, setRecentPosts] = useState([
    { 
      id: 'ig_post_1', image: '👟', type: 'Reel', caption: 'New Nike Air Max Drop!', 
      botMode: 'chatbot', // 'chatbot', 'hybrid', or 'off'
      chatBotKeyword: 'LINK',
      chatBotReply: 'Hey! Here is the link to buy Nike Air Max: vyaparindia.online/nike',
      aiContext: 'Nike Air Max, Price Rs 4500, Link: vyaparindia.online/nike', 
      stats: { totalComments: 130, chatBotReplied: 100, aiCaught: 0, pending: 30 } 
    },
    { 
      id: 'ig_post_2', image: '👕', type: 'Post', caption: 'Summer Collection T-Shirts', 
      botMode: 'chatbot', 
      chatBotKeyword: 'PRICE',
      chatBotReply: 'The price is Rs 999. Buy here: vyaparindia.online/tshirt',
      aiContext: 'Cotton T-Shirt, Rs 999, Link: vyaparindia.online/tshirt', 
      stats: { totalComments: 80, chatBotReplied: 45, aiCaught: 0, pending: 35 } 
    },
    { 
      id: 'ig_post_3', image: '⌚', type: 'Reel', caption: 'Smartwatch Sale', 
      botMode: 'off',
      chatBotKeyword: '',
      chatBotReply: '',
      aiContext: '', 
      stats: { totalComments: 12, chatBotReplied: 0, aiCaught: 0, pending: 12 } 
    }
  ]);

  // Mock Data for Smart Grouping (Unhandled Comments)
  const [commentGroups, setCommentGroups] = useState([
    { id: 1, theme: "Asking for Price / Cost", count: 20, samples: ["Price please", "Kitne ka hai?", "How much?", "Cost?"], replyText: "" },
    { id: 2, theme: "Delivery Time / Shipping", count: 4, samples: ["Delivery kitne din me hogi?", "How many days to deliver?"], replyText: "" },
    { id: 3, theme: "Product Availability / Stock", count: 3, samples: ["Out of stock kyu dikha raha hai?", "Size M hai?"], replyText: "" },
    { id: 4, theme: "Unclear / Random Comments", count: 3, samples: ["Wow", "Nice pic", "🔥🔥🔥"], replyText: "" }
  ]);

  const handleReplyChange = (id, text) => {
    setCommentGroups(groups => groups.map(g => g.id === id ? { ...g, replyText: text } : g));
  };

  const sendBulkReply = (id, count) => {
    alert(`Successfully sent Bulk AI Reply to ${count} users via Instagram API! 🚀`);
  };

  const generateAIReply = (id, theme) => {
    let aiGenerated = "";
    // Generating polite, public-friendly Instagram comments
    if (theme.includes("Price")) aiGenerated = "Hi! Thanks for asking. The price is ₹999. You can order directly via our link in bio! 🛍️";
    if (theme.includes("Delivery")) aiGenerated = "Hello! We deliver pan-India within 3-5 working days. 🚚";
    if (theme.includes("Unclear")) aiGenerated = "Thank you for the love! ❤️";
    handleReplyChange(id, aiGenerated);
  };

  const handleToggle = (key) => {
    setConfig({ ...config, [key]: !config[key] });
  };

  const updatePostMode = (id, newMode) => {
    setRecentPosts(posts => posts.map(p => p.id === id ? { ...p, botMode: newMode } : p));
  };

  const processPendingWithAI = (id) => {
    alert("Processing pending comments with AI... AI will automatically read context and send DMs.");
    setRecentPosts(posts => posts.map(p => 
      p.id === id ? { ...p, botMode: 'hybrid', stats: { ...p.stats, aiCaught: p.stats.pending, pending: 0 } } : p
    ));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 bg-[#020202] text-gray-100 font-sans">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
          Instagram AI Funnel
        </h1>
        <p className="text-gray-400">Manage your Instagram automations and see how AI is converting comments into WhatsApp leads.</p>
      </div>

      {/* 1. Analytics Section (The "Value" Prover) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-[#111111] border border-gray-800 p-5 rounded-2xl shadow-lg">
          <p className="text-gray-500 text-sm font-semibold uppercase tracking-wide">Comments Analyzed</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.totalCommentsAnalyzed}</p>
        </div>
        <div className="bg-[#111111] border border-pink-500/30 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-pink-500/10 rounded-bl-full"></div>
          <p className="text-pink-400 text-sm font-semibold uppercase tracking-wide">Hidden Leads Found</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.leadsExtracted}</p>
          <p className="text-xs text-gray-400 mt-1">Numbers extracted from comments</p>
        </div>
        <div className="bg-[#111111] border border-green-500/30 p-5 rounded-2xl shadow-lg">
          <p className="text-green-400 text-sm font-semibold uppercase tracking-wide">WA Chats Started</p>
          <p className="text-3xl font-bold text-white mt-2">{stats.whatsappConversationsStarted}</p>
          <p className="text-xs text-gray-400 mt-1">Users moved from IG to WA</p>
        </div>
        <div className="bg-gradient-to-br from-pink-600 to-purple-700 p-5 rounded-2xl shadow-lg text-white">
          <p className="text-white/80 text-sm font-semibold uppercase tracking-wide">IG to WA Conversion</p>
          <p className="text-4xl font-extrabold mt-1">{stats.conversionRate}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-px">
        <button onClick={() => setActiveTab('general')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'general' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          General Rules & Live Activity
        </button>
        <button onClick={() => setActiveTab('posts')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'posts' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          Per-Post Customization (E-commerce)
        </button>
        <button onClick={() => setActiveTab('smart-groups')} className={`pb-3 px-2 font-semibold transition-all duration-300 ${activeTab === 'smart-groups' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>
          Smart Comment Grouping
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. Automation Settings */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Global AI Rules</h2>
              
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">AI Smart Reply</p>
                    <p className="text-xs text-gray-500">AI reads context instead of generic replies</p>
                  </div>
                  <button onClick={() => handleToggle('aiSmartReply')} className={`w-12 h-6 rounded-full transition-colors relative ${config.aiSmartReply ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.aiSmartReply ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200">Auto-DM on Comments</p>
                    <p className="text-xs text-gray-500">Send catalog/link to commentors</p>
                  </div>
                  <button onClick={() => handleToggle('autoDmOnComment')} className={`w-12 h-6 rounded-full transition-colors relative ${config.autoDmOnComment ? 'bg-purple-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.autoDmOnComment ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-200 text-pink-400">Silent Lead Extractor</p>
                    <p className="text-xs text-gray-500">Auto-save phone numbers to CRM</p>
                  </div>
                  <button onClick={() => handleToggle('extractPhoneNumbers')} className={`w-12 h-6 rounded-full transition-colors relative ${config.extractPhoneNumbers ? 'bg-pink-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.extractPhoneNumbers ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between border-t border-gray-800 pt-4 mt-2">
                  <div>
                    <p className="font-bold text-green-400">Force WhatsApp Funnel</p>
                    <p className="text-xs text-gray-500">Always try to move users to WhatsApp</p>
                  </div>
                  <button onClick={() => handleToggle('forceWhatsappRedirect')} className={`w-12 h-6 rounded-full transition-colors relative ${config.forceWhatsappRedirect ? 'bg-green-600' : 'bg-gray-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${config.forceWhatsappRedirect ? 'translate-x-7' : 'translate-x-1'}`}></div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. IG Leads Tracker */}
          <div className="lg:col-span-2">
            <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-5 border-b border-gray-800 bg-[#1a1a1a]">
                <h2 className="text-lg font-semibold text-white">Live IG Activity & Conversions</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-[#0a0a0a] text-gray-400 text-sm tracking-wider">
                      <th className="p-4 font-semibold">IG Handle</th>
                      <th className="p-4 font-semibold">User Action</th>
                      <th className="p-4 font-semibold">AI Intent</th>
                      <th className="p-4 font-semibold">AI Response</th>
                      <th className="p-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    {igLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-900/50 transition-colors">
                        <td className="p-4 font-medium text-pink-400">{lead.handle}</td>
                        <td className="p-4 text-gray-300 truncate max-w-[200px]">{lead.trigger}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${lead.intent === 'High' ? 'bg-green-500/20 text-green-400' : lead.intent === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>{lead.intent}</span>
                        </td>
                        <td className="p-4 text-gray-400">{lead.action}</td>
                        <td className="p-4 font-semibold text-white">{lead.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'posts' && (
        <div className="bg-[#111111] border border-gray-800 rounded-2xl shadow-lg p-6">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Per-Post Bot Configuration</h2>
              <p className="text-gray-400 text-sm">First, the Chat Bot replies to exact keywords. Then, the AI Smart Chat Bot handles all remaining/complex comments!</p>
            </div>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold rounded-lg transition-colors">🔄 Sync Recent Posts</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {recentPosts.map(post => (
              <div key={post.id} className={`border ${post.botMode === 'hybrid' ? 'border-purple-500/50 bg-[#1a1525]' : post.botMode === 'chatbot' ? 'border-blue-500/50 bg-[#151a25]' : 'border-gray-800 bg-[#0a0a0a]'} rounded-xl p-5 relative transition-all`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center text-3xl shadow-inner">{post.image}</div>
                  <div>
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">{post.type}</span>
                    <p className="text-sm text-gray-300 line-clamp-2 mt-1 font-medium">{post.caption}</p>
                    
                    {/* Performance Stats highlighting AI Value */}
                    <div className="mt-2 text-xs font-bold space-y-1">
                      <div className="flex gap-2">
                        <span className="text-gray-400 bg-gray-800 px-2 py-1 rounded">Total: {post.stats.totalComments}</span>
                        <span className="text-blue-400 bg-blue-400/10 px-2 py-1 rounded">Chat Bot: {post.stats.chatBotReplied}</span>
                      </div>
                      
                      {post.stats.pending > 0 && (
                        <div className="text-rose-400 bg-rose-400/10 px-2 py-1 rounded inline-block">
                          ⚠️ Missed/Pending: {post.stats.pending} 
                        </div>
                      )}
                      {post.stats.aiCaught > 0 && (
                        <div className="text-purple-400 bg-purple-400/10 px-2 py-1 rounded inline-block flex items-center gap-1">
                          ✨ AI Caught & Replied: {post.stats.aiCaught}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4 border-t border-gray-800 pt-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-gray-400 uppercase">Automation Mode</label>
                    <select 
                      value={post.botMode} 
                      onChange={(e) => updatePostMode(post.id, e.target.value)}
                      className="bg-gray-900 border border-gray-700 text-white text-xs font-bold rounded p-1 outline-none"
                    >
                      <option value="off">Off</option>
                      <option value="chatbot">Chat Bot Only (Basic)</option>
                      <option value="hybrid">Chat Bot + AI Smart Chat Bot (Pro)</option>
                    </select>
                  </div>

                  {(post.botMode === 'chatbot' || post.botMode === 'hybrid') && (
                    <div className="space-y-3 animate-fade-in bg-blue-900/10 p-3 rounded-lg border border-blue-500/20">
                      <div>
                        <label className="block text-xs text-blue-400 mb-1">Exact Keyword Trigger</label>
                        <input type="text" className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="e.g. LINK" defaultValue={post.chatBotKeyword} />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-400 mb-1">Static DM Reply</label>
                        <textarea rows="2" className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-blue-500 outline-none" placeholder="Static reply message..." defaultValue={post.chatBotReply} />
                      </div>
                      <p className="text-[10px] text-gray-500">Fast & Free: Replies instantly if comment exactly matches the keyword.</p>
                      
                      {/* The UPSELL Button */}
                      {post.botMode === 'chatbot' && post.stats.pending > 0 && (
                        <button onClick={() => processPendingWithAI(post.id)} className="w-full mt-2 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold rounded-lg transition-all shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                          Process remaining {post.stats.pending} comments with AI Smart Chat Bot ⚡
                        </button>
                      )}
                    </div>
                  )}

                  {post.botMode === 'hybrid' && (
                    <div className="space-y-3 animate-fade-in bg-purple-900/10 p-3 rounded-lg border border-purple-500/20 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-lg">✨</span>
                         <label className="block text-xs font-bold text-purple-400">AI Smart Chat Bot Instructions</label>
                      </div>
                      <textarea 
                        rows="2" 
                        className="w-full bg-black border border-gray-700 rounded-md p-2 text-sm text-white focus:border-purple-500 outline-none" 
                        placeholder="e.g. This is a red dress, price 500. Send link: vyapar.in/red"
                        defaultValue={post.aiContext}
                      />
                      <p className="text-[10px] text-gray-500">AI automatically handles spelling mistakes, questions, and any pending comments missed by the basic Chat Bot!</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'smart-groups' && (
        <div className="space-y-6">
          <div className="bg-[#111111] border border-gray-800 p-6 rounded-2xl shadow-lg mb-6">
             <h2 className="text-xl font-bold text-white mb-2">Unanswered Comments (AI Clustered)</h2>
             <p className="text-gray-400 text-sm">30 comments were not understood by basic bots. AI has grouped them by intent so you can bulk-reply.</p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {commentGroups.map((group) => (
              <div key={group.id} className="bg-[#111111] border border-gray-800 rounded-2xl p-6 shadow-lg flex flex-col md:flex-row gap-6">
                
                {/* Left Side: Group Info */}
                <div className="md:w-1/3 border-r border-gray-800 pr-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-3 py-1 rounded-full border border-purple-500/30">
                      {group.count} Comments
                    </span>
                    <h3 className="font-bold text-white">{group.theme}</h3>
                  </div>
                  <div className="text-sm text-gray-400 space-y-2 mt-3">
                    <p className="font-semibold text-gray-300">Samples from users:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {group.samples.map((sample, idx) => (
                        <li key={idx} className="italic">"{sample}"</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Right Side: Action & Reply */}
                <div className="md:w-2/3 flex flex-col justify-between">
                  <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Set Bulk Reply for this Group:</label>
                    <textarea className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-sm text-white focus:border-purple-500 outline-none" rows="3" placeholder="Type your reply here or draft with AI..." value={group.replyText} onChange={(e) => handleReplyChange(group.id, e.target.value)}></textarea>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => generateAIReply(group.id, group.theme)} className="flex items-center gap-2 text-sm text-purple-400 hover:bg-purple-500/10 px-4 py-2 rounded-lg font-bold border border-purple-500/30 transition-colors">
                      ✨ Draft with AI
                    </button>
                    <button onClick={() => sendBulkReply(group.id, group.count)} disabled={!group.replyText} className="flex items-center gap-2 text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-6 py-2 rounded-lg font-bold disabled:opacity-50 transition-all">
                      🚀 Send to {group.count} Users
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}