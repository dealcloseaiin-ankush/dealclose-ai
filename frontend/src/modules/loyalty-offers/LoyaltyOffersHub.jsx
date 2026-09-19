import React, { useState } from 'react';
import { Star, Ticket, CheckSquare, Sparkles, Gift, Send } from 'lucide-react';
import StampCardManager from './components/StampCardManager';
import CouponGenerator from './components/CouponGenerator';
import CouponRedeemDesk from './components/CouponRedeemDesk';
import PassDispatchDesk from './components/PassDispatchDesk';

export default function LoyaltyOffersHub() {
  const [activeTab, setActiveTab] = useState('stamps');

  const tabs = [
    {
      id: 'stamps',
      label: 'विजिट स्टैम्प कार्ड्स',
      icon: Star,
      badge: '3/5/7 Visits'
    },
    {
      id: 'dispatch',
      label: '📲 पास डिस्पैच डेस्क',
      icon: Send,
      badge: '1-Click WhatsApp'
    },
    {
      id: 'coupons',
      label: 'यूनिक कूपन जनरेटर',
      icon: Ticket,
      badge: 'Single-Use'
    },
    {
      id: 'redeem',
      label: 'कूपन रिडीम डेस्क',
      icon: CheckSquare,
      badge: 'Counter Tool'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Main Navigation Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
                <span>लॉयल्टी व ऑफर्स हब</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Module 1
                </span>
              </h1>
              <p className="text-xs text-gray-500">
                स्टैम्प कार्ड्स और यूनिक कूपन्स — चाहे अलग इस्तेमाल करें या एक साथ! बिना बिलिंग ऐप के भी 100% उपयोगी।
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Contents */}
      <div className="transition-all">
        {activeTab === 'stamps' && <StampCardManager />}
        {activeTab === 'dispatch' && <PassDispatchDesk />}
        {activeTab === 'coupons' && <CouponGenerator />}
        {activeTab === 'redeem' && <CouponRedeemDesk />}
      </div>
    </div>
  );
}
