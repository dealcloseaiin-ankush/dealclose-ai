import { useState } from 'react';
import CanvasEditor from './CanvasEditor';
import ProductUploader from './ProductUploader';
import TemplateSelector from './TemplateSelector';
import ExportPanel from './ExportPanel';
import BackgroundPicker from '../../components/BackgroundPicker';
import LayerControls from '../../components/LayerControls';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function AdStudio() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'fashion'
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [productImage, setProductImage] = useState(null);
  
  // Fashion AI States
  const [selectedGender, setSelectedGender] = useState('female'); // 'male' or 'female'
  const [selectedPose, setSelectedPose] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [voiceoverText, setVoiceoverText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [finalVideo, setFinalVideo] = useState(null);

  const poses = {
    female: [
      { id: 'f1', name: 'Standing Casual', img: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=200&auto=format&fit=crop' },
      { id: 'f2', name: 'Walking Street', img: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=200&auto=format&fit=crop' },
      { id: 'f3', name: 'Sitting Cafe', img: 'https://images.unsplash.com/photo-1550614000-4b9519e02d48?q=80&w=200&auto=format&fit=crop' },
      { id: 'f4', name: 'Studio Portrait', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop' },
      { id: 'f5', name: 'Mannequin Pose', img: 'https://images.unsplash.com/photo-1529139574466-a302d2052574?q=80&w=200&auto=format&fit=crop' },
      { id: 'f6', name: 'Action/Running', img: 'https://images.unsplash.com/photo-1518331647614-7a1f04cd34cf?q=80&w=200&auto=format&fit=crop' },
      { id: 'f7', name: 'Back View', img: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?q=80&w=200&auto=format&fit=crop' },
    ],
    male: [
      { id: 'm1', name: 'Standing Formal', img: 'https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?q=80&w=200&auto=format&fit=crop' },
      { id: 'm2', name: 'Walking Cool', img: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=200&auto=format&fit=crop' },
      { id: 'm3', name: 'Sitting Relaxed', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop' },
      { id: 'm4', name: 'Studio Look', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&auto=format&fit=crop' },
      { id: 'm5', name: 'Mannequin Style', img: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?q=80&w=200&auto=format&fit=crop' },
      { id: 'm6', name: 'Athletic/Gym', img: 'https://images.unsplash.com/photo-1480455624313-e29b44bbfde1?q=80&w=200&auto=format&fit=crop' },
      { id: 'm7', name: 'Side Profile', img: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=200&auto=format&fit=crop' },
    ]
  };

  const handleGenerateFashion = async () => {
    if (!selectedPose || !productImage) return alert("Please select a model, pose and upload a product");
    setGenerating(true);
    try {
      const { data } = await api.post('/ads/fashion-generate', { 
        poseId: selectedPose.id, 
        productImageUrl: productImage,
        gender: selectedGender,
        userId: user?._id
      });
      setGeneratedImage(data.url);
      alert("✨ Fashion Image Generated! ₹20 deducted from your wallet.");
    } catch (e) {
      console.error(e);
      if (e.response?.status === 402) {
        alert("Insufficient Wallet Balance! Please recharge your wallet first.");
      } else {
        alert("Failed to generate image");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateVideo = async () => {
    if (!generatedImage) return;
    setGenerating(true);
    try {
      const { data } = await api.post('/video/from-image', { imageUrl: generatedImage, voiceoverText });
      setFinalVideo(data.url);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Creative Studio</h1>
            <p className="text-gray-500">Design ads, generate fashion shoots, and create videos.</p>
        </div>
        <div className="flex bg-gray-200 p-1 rounded-lg">
            <button onClick={() => setActiveTab('templates')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'templates' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Background Changer</button>
            <button onClick={() => setActiveTab('fashion')} className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'fashion' ? 'bg-white shadow text-purple-600' : 'text-gray-600'}`}>Fashion AI</button>
        </div>
      </div>
      
      {activeTab === 'templates' ? (
        <div className="flex flex-1 gap-4">
          <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
            <h2 className="font-bold mb-4 text-gray-800">1. Upload Product</h2>
            <p className="text-xs text-gray-500 mb-2">Upload your product image. We will remove the background automatically.</p>
            <ProductUploader onUpload={setProductImage} />
            
            <h2 className="font-bold mt-8 mb-4 text-gray-800">2. Select Background Template</h2>
            <TemplateSelector onSelect={setSelectedTemplate} />
            
            <div className="mt-8 border-t pt-4">
              <BackgroundPicker onSelect={(bg) => console.log(bg)} />
            </div>
          </div>
          <div className="flex-1 bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-medium text-gray-600">Live Preview</div>
            <CanvasEditor template={selectedTemplate} product={productImage} />
          </div>
          <div className="w-1/4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <ExportPanel />
            <div className="mt-6 border-t pt-4">
              <LayerControls layers={['Background', 'Product', 'Text']} selectedLayer="Product" onSelectLayer={() => {}} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 gap-6">
            {/* Left Panel: Inputs */}
            <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
                <h2 className="font-bold mb-4 text-gray-800">1. Select Model</h2>
                <div className="flex gap-2 mb-6">
                  <button 
                    onClick={() => setSelectedGender('female')} 
                    className={`flex-1 py-2 rounded-lg border ${selectedGender === 'female' ? 'bg-pink-50 border-pink-500 text-pink-700' : 'border-gray-200 text-gray-600'}`}
                  >Female</button>
                  <button 
                    onClick={() => setSelectedGender('male')} 
                    className={`flex-1 py-2 rounded-lg border ${selectedGender === 'male' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200 text-gray-600'}`}
                  >Male</button>
                </div>

                <h2 className="font-bold mb-4 text-gray-800">2. Select Pose</h2>
                <div className="grid grid-cols-2 gap-3 mb-6">
                    {poses[selectedGender].map(pose => (
                        <div key={pose.id} onClick={() => setSelectedPose(pose)} className={`cursor-pointer border-2 rounded-lg overflow-hidden ${selectedPose?.id === pose.id ? 'border-purple-500' : 'border-transparent'}`}>
                            <img src={pose.img} alt={pose.name} className="w-full h-32 object-cover" />
                            <p className="text-xs text-center p-2 font-medium bg-gray-50">{pose.name}</p>
                        </div>
                    ))}
                </div>
                
                <h2 className="font-bold mb-4 text-gray-800">3. Upload Product</h2>
                <ProductUploader onUpload={setProductImage} />

                <button onClick={handleGenerateFashion} disabled={generating} className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 disabled:bg-purple-300">
                    {generating ? 'Generating Magic...' : 'Generate Fashion Look'}
                </button>
            </div>

            {/* Right Panel: Results & Video */}
            <div className="flex-1 bg-gray-50 p-6 rounded-xl border border-gray-200 flex flex-col items-center justify-center">
                {!generatedImage ? (
                    <div className="text-gray-400 text-center">
                        <p className="text-6xl mb-4">👗</p>
                        <p>Select a pose and product to generate your AI fashion shoot.</p>
                    </div>
                ) : (
                    <div className="w-full max-w-2xl">
                        <div className="bg-white p-4 rounded-lg shadow-lg mb-6">
                            <img src={generatedImage} alt="Generated" className="w-full rounded-lg" />
                        </div>
                        
                        <div className="bg-white p-6 rounded-lg shadow-lg">
                            <h3 className="font-bold text-lg mb-4">Turn into Video Ad</h3>
                            <textarea 
                                className="w-full border p-3 rounded-lg mb-4" 
                                placeholder="Enter script for voiceover (e.g., 'Check out our new summer collection...')"
                                value={voiceoverText}
                                onChange={(e) => setVoiceoverText(e.target.value)}
                            />
                            <button onClick={handleCreateVideo} disabled={generating} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 w-full">
                                {generating ? 'Creating Video...' : 'Generate Video with Voiceover'}
                            </button>

                            {finalVideo && (
                                <div className="mt-6">
                                    <h4 className="font-bold mb-2">Final Video</h4>
                                    <video src={finalVideo} controls className="w-full rounded-lg" />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
}