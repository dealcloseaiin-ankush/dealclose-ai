import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Catalog from './pages/Catalog';
import OrderDispatch from './pages/OrderDispatch';
import AIAgent from './pages/AIAgent';
import Campaigns from './pages/Campaigns';
import FlowBuilder from './pages/FlowBuilder';
import MonthlyReport from './pages/MonthlyReport';
import Automations from './pages/Automations';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import Chats from './pages/Chats';
import Contacts from './pages/Contacts';
import Calls from './pages/Calls';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';
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
            <Route path="templates" element={<WhatsAppTemplates />} />
            <Route path="contacts" element={<Contacts />} />
            <Route path="calls" element={<Calls />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="settings" element={<Settings />} />
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