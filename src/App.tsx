/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/DashboardLayout';
import Wallets from './pages/Wallets';
import WalletDetails from './pages/WalletDetails';
import Deposit from './pages/Deposit';
import Subscription from './pages/Subscription';
import ApiKeys from './pages/ApiKeys';
import Docs from './pages/Docs';
import Admin from './pages/Admin';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-8 text-center"><h2 className="text-2xl font-bold">حدث خطأ ما.</h2><button onClick={() => window.location.reload()} className="mt-4 text-blue-600 underline">إعادة تحميل الصفحة</button></div>;
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('token');
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-screen">
    <h1 className="text-6xl font-bold mb-4">404</h1>
    <p className="mb-4">الصفحة غير موجودة</p>
    <a href="/" className="text-blue-600 underline">العودة للرئيسية</a>
  </div>
);

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
          <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
          <Route path="/admin" element={<Admin />} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="wallets" replace />} />
            <Route path="wallets" element={<Wallets />} />
            <Route path="wallets/:walletId" element={<WalletDetails />} />
            <Route path="deposit" element={<Deposit />} />
            <Route path="subscription" element={<Subscription />} />
            <Route path="api-keys" element={<ApiKeys />} />
            <Route path="docs" element={<Docs />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

