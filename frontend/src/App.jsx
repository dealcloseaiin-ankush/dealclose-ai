import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import ResultsPage from './pages/ResultsPage';
import Catalog from './pages/Catalog';
import OrderDispatch from './pages/OrderDispatch';
import AIAgent from './pages/AIAgent';
import Campaigns from './pages/Campaigns';
import FlowBuilder from './pages/FlowBuilder';
import MonthlyReport from './pages/MonthlyReport';
import Automations from './pages/Automations';
import TrackingAnalytics from './pages/TrackingAnalytics';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import Chats from './pages/Chats';
import Contacts from './pages/Contacts';
import Calls from './pages/Calls';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';
import CrmPage from './pages/CrmPage';
import StaffManagement from './pages/StaffManagement';
import ProtectedRoute from './components/ProtectedRoute';
import Forms from './pages/Forms';
import InstagramAutomation from './pages/InstagramAutomation';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsAndConditions from './pages/TermsAndConditions';
import AboutUs from './pages/AboutUs';
import FAQ from './pages/FAQ';
import Help from './pages/Help';
import DataDeletion from './pages/DataDeletion';
import AIGuideWidget from './components/AIGuideWidget';
import DigitalCard from './pages/DigitalCard';
import AIVideoLanding from './pages/AIVideoLanding';
import AIVideoDashboard from './pages/AIVideoDashboard';

// Placeholder component for Change Password until we build the real one
const ChangePasswordPlaceholder = () => <div className="p-10 text-white text-center"><h1 className="text-3xl font-bold text-blue-400">Change Password</h1><p className="mt-4 text-gray-400">This feature is currently under development. Coming soon!</p></div>;

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} /> {/* This was correct, no change needed */}
        <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/help" element={<Help />} />
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
          </Route>
        </Route>
      </Routes>
      
      {/* Floating AI Setup Guide for Users */}
      <AIGuideWidget />
    </Router>
  );
}