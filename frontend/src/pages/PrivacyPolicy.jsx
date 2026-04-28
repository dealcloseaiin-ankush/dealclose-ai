import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="p-8 md:p-16 bg-[#030303] text-gray-300 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto bg-[#111111] p-8 rounded-3xl border border-gray-800 shadow-2xl">
        <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm font-bold mb-6 inline-block">← Back to Home</Link>
        
        <h1 className="text-4xl font-extrabold text-white mb-6">Privacy Policy</h1>
        <p className="mb-4">Last Updated: {new Date().toLocaleDateString()}</p>
        
        <div className="space-y-6 text-sm md:text-base leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-white mb-3">1. Introduction</h2>
            <p>Welcome to DealClose AI. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and share information when you use our SaaS platform, AI Agents, and Meta/WhatsApp API integrations.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">2. Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Name, email, phone number, and billing details when you register.</li>
              <li><strong>Integration Data:</strong> API keys, Meta Business IDs, and Webhook data required to operate the WhatsApp/Instagram services on your behalf.</li>
              <li><strong>Customer Data:</strong> Phone numbers and chat logs processed by our AI strictly for generating automated responses for your business.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">3. How We Use Your Data</h2>
            <p>We use the data exclusively to provide our services, including processing AI responses, recovering abandoned carts, and facilitating voice calls. We do not sell your data or your customers' data to third parties.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">4. Third-Party Services (Meta/WhatsApp API)</h2>
            <p>Our platform integrates with Meta Platforms, Inc. By using our WhatsApp/Instagram automation, you also agree to Meta's Privacy Policy. We only access messages sent to your registered Business accounts to provide AI replies.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">5. Data Deletion & Security</h2>
            <p>You can request the deletion of your account and associated data at any time by contacting support. We use industry-standard encryption to protect your API keys and customer communications.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-3">6. Contact Us</h2>
            <p>If you have any questions regarding this Privacy Policy, please contact us at <a href="mailto:dealcloseai.in@gmail.com" className="text-purple-400">dealcloseai.in@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}