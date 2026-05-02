import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Setup from './pages/Setup';
import Catalog from './pages/Catalog';
import AITraining from './pages/AITraining';
import OrderDispatch from './pages/OrderDispatch';
import AIInsights from './pages/AIInsights';
import SmartGroups from './pages/SmartGroups';
import CampaignManager from './pages/CampaignManager';
import MonthlyReport from './pages/MonthlyReport';
import Automations from './pages/Automations';
import WhatsAppTemplates from './pages/WhatsAppTemplates';
import Chats from './pages/Chats';
import Leads from './pages/Leads';
import Calls from './pages/Calls';
import Wallet from './pages/Wallet';
import Settings from './pages/Settings';
import StaffManagement from './pages/StaffManagement';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Forms from './pages/Forms';
import InstagramAutomation from './pages/InstagramAutomation';
import Properties from './pages/Properties';
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
        
        {/* Setup Page ko ProtectedRoute se bahar nikal diya taaki Google Login ke baad bina token ke load ho sake */}
        <Route path="/setup" element={<Setup />} />
        
        {/* Dashboard Layout Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="insights" element={<AIInsights />} />
            <Route path="training" element={<AITraining />} />
            <Route path="catalog" element={<Catalog />} />
            <Route path="dispatch" element={<OrderDispatch />} />
            <Route path="smart-groups" element={<SmartGroups />} />
            <Route path="campaigns" element={<CampaignManager />} />
            <Route path="monthly-report" element={<MonthlyReport />} />
            <Route path="chats" element={<Chats />} />
            <Route path="automations" element={<Automations />} />
            <Route path="templates" element={<WhatsAppTemplates />} />
            <Route path="leads" element={<Leads />} />
            <Route path="calls" element={<Calls />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="settings" element={<Settings />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="forms" element={<Forms />} />
            <Route path="instagram-automation" element={<InstagramAutomation />} />
            <Route path="properties" element={<Properties />} />
          </Route>
        </Route>
      </Routes>
      
      {/* Floating AI Setup Guide for Users */}
      <AIGuideWidget />
    </Router>
  );
}