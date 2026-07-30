import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from './services/api';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// 🚀 PERFORMANCE UPGRADE: Lazy load all pages to reduce initial bundle size
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const ResultsPage = lazy(() => import('./pages/ResultsPage'));
const Catalog = lazy(() => import('./pages/Catalog'));
const OrderDispatch = lazy(() => import('./pages/OrderDispatch'));
const AIAgent = lazy(() => import('./pages/AIAgent'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const FlowBuilder = lazy(() => import('./pages/FlowBuilder'));
const MonthlyReport = lazy(() => import('./pages/MonthlyReport'));
const Automations = lazy(() => import('./pages/Automations'));
const TrackingAnalytics = lazy(() => import('./pages/TrackingAnalytics'));
const WhatsAppTemplates = lazy(() => import('./pages/WhatsAppTemplates'));
const Chats = lazy(() => import('./pages/Chats'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Calls = lazy(() => import('./pages/Calls'));
const Wallet = lazy(() => import('./pages/Wallet'));
const Settings = lazy(() => import('./pages/Settings'));
const CrmPage = lazy(() => import('./pages/CrmPage'));
const StaffManagement = lazy(() => import('./pages/StaffManagement'));
const Forms = lazy(() => import('./pages/Forms'));
const InstagramAutomation = lazy(() => import('./pages/InstagramAutomation'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Help = lazy(() => import('./pages/Help'));
const DataDeletion = lazy(() => import('./pages/DataDeletion'));
const DigitalCard = lazy(() => import('./pages/DigitalCard'));
const AIVideoLanding = lazy(() => import('./pages/AIVideoLanding'));
const ScanIQ = lazy(() => import('./pages/ScanIQ'));
const AIVideoDashboard = lazy(() => import('./pages/AIVideoDashboard'));
const WhatsAppRules = lazy(() => import('./pages/WhatsAppRules'));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin'));
const PublishPost = lazy(() => import('./pages/PublishPost'));
const SolutionRecommender = lazy(() => import('./pages/SolutionRecommender'));
const Publisher = lazy(() => import('./pages/Publisher'));
const AdminTemplates = lazy(() => import('./pages/AdminTemplates'));
const AutoMarketerDashboard = lazy(() => import('./pages/AutoMarketerDashboard'));
const InstagramOAuthCallback = lazy(() => import('./pages/InstagramOAuthCallback'));
const MetaAdsManager = lazy(() => import('./pages/MetaAdsManager'));
const BillingPage = lazy(() => import('./pages/BillingPage'));

// Placeholder component for Change Password until we build the real one
const ChangePasswordPlaceholder = () => <div className="p-10 text-white text-center"><h1 className="text-3xl font-bold text-blue-400">Change Password</h1><p className="mt-4 text-gray-400">This feature is currently under development. Coming soon!</p></div>;

// Smart Redirects for Logged In Users
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

const RootRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// 🚀 GLOBAL NOTIFICATION SYSTEM: Plays sound and shows popup on ALL pages
const GlobalNotification = () => {
  const auth = useAuth();
  const user = auth?.user;
  const [lastMsgId, setLastMsgId] = useState(null);

  useEffect(() => {
    if (!user) return;
    const checkMessages = async () => {
      try {
        const { data } = await api.get('/chats');
        const messages = Array.isArray(data) ? data : data.data || [];
        if (messages.length === 0) return;
        
        const latest = messages[messages.length - 1];
        
        if (latest.direction === 'incoming' && lastMsgId && latest._id !== lastMsgId) {
          const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
          audio.play().catch(() => {});
          toast(`💬 New message from ${latest.customerName || latest.customerPhone}:\n"${latest.messageText}"`, {
            duration: 5000,
            style: { background: '#111', color: '#fff', border: '1px solid #333' }
          });
        }
        if (!lastMsgId || latest._id !== lastMsgId) setLastMsgId(latest._id);
        
        // 🚀 GLOBAL BLUE DOT EVENT: Broadcasts unread status so your Sidebar can catch it globally
        const hasUnread = messages.some(m => m.direction === 'incoming');
        window.dispatchEvent(new CustomEvent('update_unread_badge', { detail: { hasUnread } }));
      } catch(error) {
        console.debug('Background chat check skipped.', error.message);
      }
    };
    checkMessages();
    const interval = setInterval(checkMessages, 4000);
    return () => clearInterval(interval);
  }, [user, lastMsgId]);
  return null;
};

// 🚀 SMART PWA APP INSTALL POPUP
const PWAInstallPopup = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('dealclose_app_dismissed');
    if (isDismissed) return;

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPopup(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('📱 App Installed Successfully!');
      // Future Update: API call karke backend me count badha sakte hain jab backend route ready ho
      // api.post('/tracking/event', { event: 'app_installed', pageUrl: window.location.href }).catch(() => {});
    }
    setDeferredPrompt(null);
    setShowPopup(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('dealclose_app_dismissed', 'true');
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 bg-[#111] border border-gray-700 p-5 rounded-3xl shadow-2xl z-[100] flex flex-col gap-4 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">📱</div>
        <div className="flex-1">
          <h4 className="text-white font-bold text-md">Install DealClose AI</h4>
          <p className="text-gray-400 text-xs mt-0.5">Get faster access & notifications</p>
        </div>
        <button onClick={handleDismiss} className="text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 w-8 h-8 rounded-full flex items-center justify-center transition-colors">✕</button>
      </div>
      <button onClick={handleInstall} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-sm">
        Install App Now
      </button>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      <GlobalNotification />
      <PWAInstallPopup />
      <Suspense fallback={<div className="h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>}>
        <Routes>
          <Route path="/" element={<RootRoute><LandingPage /></RootRoute>} />
          <Route path="/home" element={<LandingPage />} /> {/* Extra route for logged in users to view landing page */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/help" element={<Help />} />
          
          <Route path="/instagram-oauth-callback" element={<InstagramOAuthCallback />} />
          <Route path="/delete-data" element={<DataDeletion />} />
          
          {/* Secondary Landing Page for AI Video Product */}
          <Route path="/ai-video" element={<AIVideoLanding />} />
          <Route path="/ai-video/dashboard" element={<AIVideoDashboard />} />
          
          {/* ScanIQ Public Shareable Results Page */}
          <Route path="/scan/:scanId" element={<ResultsPage />} />
          
          {/* Public Digital Business Card (QR Code Destination) */}
          <Route path="/card/:userId" element={<DigitalCard />} />
          
          {/* Onboarding Page (Replaces Setup) */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/discover" element={<SolutionRecommender />} />
          <Route path="/setup" element={<Onboarding />} /> {/* Supabase ke purane redirects handle karne ke liye */}
          
          {/* Dashboard Layout Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="ai-agent" element={<AIAgent />} />
              <Route path="catalog" element={<Catalog />} />
              <Route path="dispatch" element={<OrderDispatch />} />
              <Route path="campaigns" element={<Campaigns />} />
              <Route path="flow-builder" element={<FlowBuilder />} />
              <Route path="monthly-report" element={<MonthlyReport />} />
              <Route path="chats" element={<Chats />} />
              <Route path="automations" element={<Automations />} />
              <Route path="tracking-analytics" element={<TrackingAnalytics />} />
              <Route path="templates" element={<WhatsAppTemplates />} />
              <Route path="contacts" element={<Contacts />} />
              <Route path="crm" element={<CrmPage />} />
              <Route path="calls" element={<Calls />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="settings" element={<Settings />} />
              <Route path="change-password" element={<ChangePasswordPlaceholder />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="forms" element={<Forms />} />
              <Route path="instagram-automation" element={<InstagramAutomation />} />
              <Route path="whatsapp-rules" element={<WhatsAppRules />} />
              <Route path="scaniq" element={<ScanIQ />} />
              <Route path="super-admin" element={<SuperAdmin />} />
              <Route path="change-password" element={<ChangePasswordPlaceholder />} /> {/* 🚀 NEW: Add route for Change Password */}
              <Route path="publish-post" element={<PublishPost />} />
              <Route path="publish" element={<PublishPost />} />
              <Route path="auto-marketer" element={<AutoMarketerDashboard />} />
              <Route path="publisher" element={<Publisher />} />
              <Route path="/admin/templates" element={<AdminTemplates />} />
              <Route path="meta-ads" element={<MetaAdsManager />} />
              <Route path="billing" element={<BillingPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}