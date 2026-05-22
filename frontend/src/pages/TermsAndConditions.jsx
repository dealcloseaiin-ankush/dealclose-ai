import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsAndConditions() {
  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-[#111111] p-8 rounded-3xl border border-gray-800 shadow-2xl">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl font-extrabold text-white mb-6">Terms & Conditions</h1>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using DealClose AI ("the Platform"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use our service.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Service Description</h2>
            <p>DealClose AI provides an omnichannel AI automation platform including WhatsApp, Instagram, and Voice Call agents. We act as a tech provider facilitating communication between your business and your customers.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. Meta/WhatsApp Compliance</h2>
            <p>Users must strictly adhere to the WhatsApp Business Commerce Policy. You agree not to use our platform to send spam, unsolicited promotional messages, or prohibited content. Violation of Meta's policies will result in immediate account termination.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Subscription and Payments</h2>
            <p>Our services are billed on a subscription basis. All payments are non-refundable unless stated otherwise. We reserve the right to change our pricing with prior notice.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Limitation of Liability</h2>
            <p>DealClose AI shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our platform or APIs.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Account Termination</h2>
            <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms & Conditions or is harmful to other users of the platform, us, or third parties.</p>
          </section>
        </div>
      </div>
    </div>
  );
}