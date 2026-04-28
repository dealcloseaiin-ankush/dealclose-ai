import { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

export default function AvatarProductAds() {
  const { user } = useAuth();
  const [mode, setMode] = useState('avatar'); // 'avatar' or 'product'
  const [script, setScript] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerateLipSync = async () => {
    if (!script) return alert("Please enter a script.");
    setLoading(true);
    try {
      const { data } = await api.post('/video/generate-lipsync', {
        avatarImageUrl: "sample-avatar.png",
        script: script,
        userId: user?._id
      });
      setVideoUrl(data.url);
      alert("Avatar Lip-Sync successful! This is saved privately to your account.");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">
            Marketing Ad Studio
          </h1>
          <p className="text-gray-400 mt-2">Create Lip-sync Avatars or Product Motion Videos.</p>
        </div>
        <div className="flex bg-[#111] p-1 rounded-lg border border-gray-800">
          <button onClick={() => setMode('avatar')} className={`px-6 py-2 rounded-md font-bold transition-all ${mode === 'avatar' ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}>AI Avatar</button>
          <button onClick={() => setMode('product')} className={`px-6 py-2 rounded-md font-bold transition-all ${mode === 'product' ? 'bg-gray-800 text-white shadow' : 'text-gray-500'}`}>Product Ad</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Side: Inputs */}
        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {mode === 'avatar' ? (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">1. Select/Generate Avatar</h2>
              <div className="flex gap-4 mb-4">
                <div className="w-24 h-24 bg-gray-800 rounded-full border-2 border-green-500 flex items-center justify-center text-3xl">👨‍💼</div>
                <div className="w-24 h-24 bg-gray-900 rounded-full border border-gray-700 flex items-center justify-center text-3xl">👩‍⚕️</div>
                <div className="w-24 h-24 bg-[#0a0a0a] rounded-full border border-dashed border-gray-600 flex items-center justify-center text-sm text-gray-400 cursor-pointer">+ Promt</div>
              </div>
              
              <h2 className="text-xl font-bold">2. Enter Script (What will they say?)</h2>
              <textarea 
                value={script}
                onChange={e => setScript(e.target.value)}
                className="w-full h-32 bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-green-500 outline-none" 
                placeholder="Hi, welcome to our platform..."></textarea>
              
              <button onClick={handleGenerateLipSync} disabled={loading} className="w-full py-3 bg-green-600 hover:bg-green-500 rounded-xl font-bold text-white shadow-lg shadow-green-500/20">{loading ? 'Processing Avatar...' : 'Generate Lip-Sync Video'}</button>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xl font-bold">1. Upload Product Image</h2>
              <div className="w-full h-32 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center bg-[#0a0a0a] text-gray-400 hover:border-emerald-500 cursor-pointer">
                Click to upload shoe, perfume, etc.
              </div>

              <h2 className="text-xl font-bold">2. Describe Movement & Background</h2>
              <textarea className="w-full h-24 bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-emerald-500 outline-none" placeholder="Zoom in slowly, sunny beach background..."></textarea>
              
              <h2 className="text-xl font-bold">3. AI Voiceover Script (Optional)</h2>
              <input type="text" className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none" placeholder="Buy now at 50% off!" />

              <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20">Create Product Ad</button>
            </div>
          )}
        </div>

        {/* Right Side: Output */}
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center">
          {videoUrl ? (
            <video src={videoUrl} controls className="w-full rounded-xl border border-gray-700 shadow-xl" />
          ) : (
            <div className="text-gray-500 text-center">
               <p className="text-6xl mb-4">🎥</p>
               <p>Your generated {mode === 'avatar' ? 'Lip-Sync Avatar' : 'Product Motion Ad'} will appear here.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}