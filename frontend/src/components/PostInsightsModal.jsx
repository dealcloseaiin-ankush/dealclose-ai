// frontend/src/components/PostInsightsModal.jsx

import { useEffect, useState } from 'react';
import api from '../services/api'; // Aapka Axios instance

const StatCard = ({ label, value }) => (
  <div className="bg-gray-800 p-4 rounded-lg text-center">
    <p className="text-sm text-gray-400">{label}</p>
    <p className="text-2xl font-bold text-white">{value?.toLocaleString() || 'N/A'}</p>
  </div>
);

export default function PostInsightsModal({ post, workspaceId, onClose }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!post) return;

    const fetchInsights = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/instagram/posts/${post.id}/insights`, {
          params: { workspaceId }
        });
        setInsights(data.insights);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load insights.');
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [post, workspaceId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">Post Insights</h2>
        <div className="flex items-center gap-4 mb-6">
          <img src={post.thumbnail_url} alt="Post" className="w-24 h-24 rounded-lg object-cover" />
          <p className="text-gray-300 text-sm flex-1">"{post.caption.substring(0, 150)}..."</p>
        </div>

        {loading && <p className="text-center text-gray-400">Loading insights...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {insights && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Reach" value={insights.reach} />
            <StatCard label="Impressions" value={insights.impressions} />
            <StatCard label="Likes" value={insights.likes} />
            <StatCard label="Comments" value={insights.comments} />
            <StatCard label="Saves" value={insights.saved} />
            {insights.video_views && <StatCard label="Video Views" value={insights.video_views} />}
          </div>
        )}
        
        <button onClick={onClose} className="mt-6 w-full bg-purple-600 text-white p-2 rounded-lg font-semibold">
          Close
        </button>
      </div>
    </div>
  );
}
