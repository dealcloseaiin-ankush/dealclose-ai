import React, { useState } from 'react';
import { Smartphone, Users, Receipt, ShieldCheck } from 'lucide-react';
import MobileBillingCounter from './components/MobileBillingCounter';
import CreditLimitParties from './components/CreditLimitParties';
import UdharBillsHistory from './components/UdharBillsHistory';

export default function BillingUdharHub() {
  const [activeTab, setActiveTab] = useState('billing');

  const tabs = [
    {
      id: 'billing',
      label: 'मोबाइल बिलिंग काउंटर',
      icon: Smartphone,
      badge: 'Touch POS'
    },
    {
      id: 'parties',
      label: 'क्रेडिट लिमिट व पार्टी खाता',
      icon: Users,
      badge: 'Credit Hub'
    },
    {
      id: 'bills',
      label: 'उधार बिल्स व डिलीवरी OTP',
      icon: Receipt,
      badge: 'Gatekeeper'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <span>स्मार्ट मोबाइल बिलिंग व उधार सूट</span>
              <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                Module 2
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              फास्ट मोबाइल-फ्रेंडली बिलिंग, क्रेडिट लिमिट मैंडेट, 5-पॉइंट स्टेटमेंट और डिलीवरी OTP लॉक
            </p>
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
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                    isActive ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tab View */}
      <div className="transition-all">
        {activeTab === 'billing' && <MobileBillingCounter />}
        {activeTab === 'parties' && <CreditLimitParties />}
        {activeTab === 'bills' && <UdharBillsHistory />}
      </div>
    </div>
  );
}
