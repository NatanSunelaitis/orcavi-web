import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { PlanProvider } from './context/PlanContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Accounts from './components/Accounts';
import Simulator from './components/Simulator';
import Goals from './components/Goals';
import CreditCards from './components/CreditCards';
import Debts from './components/Debts';
import Family from './components/Family';
import WhatsAppAI from './components/WhatsAppAI';
import Pricing from './components/Pricing';
import Login from './components/Login';

const AuthenticatedApp: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <PlanProvider>
    <FinanceProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/cards" element={<CreditCards />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/family" element={<Family />} />
            <Route path="/whatsapp-ai" element={<WhatsAppAI />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </FinanceProvider>
    </PlanProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
};

export default App;
