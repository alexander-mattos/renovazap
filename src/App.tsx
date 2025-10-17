import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Policies from './pages/Policies';
import PolicyDetails from './pages/PolicyDetails';
import PolicyUploadPage from './pages/PolicyUploadPage';  
import MessageTemplates from './pages/MessageTemplates';
import WhatsAppSetup from './pages/WhatsAppSetup';
import InsuranceTypes from './pages/InsuranceTypes';
import InsuranceProviders from './pages/InsuranceProviders';
import StatsPage from './pages/Stats';
import NotFound from './pages/NotFound';
import ScheduledNotifications from './pages/ScheduledNotifications';

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace />
  );
};

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="policies" element={<Policies />} />
        <Route path="policies/:id" element={<PolicyDetails />} />
        <Route path="upload" element={<PolicyUploadPage />} />
        <Route path="notifications" element={<ScheduledNotifications />} />
        <Route path="templates" element={<MessageTemplates />} />
        <Route path="whatsapp" element={<WhatsAppSetup />} />
        <Route path="insurance-types" element={<InsuranceTypes />} />
        <Route path="insurance-providers" element={<InsuranceProviders />} />
        <Route path="stats" element={<StatsPage />} />
      </Route>
      
      {/* 404 route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;