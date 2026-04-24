import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionRoute from './components/PermissionRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PaymentCheckoutPage from './pages/PaymentCheckoutPage';
import { SCREEN_KEYS } from './permissions';
import './App.css';

/**
 * Componente Principal de la Aplicación.
 * Configura el proveedor de autenticación y el enrutamiento.
 */
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Rutas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/pago/:paymentId" element={<PaymentCheckoutPage />} />

          {/* Rutas Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/operations" element={<Dashboard />} />
            <Route path="/dashboard/reports" element={<Dashboard />} />
            <Route path="/dashboard/users" element={<Dashboard />} />
            <Route path="/dashboard/clients" element={<Dashboard />} />
            <Route path="/dashboard/settings" element={<Dashboard />} />
            <Route path="/dashboard/settings/:section" element={<Dashboard />} />
          </Route>

          <Route element={<PermissionRoute requiredScreen={SCREEN_KEYS.PERMISSIONS_PROFILES} />}>
            <Route path="/settings/permissions-profiles" element={<Navigate to="/dashboard/settings/permissions-profiles" replace />} />
          </Route>

          <Route element={<PermissionRoute requiredScreen={SCREEN_KEYS.AUDIT_LOGS} />}>
            <Route path="/admin/auditoria" element={<Dashboard />} />
          </Route>

          {/* Redirección por defecto */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
