import { useState } from 'react';
import api from '../services/api';

export default function RealisticStory() {
  const [step, setStep] = useState(1);
  const [script, setScript] = useState('');
  const [images, setImages] = useState([]);
  const [finalVideo, setFinalVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleGenerateImage = async () => {
    setLoading(true);
    try {
      // Sends request to our backend library/fal.ai route
      const { data } = await api.post('/video/generate-image', { 
        prompt: script || "Dark night mysterious scene", 
        style: "realistic" 
      });
      setImages([...images, data.url]);
      if (data.isReused) {
        alert("Cost Saved: Pulled from Public Library!");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimate = async () => {
    if (images.length === 0) return alert("Please generate an image first!");
    setStep(4);
    setLoading(true);
    try {
      const { data } = await api.post('/video/animate-image', { 
        imageUrl: images[0], 
        prompt: "Cinematic pan" 
      });
      setFinalVideo(data.url);
      setStep(5);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">
          Realistic Story Creator
        </h1>
        <p className="text-gray-400 mt-2">Pipeline: Script ➔ Character Voices ➔ Scene Images ➔ Animate ➔ Compile</p>
      </div>

      {/* Stepper UI */}
      <div className="flex gap-2 mb-8">
        {['Write Script', 'Voices', 'Images', 'Animate', 'Final Video'].map((name, i) => (
          <div key={i} className={`flex-1 h-2 rounded-full ${step > i ? 'bg-purple-600' : 'bg-gray-800'}`}></div>
        ))}
      </div>

      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl min-h-[500px]">
        
        {/* Step 1: Script */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold">1. Write your Story</h2>
            <textarea 
              className="w-full h-64 bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-purple-500 outline-none"
              placeholder="E.g. [Character: Rahul] It was a dark night... [Character: Aman] Who is there?"
              value={script}
              onChange={(e) => setScript(e.target.value)}
            ></textarea>
          </div>
        )}

        {/* Step 2: Voices */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">2. Assign Voices</h2>
            <p className="text-gray-400">We detected 2 characters in your script.</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border border-gray-700 rounded-xl bg-[#0a0a0a]">
                <h3 className="font-bold text-blue-400">Rahul</h3>
                <select className="w-full mt-2 bg-gray-900 border border-gray-700 p-2 rounded text-white">
                  <option>Deep Male Voice (English)</option>
                  <option>Young Male (Hindi)</option>
                </select>
                <button className="mt-3 text-sm bg-gray-800 px-3 py-1 rounded hover:bg-gray-700">▶ Preview Voice</button>
              </div>
              <div className="p-4 border border-gray-700 rounded-xl bg-[#0a0a0a]">
                <h3 className="font-bold text-pink-400">Aman</h3>
                <select className="w-full mt-2 bg-gray-900 border border-gray-700 p-2 rounded text-white">
                  <option>Young Male (Hindi)</option>
                  <option>Deep Male Voice (English)</option>
                </select>
                <button className="mt-3 text-sm bg-gray-800 px-3 py-1 rounded hover:bg-gray-700">▶ Preview Voice</button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Images */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold">3. Generate Scene Images</h2>
            <div className="grid grid-cols-2 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="p-2 border border-gray-700 rounded-xl bg-black">
                  <img src={img} alt={`Scene ${idx}`} className="rounded-lg mb-2 w-full object-cover h-32" />
                </div>
              ))}
              <button onClick={handleGenerateImage} disabled={loading} className="flex items-center justify-center h-36 border border-dashed border-gray-600 rounded-xl bg-[#0a0a0a] cursor-pointer hover:bg-gray-900">
                <p className="text-purple-500 font-bold">{loading ? 'Generating...' : '+ Generate Scene'}</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 4 & 5: Animate & Compile */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center h-64 animate-fade-in text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-2xl font-bold">Converting Images to Motion...</h2>
            <p className="text-gray-400 mt-2">Adding AI movement to your scenes.</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-2xl font-bold text-green-400">Final Compilation Ready!</h2>
            <div className="w-full bg-black rounded-xl overflow-hidden aspect-video flex items-center justify-center border border-gray-800">
               {finalVideo ? <video src={finalVideo} controls className="w-full h-full" /> : <p className="text-gray-600">Video Player</p>}
            </div>
            <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl">Download Video</button>
          </div>
        )}

      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button onClick={prevStep} disabled={step === 1} className="px-6 py-2 bg-gray-800 text-white font-semibold rounded-lg disabled:opacity-50">
          Back
        </button>
        {step === 3 ? (
          <button onClick={handleAnimate} disabled={loading || images.length === 0} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg disabled:opacity-50">
            {loading ? 'Animating...' : 'Animate to Video'}
          </button>
        ) : (
          <button onClick={nextStep} disabled={step === 5} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg disabled:opacity-50">
            {step === 4 ? 'Compile Final Video' : 'Next Step'}
          </button>
        )}
      </div>

    </div>
  );
}