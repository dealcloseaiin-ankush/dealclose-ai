import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { Image as ImageIcon, Send, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

export default function PublishPost() {
  const { user } = useAuth() || {};
  const [workspaces, setWorkspaces] = useState([{ _id: 'main', name: user?.businessName || 'Main Business' }, ...(user?.workspaces || [])]);
  const [activeWorkspace, setActiveWorkspace] = useState('main');

  const [caption, setCaption] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState('');

  useEffect(() => {
    api.get('/users/profile').then(res => {
      const u = res.data.user || res.data;
      if (u) setWorkspaces([{ _id: 'main', name: u.businessName || 'Main Business' }, ...(u.workspaces || [])]);
    }).catch(console.error);
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setPublishedUrl(''); // Reset on new image
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!imageFile || !caption) {
      return toast.error('Please provide both an image and a caption.');
    }

    setIsPublishing(true);
    setPublishedUrl('');
    const toastId = toast.loading('Publishing post to Instagram...');

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('caption', caption);
    formData.append('workspaceId', activeWorkspace);

    try {
      const { data } = await api.post('/instagram/publish', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data.success) {
        toast.success('Post published successfully!', { id: toastId });
        setPublishedUrl(data.postUrl);
      } else {
        throw new Error(data.message || 'An unknown error occurred.');
      }
    } catch (error) {
      console.error('Publish Error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to publish post.', { id: toastId });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 mb-2">
              Publish to Instagram
            </h1>
            <p className="text-gray-400">Upload an image, write a caption, and post directly to your feed.</p>
          </div>
          <select
            value={activeWorkspace}
            onChange={(e) => setActiveWorkspace(e.target.value)}
            className="bg-[#111] border border-gray-800 text-white text-sm font-semibold rounded-lg px-3 py-1.5 outline-none focus:border-pink-500 cursor-pointer shadow-sm"
          >
            {workspaces.map(ws => (
              <option key={ws._id} value={ws._id}>🏢 {ws.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-xl">
            <form onSubmit={handlePublish} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">1. Upload Image</label>
                <input type="file" accept="image/jpeg,image/png" onChange={handleImageChange} required className="text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500/10 file:text-pink-400 hover:file:bg-pink-500/20 w-full" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-400 mb-2">2. Write Caption</label>
                <textarea
                  rows="8"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  required
                  placeholder="Write your engaging caption here..."
                  className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-4 text-white focus:border-pink-500 outline-none"
                ></textarea>
              </div>
              <button type="submit" disabled={isPublishing} className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-pink-600/20 disabled:opacity-50 flex justify-center items-center gap-2">
                {isPublishing ? <Loader2 className="animate-spin" /> : <Send size={18} />}
                {isPublishing ? 'Publishing...' : 'Publish to Instagram'}
              </button>
            </form>
          </div>

          {/* Preview Section */}
          <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl p-6 shadow-inner">
            <h2 className="text-lg font-bold text-white mb-4">Live Preview</h2>
            <div className="bg-black border border-gray-700 rounded-xl overflow-hidden max-w-sm mx-auto">
              <div className="p-3 flex items-center gap-2 border-b border-gray-800">
                <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                <p className="text-sm font-bold">{user?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</p>
              </div>
              <div className="aspect-square bg-[#111] flex items-center justify-center">
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <ImageIcon className="text-gray-600" size={48} />}
              </div>
              <div className="p-4 text-sm">
                <p className="whitespace-pre-wrap line-clamp-3"><strong className="mr-1">{user?.businessName?.toLowerCase().replace(/\s/g, '') || 'your_handle'}</strong>{caption || 'Your caption will appear here...'}</p>
              </div>
            </div>
            {publishedUrl && (
              <div className="mt-6 bg-green-500/10 border border-green-500/20 p-4 rounded-xl animate-fade-in text-center">
                <div className="flex items-center justify-center gap-2 font-bold text-green-400 mb-3">
                  <CheckCircle size={20} /> Post Published Successfully!
                </div>
                <a href={publishedUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg font-semibold transition-colors">
                  View on Instagram <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}