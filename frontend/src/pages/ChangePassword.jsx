import React, { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { KeyRound, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      return toast.error('New password must be at least 6 characters long.');
    }

    if (newPassword !== confirmPassword) {
      return toast.error('New password and confirm password do not match.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/users/change-password', {
        oldPassword,
        newPassword
      });

      if (data.success) {
        toast.success(data.message || 'Password changed successfully! 🎉');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/dashboard'), 1500);
      }
    } catch (error) {
      console.error('Change password error:', error);
      toast.error(error.response?.data?.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#050505] p-6 md:p-10 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#111] border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl text-purple-400">
            <KeyRound size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">Change Password</h1>
            <p className="text-xs text-gray-400">Update your account security credentials</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Current Password (Optional if joined with Google)
            </label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter current password..."
                className="w-full p-3.5 bg-[#0a0a0a] border border-gray-800 focus:border-purple-500 text-white rounded-xl outline-none text-sm pr-12 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white"
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter at least 6 characters..."
                required
                className="w-full p-3.5 bg-[#0a0a0a] border border-gray-800 focus:border-purple-500 text-white rounded-xl outline-none text-sm pr-12 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-white"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-type new password..."
              required
              className="w-full p-3.5 bg-[#0a0a0a] border border-gray-800 focus:border-purple-500 text-white rounded-xl outline-none text-sm transition-colors"
            />
          </div>

          <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl flex items-start gap-2.5 mt-2">
            <ShieldCheck size={18} className="text-purple-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Your new password will immediately be applied to all your logins across Web and Mobile app.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-95 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'Updating Security Credentials...' : 'Save New Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
