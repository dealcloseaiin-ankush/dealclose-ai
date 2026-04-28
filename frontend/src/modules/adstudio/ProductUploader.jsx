import { useState } from 'react';
import api from '../../services/api';

export default function ProductUploader({ onUpload }) {
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);
      
      try {
        const { data } = await api.post('/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        onUpload(data.imageUrl); // Backend returned URL
      } catch (error) {
        console.error("Upload API failed, using local preview", error);
        // Fallback to local URL if backend upload fails
        onUpload(URL.createObjectURL(file));
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center">
      <p className="text-sm text-gray-500 mb-2">{uploading ? 'Uploading to server...' : 'Click to upload product image'}</p>
      <input type="file" accept="image/*" onChange={handleChange} disabled={uploading} className="text-sm" />
    </div>
  );
}