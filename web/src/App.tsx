import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Indicators from "./pages/Indicators";
import Login from "./pages/Login";
import Mail from "./pages/Mail";
import Settings from "./pages/Settings";

function LegacyTickerRedirect() {
  const { symbol } = useParams<{ symbol: string }>();
  const target = symbol ? `/dashboard/${symbol.toUpperCase()}` : "/dashboard";
  return <Navigate to={target} replace />;
}

function FullPageLoader() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <span
        className="text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        Loading…
      </span>
    </div>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (!user) return <Login />;
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/:symbol" element={<Dashboard />} />
          <Route path="/indicators" element={<Indicators />} />
          <Route path="/mail" element={<Mail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/ticker/:symbol" element={<LegacyTickerRedirect />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
}
