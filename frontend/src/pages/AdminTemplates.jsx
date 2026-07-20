import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { UploadCloud, FileJson, BrainCircuit, Loader2 } from 'lucide-react';

export default function AdminTemplates() {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data } = await api.get('/templates');
        setTemplates(data.templates || []);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
        toast.error('Could not fetch templates.');
      }
    };

    fetchTemplates();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleFileChange = (e) => {
    setFiles([...e.target.files]);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      return toast.error('Please select at least one JSON template file.');
    }

    setIsUploading(true);
    setUploadProgress(0);

    const totalFiles = files.length;
    for (let i = 0; i < totalFiles; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('template', file);

      try {
        await api.post('/templates/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        toast.success(`Uploaded & Analyzed: ${file.name}`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}: ${error.response?.data?.message || 'Server error'}`);
      }
      setUploadProgress(((i + 1) / totalFiles) * 100);
    }

    setIsUploading(false);
    setFiles([]);
    
    // Refresh the list after upload
    const fetchTemplatesAfterUpload = async () => {
      try {
        const { data } = await api.get('/templates');
        setTemplates(data.templates || []);
      } catch (error) {
        console.error("Failed to fetch templates:", error);
      }
    };
    fetchTemplatesAfterUpload();
  };

  return (
    <div className="p-6 md:p-10 bg-[#050505] min-h-screen text-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500 mb-4">
          Admin: Template Manager
        </h1>
        <p className="text-gray-400 mb-8">Upload design templates in JSON format. The AI will automatically analyze and categorize them.</p>

        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-4">
            <label className="flex-1 flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-700 rounded-xl cursor-pointer hover:border-orange-500 hover:bg-[#1a1a1a] transition-all">
              <UploadCloud className="w-10 h-10 text-gray-500 mb-3" />
              <span className="font-semibold text-white">{files.length > 0 ? `${files.length} files selected` : 'Click or Drag to Upload Templates'}</span>
              <span className="text-xs text-gray-500 mt-1">JSON files only</span>
              <input type="file" multiple accept=".json" onChange={handleFileChange} className="hidden" />
            </label>
            <button onClick={handleUpload} disabled={isUploading || files.length === 0} className="self-stretch px-8 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2">
              {isUploading ? <Loader2 className="animate-spin" /> : <BrainCircuit />}
              {isUploading ? 'Analyzing...' : 'Upload & Analyze'}
            </button>
          </div>
          {isUploading && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
              <div className="bg-orange-500 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          )}
        </div>

        <div className="bg-[#111] border border-gray-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Stored Templates ({templates.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(template => (
              <div key={template._id} className="bg-[#1a1a1a] p-4 rounded-lg border border-gray-700">
                <p className="font-bold text-white flex items-center gap-2"><FileJson size={16} className="text-orange-400" /> {template.name}</p>
                <p className="text-xs text-gray-400 mt-1">Category: <span className="font-semibold text-orange-300">{template.category}</span></p>
                <p className="text-xs text-gray-500">Usage: {template.usageCount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}