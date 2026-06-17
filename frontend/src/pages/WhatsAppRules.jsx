import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, CheckCircle, CreditCard, ShieldAlert, ArrowLeft, Calculator } from 'lucide-react';
import api from '../services/api';

export default function WhatsAppRules() {
  const [stats, setStats] = useState({ sent: 0, delivered: 0, read: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/users/settings');
        const userData = data.data || data;
        if (userData?.messageStats) setStats(userData.messageStats);
      } catch (error) {
        console.error("Failed to fetch stats", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] p-6 md:p-10 bg-[#050505] text-gray-100 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <div className="mb-8">
          <Link to="/templates" className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors w-fit mb-4 font-bold text-sm">
            <ArrowLeft size={16} /> Back to Templates
          </Link>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-2">
            Meta WhatsApp API Rules & Pricing
          </h1>
          <p className="text-gray-400">Everything you need to know about the 24-hour window, template approvals, and Meta's conversation pricing.</p>
        </div>

        <div className="space-y-8">
          
          {/* 24-Hour Rule */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="text-blue-400" /> The 24-Hour Customer Service Window
            </h2>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>Meta enforces a strict 24-hour rule to prevent spam. Here is how it works:</p>
              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li>The 24-hour timer starts <strong className="text-white">only when a customer sends a message to you.</strong></li>
                <li>Within these 24 hours, you (or your AI) can send unlimited free-form text messages, images, or files without needing any approvals.</li>
                <li>If 24 hours pass since the customer's last message, the window closes. You cannot send normal messages anymore.</li>
                <li>To contact a customer after 24 hours (or to initiate a new conversation), you <strong className="text-rose-400">must use a Meta-Approved Template.</strong></li>
              </ul>
            </div>
          </div>

          {/* Template Approvals */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl"></div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-400" /> WhatsApp Message Templates
            </h2>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>Templates are pre-approved message formats used to start a conversation or re-engage customers after 24 hours. They fall into three categories:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-emerald-400 mb-1">Marketing</h3>
                  <p className="text-xs text-gray-400">Promotions, offers, abandoned cart reminders, and newsletters.</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-blue-400 mb-1">Utility</h3>
                  <p className="text-xs text-gray-400">Order confirmations, shipping updates, and account alerts.</p>
                </div>
                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-purple-400 mb-1">Authentication</h3>
                  <p className="text-xs text-gray-400">One-Time Passwords (OTPs) and account recovery codes.</p>
                </div>
              </div>
              <p className="mt-4 text-xs text-gray-500 bg-[#1a1a1a] p-3 rounded-lg border border-gray-800">
                <strong>Note:</strong> "Interactive List Menus" (like the ones sent when a user says 'Hi') do not require approval as they are sent within the active 24-hour window.
              </p>
            </div>
          </div>

          {/* Meta Pricing */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CreditCard className="text-purple-400" /> Meta Conversation Pricing
            </h2>
            <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
              <p>Meta charges per <strong>24-hour conversation</strong>, not per message. Once a conversation is opened, you can send unlimited messages of that category within 24 hours.</p>
              
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1a1a] text-gray-400 text-xs uppercase tracking-wider border-b border-gray-700">
                      <th className="p-3">Conversation Type</th>
                      <th className="p-3">Approx. Cost (India)*</th>
                      <th className="p-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-sm">
                    <tr className="hover:bg-gray-900/50">
                      <td className="p-3 font-bold text-emerald-400">Marketing</td>
                      <td className="p-3">₹ 0.80</td>
                      <td className="p-3 text-gray-400">Initiated by business using a Marketing Template.</td>
                    </tr>
                    <tr className="hover:bg-gray-900/50">
                      <td className="p-3 font-bold text-blue-400">Utility</td>
                      <td className="p-3">₹ 0.30</td>
                      <td className="p-3 text-gray-400">Initiated by business using a Utility Template.</td>
                    </tr>
                    <tr className="hover:bg-gray-900/50">
                      <td className="p-3 font-bold text-purple-400">Authentication</td>
                      <td className="p-3">₹ 0.11</td>
                      <td className="p-3 text-gray-400">Initiated by business using an OTP Template.</td>
                    </tr>
                    <tr className="hover:bg-gray-900/50">
                      <td className="p-3 font-bold text-orange-400">Service (User-Initiated)</td>
                      <td className="p-3">₹ 0.29</td>
                      <td className="p-3 text-gray-400">Starts when you reply to a customer's message.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="flex items-start gap-2 mt-4 bg-orange-500/10 p-4 rounded-xl border border-orange-500/20">
                <ShieldAlert className="text-orange-400 shrink-0" size={20} />
                <p className="text-xs text-orange-200">
                  <strong>How Billing Works:</strong> These charges are billed directly to the credit card you attach in your <strong>Meta Business Manager</strong>. DealClose AI does not take a cut from WhatsApp messaging fees. You pay Meta directly for what you use.
                </p>
              </div>

              {/* Estimated Cost Calculator */}
              <div className="mt-8 bg-[#0a0a0a] border border-gray-700 rounded-xl p-5 shadow-inner">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Calculator className="text-emerald-400" size={20} /> Estimated Template Cost (Outgoing Only)
                </h3>
                {loading ? (
                  <p className="text-gray-500 text-sm">Calculating...</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#111] p-4 rounded-lg border border-gray-800 text-center">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Est. Outgoing Templates</p>
                      <p className="text-2xl font-bold text-white">{Math.floor(stats.sent * 0.15)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">~15% of total sent</p>
                    </div>
                    <div className="bg-[#111] p-4 rounded-lg border border-emerald-500/20 text-center">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Est. Marketing Cost</p>
                      <p className="text-2xl font-bold text-emerald-400">₹{(Math.floor(stats.sent * 0.15) * 0.80).toFixed(2)}</p>
                    </div>
                    <div className="bg-[#111] p-4 rounded-lg border border-blue-500/20 text-center">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Est. Utility Cost</p>
                      <p className="text-2xl font-bold text-blue-400">₹{(Math.floor(stats.sent * 0.15) * 0.30).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-gray-500 mt-4 text-center">
                  * Incoming messages and AI replies sent within 24-hours are FREE (Service conversations incur a small 24hr session fee). This calculator estimates costs based on assumed outbound template usage. Check Meta Business Manager for exact billing.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}