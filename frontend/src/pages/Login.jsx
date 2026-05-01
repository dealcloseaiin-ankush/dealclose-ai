import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/Button';
import { supabase } from '../lib/supabase'; // Centralized Supabase client

export default function Login() {
  const [email, setEmail] = useState('ankush.bani@gmail.com');
  const [password, setPassword] = useState('ak@7828289433');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Use the error message from the backend if available
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/setup' // Login ke baad Setup page par bhejega
      }
    });
    if (error) {
      setError(error.message);
      console.error(error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#050505]">
      <div className="p-10 bg-[#111] rounded-2xl shadow-2xl border border-gray-800 w-full max-w-md">
        <h1 className="text-3xl font-extrabold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 text-center">
          Welcome Back
        </h1>
        
        <button type="button" onClick={handleGoogleLogin} className="w-full mb-6 flex items-center justify-center gap-3 bg-white text-black p-3 rounded-lg font-bold hover:bg-gray-200 transition-colors">
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
        
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-800"></div>
          <span className="text-sm text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-800"></div>
        </div>

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
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-[#0a0a0a] border border-gray-700 text-white rounded-lg focus:border-purple-500 outline-none"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white p-3 rounded-lg font-bold hover:opacity-90 transition-opacity">
            {loading ? 'Authenticating...' : 'Sign In'}
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