import React, { useState } from 'react';
import { Bot, X, ExternalLink, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function AIGuideWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Go to Meta Developers",
      desc: "First, you need to visit the Meta Developer portal and log in with your Facebook account.",
      link: "https://developers.facebook.com/",
      actionText: "Open Meta Portal"
    },
    {
      title: "Step 2: Create a Business App",
      desc: "Click 'Create App' > Select 'Other' > 'Business', and give your app a name (e.g., CloseDeal AI).",
    },
    {
      title: "Step 3: Add WhatsApp Product",
      desc: "Scroll down to 'WhatsApp' and click 'Set up'. It will ask you to link a Meta Business Account.",
    },
    {
      title: "Step 4: Copy Your Keys",
      desc: "Go to WhatsApp > API Setup. Copy your 'Temporary Access Token' and 'Phone Number ID'.",
    },
    {
      title: "Step 5: Paste in Dashboard",
      desc: "Go to the 'Setup' page in this dashboard and paste those keys to activate your AI Agent!",
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-pink-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center justify-center animate-bounce"
      >
        <Bot size={28} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-[#111111] border border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2 font-bold">
          <Bot size={20} />
          <span>AI Setup Assistant</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded-md transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="bg-purple-500/20 text-purple-400 text-xs font-bold px-2 py-1 rounded-full border border-purple-500/30">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
        <h3 className="text-lg font-bold text-white mb-2">{steps[currentStep].title}</h3>
        <p className="text-gray-400 text-sm mb-5 leading-relaxed">{steps[currentStep].desc}</p>
        
        {steps[currentStep].link && (
          <a href={steps[currentStep].link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 px-4 rounded-lg mb-4 transition-colors">
            {steps[currentStep].actionText} <ExternalLink size={16} />
          </a>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-800">
          <button onClick={handlePrev} disabled={currentStep === 0} className="text-gray-500 hover:text-white disabled:opacity-30 text-sm font-semibold transition-colors">
            Back
          </button>
          {currentStep === steps.length - 1 ? (
            <button onClick={() => setIsOpen(false)} className="flex items-center gap-1 text-green-400 hover:text-green-300 text-sm font-bold transition-colors">
              <CheckCircle2 size={16} /> Finish
            </button>
          ) : (
            <button onClick={handleNext} className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm font-bold transition-colors">
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}