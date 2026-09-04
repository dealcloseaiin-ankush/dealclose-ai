import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import api from './services/api';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './hooks/useAuth';

// 🚀 PERFORMANCE & AUTO-RECOVERY: Automatically retry and reload when new deployment changes chunk hashes
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.warn('Chunk load error detected, reloading to fetch latest version...', error);
      const hasReloaded = sessionStorage.getItem('chunk_retry_reload');
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_retry_reload', 'true');
        window.location.reload();
        return { default: () => <div className="h-screen bg-[#050505] flex items-center justify-center text-white text-sm">Loading updated version...</div> };
      }
      throw error;
    }
  });

const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Register = lazyWithRetry(() => import('./pages/Register'));
const Dashboard = lazyWithRetry(() => import('./pages/Dashboard'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const ResultsPage = lazyWithRetry(() => import('./pages/ResultsPage'));
const Catalog = lazyWithRetry(() => import('./pages/Catalog'));
const OrderDispatch = lazyWithRetry(() => import('./pages/OrderDispatch'));
const AIAgent = lazyWithRetry(() => import('./pages/AIAgent'));
const Campaigns = lazyWithRetry(() => import('./pages/Campaigns'));
const FlowBuilder = lazyWithRetry(() => import('./pages/FlowBuilder'));
const MonthlyReport = lazyWithRetry(() => import('./pages/MonthlyReport'));
const Automations = lazyWithRetry(() => import('./pages/Automations'));
const TrackingAnalytics = lazyWithRetry(() => import('./pages/TrackingAnalytics'));
const WhatsAppTemplates = lazyWithRetry(() => import('./pages/WhatsAppTemplates'));
const Chats = lazyWithRetry(() => import('./pages/Chats'));
const Contacts = lazyWithRetry(() => import('./pages/Contacts'));
const Calls = lazyWithRetry(() => import('./pages/Calls'));
const Wallet = lazyWithRetry(() => import('./pages/Wallet'));
const Settings = lazyWithRetry(() => import('./pages/Settings'));
const CrmPage = lazyWithRetry(() => import('./pages/CrmPage'));
const StaffManagement = lazyWithRetry(() => import('./pages/StaffManagement'));
const Forms = lazyWithRetry(() => import('./pages/Forms'));
const InstagramAutomation = lazyWithRetry(() => import('./pages/InstagramAutomation'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const TermsAndConditions = lazyWithRetry(() => import('./pages/TermsAndConditions'));
const AboutUs = lazyWithRetry(() => import('./pages/AboutUs'));
const FAQ = lazyWithRetry(() => import('./pages/FAQ'));
const Help = lazyWithRetry(() => import('./pages/Help'));
const DataDeletion = lazyWithRetry(() => import('./pages/DataDeletion'));
const DigitalCard = lazyWithRetry(() => import('./pages/DigitalCard'));
const AIVideoLanding = lazyWithRetry(() => import('./pages/AIVideoLanding'));
const ScanIQ = lazyWithRetry(() => import('./pages/ScanIQ'));
const AIVideoDashboard = lazyWithRetry(() => import('./pages/AIVideoDashboard'));
const WhatsAppRules = lazyWithRetry(() => import('./pages/WhatsAppRules'));
const SuperAdmin = lazyWithRetry(() => import('./pages/SuperAdmin'));
const PublishPost = lazyWithRetry(() => import('./pages/PublishPost'));
const SolutionRecommender = lazyWithRetry(() => import('./pages/SolutionRecommender'));
const Publisher = lazyWithRetry(() => import('./pages/Publisher'));
const AdminTemplates = lazyWithRetry(() => import('./pages/AdminTemplates'));
const AutoMarketerDashboard = lazyWithRetry(() => import('./pages/AutoMarketerDashboard'));
const InstagramOAuthCallback = lazyWithRetry(() => import('./pages/InstagramOAuthCallback'));
const MetaAdsManager = lazyWithRetry(() => import('./pages/MetaAdsManager'));
const BillingPage = lazyWithRetry(() => import('./pages/BillingPage'));
const ChangePassword = lazyWithRetry(() => import('./pages/ChangePassword'));
const PricingPage = lazyWithRetry(() => import('./pages/PricingPage'));
const ComparePage = lazyWithRetry(() => import('./pages/ComparePage'));
const IndustryPage = lazyWithRetry(() => import('./pages/IndustryPage'));
const MobileDashboard = lazyWithRetry(() => import('./pages/MobileDashboard'));

// Smart Redirects for Logged In Users
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  if (user) {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || localStorage.getItem('dealclose_mobile_view') === 'true');
    return <Navigate to={isMobile ? "/mobile" : "/dashboard"} replace />;
  }
  return children;
};

const RootRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen bg-[#050505] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;
  if (user) {
    const isMobile = typeof window !== 'undefined' && (window.innerWidth < 768 || localStorage.getItem('dealclose_mobile_view') === 'true');
    return <Navigate to={isMobile ? "/mobile" : "/dashboard"} replace />;
  }
  return children;
};

// 🚀 GLOBAL NOTIFICATION SYSTEM: Plays sound once and shows single popup per new message
const GlobalNotification = () => {
  const auth = useAuth();
  const user = auth?.user;
  const isFirstCheckRef = React.useRef(true);
  const seenMessageIdsRef = React.useRef(new Set());
  const shouldPoll = React.useRef(true);

  useEffect(() => {
    if (!user) return;
    shouldPoll.current = true;
    isFirstCheckRef.current = true;

    const checkMessages = async () => {
      if (!shouldPoll.current) return;
      try {
        const { data } = await api.get('/chats');
        if (!shouldPoll.current) return;
        const messages = Array.isArray(data) ? data : data.data || [];
        if (messages.length === 0) return;

        // On first app load, seed existing message IDs into seenMessageIdsRef so they DON'T trigger old notifications
        if (isFirstCheckRef.current) {
          messages.forEach(m => {
            if (m._id) seenMessageIdsRef.current.add(String(m._id));
            if (m.id) seenMessageIdsRef.current.add(String(m.id));
          });
          isFirstCheckRef.current = false;
          return;
        }

        // Find genuinely NEW incoming messages that have NOT been seen or notified yet
        const newIncoming = messages.filter(m => {
          const msgId = String(m._id || m.id || '');
          return msgId && !seenMessageIdsRef.current.has(msgId) && m.direction === 'incoming';
        });

        // Mark all current message IDs as seen
        messages.forEach(m => {
          if (m._id) seenMessageIdsRef.current.add(String(m._id));
          if (m.id) seenMessageIdsRef.current.add(String(m.id));
        });

        // If there are new incoming messages, notify ONLY ONCE per message
        if (newIncoming.length > 0) {
          const latest = newIncoming[newIncoming.length - 1];
          try {
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.play().catch(() => {});
          } catch (e) {}

          const sender = latest.customerName || latest.customerPhone || 'Customer';
          const text = latest.messageText || latest.text || 'New incoming message';
          toast(`💬 ${sender}: "${text}"`, {
            id: `msg-${latest._id || latest.id || Date.now()}`,
            duration: 4000,
            style: { background: '#111', color: '#fff', border: '1px solid #333' }
          });
        }

        // 🚀 GLOBAL BLUE DOT EVENT: Broadcasts unread status so Sidebar can catch it globally
        const hasUnread = messages.some(m => m.direction === 'incoming' && m.status !== 'read');
        window.dispatchEvent(new CustomEvent('update_unread_badge', { detail: { hasUnread } }));
      } catch(error) {
        if (error.response?.status === 401) {
          shouldPoll.current = false;
        }
        console.debug('Background chat check skipped.', error.message);
      }
    };

    checkMessages();
    const interval = setInterval(checkMessages, 10000);
    return () => {
      shouldPoll.current = false;
      clearInterval(interval);
    };
  }, [user]);

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
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/compare/:competitor" element={<ComparePage />} />
          <Route path="/industries" element={<IndustryPage />} />
          <Route path="/industries/:industryKey" element={<IndustryPage />} />
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
          
          {/* Standalone Mobile Business App Route */}
          <Route path="/mobile" element={<MobileDashboard />} />
          <Route path="/app" element={<MobileDashboard />} />
          
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
              <Route path="change-password" element={<ChangePassword />} />
              <Route path="staff" element={<StaffManagement />} />
              <Route path="forms" element={<Forms />} />
              <Route path="instagram-automation" element={<InstagramAutomation />} />
              <Route path="whatsapp-rules" element={<WhatsAppRules />} />
              <Route path="scaniq" element={<ScanIQ />} />
              <Route path="super-admin" element={<SuperAdmin />} />
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