import { useState } from 'react';

export default function TwoDAnimation() {
  const [step, setStep] = useState(1);

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">
          2D Animation Studio
        </h1>
        <p className="text-gray-400 mt-2">Generate cartoon/anime style stories step-by-step.</p>
      </div>

      <div className="flex gap-2 mb-8">
        {['Story', 'Cartoon Voices', '2D Assets', 'Animate'].map((name, i) => (
          <div key={i} className={`flex-1 h-2 rounded-full ${step > i ? 'bg-orange-500' : 'bg-gray-800'}`}></div>
        ))}
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl min-h-[500px]">
        
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Cartoon Story Prompt</h2>
            <textarea className="w-full h-64 bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-orange-500 outline-none" placeholder="A brave little fox goes on an adventure..."></textarea>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Pick Animated Voices</h2>
            <div className="flex gap-4">
              <button className="flex-1 p-4 border border-orange-500/50 bg-orange-500/10 rounded-xl text-orange-400 font-bold">Fox (Squeaky Voice)</button>
              <button className="flex-1 p-4 border border-gray-700 bg-[#0a0a0a] rounded-xl hover:bg-gray-900">Narrator (Calm)</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">2D Artwork Generation</h2>
            <div className="p-6 border border-dashed border-gray-600 rounded-xl bg-[#0a0a0a] text-center">
              <p className="text-orange-500 mb-2">Generating Vector Art in Studio Ghibli Style...</p>
              <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 w-1/2 h-full"></div>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 text-center">
            <h2 className="text-2xl font-bold text-green-400">2D Animation Compiled!</h2>
            <div className="w-full max-w-2xl mx-auto bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
               <p className="text-gray-600 text-6xl">🦊</p>
            </div>
          </div>
        )}

      </div>

      <div className="flex justify-between mt-6">
        <button onClick={() => setStep(s => Math.max(s - 1, 1))} className="px-6 py-2 bg-gray-800 rounded-lg">Back</button>
        <button onClick={() => setStep(s => Math.min(s + 1, 4))} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg font-bold">
          {step === 4 ? 'Download' : 'Next Step'}
        </button>
      </div>
    </div>
  );
}