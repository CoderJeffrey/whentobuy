import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/ticker/AAPL" replace />} />
        <Route path="/ticker/:symbol" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/ticker/AAPL" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
