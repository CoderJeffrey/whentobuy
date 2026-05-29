import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Indicators from "./pages/Indicators";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Mail from "./pages/Mail";
import Settings from "./pages/Settings";
import Unsubscribe from "./pages/Unsubscribe";

function LegacyTickerRedirect() {
  const { symbol } = useParams<{ symbol: string }>();
  const target = symbol ? `/dashboard/${symbol.toUpperCase()}` : "/dashboard";
  return <Navigate to={target} replace />;
}

function FullPageLoader() {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--bg-page)" }}
    >
      <span
        className="text-sm"
        style={{ color: "var(--text-secondary)" }}
      >
        {t("app.loading")}
      </span>
    </div>
  );
}

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageLoader />;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard/:symbol" element={<Dashboard />} />
        <Route path="/indicators" element={<Indicators />} />
        <Route path="/mail" element={<Mail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/ticker/:symbol" element={<LegacyTickerRedirect />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
