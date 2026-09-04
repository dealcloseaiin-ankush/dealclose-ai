import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { supabase } from '../lib/supabase'; // Centralized Supabase client

export default function Login() {
  const [email, setEmail] = useState('ankush.bani@gmail.com');
  const [password, setPassword] = useState('ak@7828289433');
  const [showPassword, setShowPassword] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const getPostLoginDestination = () => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get('redirect');
    if (redirectParam) return redirectParam;
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return '/mobile';
    }
    return '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (isResetMode) {
        await resetPassword(email, password);
        setSuccessMsg('Password updated successfully! Logging you in...');
      } else {
        await login(email, password);
      }
      navigate(getPostLoginDestination());
    } catch (err) {
      if (err.code === 'ERR_NETWORK' || err.message?.includes('network error')) {
        setError('Network error. The server might be starting up. Please wait a moment and try again.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please check your credentials or click "Forgot / Set Password".');
      } else {
        setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      setError(error.message || 'Google Login failed. If your Supabase project is paused, please use Email/Password below.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#050505] p-4">
      <div className="p-8 md:p-10 bg-[#111] rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">
        <div className="w-14 h-14 rounded-2xl bg-white p-1 mx-auto mb-4 shadow-lg flex items-center justify-center">
          <img src="/logo.png" alt="DealClose AI Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-extrabold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center">
          {isResetMode ? 'Set New Password' : 'Welcome Back'}
        </h1>
        <p className="text-gray-400 text-xs text-center mb-6">
          {isResetMode ? 'Enter your email and your new password to update and sign in.' : 'Sign in to access your AI sales & automation hub'}
        </p>
        
        {!isResetMode && (
          <>
            <button 
              type="button" 
              onClick={() => {
                setEmail('ankush.bani@gmail.com');
                setPassword('ak@7828289433');
                login('ankush.bani@gmail.com', 'ak@7828289433')
                  .then(() => navigate(getPostLoginDestination()))
                  .catch(() => navigate(getPostLoginDestination()));
              }}
              className="w-full mb-3 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-black p-3 rounded-lg font-black hover:opacity-95 transition-all shadow-md"
            >
              <span>⚡ 1-Click Instant Guest / Demo Access</span>
            </button>

            <button type="button" onClick={handleGoogleLogin} className="w-full mb-6 flex items-center justify-center gap-3 bg-white text-black p-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
              <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-sm text-gray-500">OR WITH CREDENTIALS</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-[#0a0a0a] border border-gray-700 text-white rounded-lg focus:border-purple-500 outline-none"
              required
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-gray-400 text-sm">{isResetMode ? 'New Password' : 'Password'}</label>
              <button
                type="button"
                onClick={() => { setIsResetMode(!isResetMode); setError(''); setSuccessMsg(''); }}
                className="text-xs text-purple-400 hover:text-pink-400 transition-colors"
              >
                {isResetMode ? 'Back to Login' : 'Forgot / Set Password?'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 pr-16 bg-[#0a0a0a] border border-gray-700 text-white rounded-lg focus:border-purple-500 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute inset-y-0 right-3 text-sm font-semibold text-gray-400 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'View'}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          {successMsg && <p className="text-sm text-green-500 text-center">{successMsg}</p>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
            {loading ? 'Processing...' : (isResetMode ? 'Update Password & Sign In' : 'Sign In')}
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have an account? <Link to="/register" className="text-purple-500 hover:text-pink-500 transition-colors font-semibold">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

