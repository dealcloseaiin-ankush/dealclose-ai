import React from 'react';
import Navbar from '../components/Navbar';
import PricingSection from '../components/PricingSection';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <Navbar />
      
      {/* New Pricing Section */}
      <div className="flex-1">
        <PricingSection />
      </div>
    </div>
  );
}