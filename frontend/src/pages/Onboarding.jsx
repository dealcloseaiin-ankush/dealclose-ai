import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

export default function Onboarding() {
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    whatsappToken: '', phoneNumberId: '', wabaId: '',
    businessName: '', businessDesc: ''
  });

  const handleNext = () => setStep(s => Math.min(s + 1, 4));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFinish = () => {
    alert("Setup Complete! Saving to Database...");
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome to DealClose AI ⚡</h1>
          <p className="text-gray-400">Let's set up your AI Agent in 4 simple steps.</p>
        </div>

        {/* Stepper Progress */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={`flex-1 h-2 rounded-full transition-all ${step >= i ? 'bg-purple-600' : 'bg-gray-800'}`}></div>
          ))}
        </div>

        <Card className="p-8">
          {step === 1 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">1. Business Profile</h2>
              <input type="text" name="businessName" placeholder="Business Name" value={formData.businessName} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-purple-500" />
              <textarea rows="3" name="businessDesc" placeholder="What do you sell? (e.g. I run a shoe store...)" value={formData.businessDesc} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-purple-500"></textarea>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in space-y-4">
              <h2 className="text-2xl font-bold text-white mb-4">2. Meta API Keys</h2>
              <p className="text-sm text-gray-400 mb-4">Enter your WhatsApp Business API credentials from the Meta Developer Dashboard.</p>
              <input type="text" name="whatsappToken" placeholder="Access Token (EAAL...)" value={formData.whatsappToken} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-purple-500" />
              <input type="text" name="phoneNumberId" placeholder="Phone Number ID" value={formData.phoneNumberId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-purple-500" />
              <input type="text" name="wabaId" placeholder="WhatsApp Business Account ID" value={formData.wabaId} onChange={handleChange} className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-purple-500" />
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in text-center py-8">
              <p className="text-6xl mb-4">🧠</p>
              <h2 className="text-2xl font-bold text-white mb-2">AI is reading your profile</h2>
              <p className="text-gray-400">Our system is creating an automated knowledge base for your chatbot...</p>
              <div className="mt-6 w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade-in text-center py-8">
              <p className="text-6xl mb-4">✅</p>
              <h2 className="text-2xl font-bold text-green-400 mb-2">You are ready!</h2>
              <p className="text-gray-400 mb-6">Your WhatsApp number is now powered by AI. You can test it by sending a message.</p>
              <Button onClick={handleFinish} variant="gradient" size="lg" className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          <div className="flex justify-between mt-8 border-t border-gray-800 pt-6">
            {step > 1 && step < 4 && (
              <Button variant="ghost" onClick={handlePrev}>Back</Button>
            )}
            <div className="flex-1"></div>
            {step < 3 && (
              <Button variant="primary" onClick={handleNext}>Next Step</Button>
            )}
            {step === 3 && (
              <Button variant="primary" onClick={handleNext}>Complete AI Training</Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}