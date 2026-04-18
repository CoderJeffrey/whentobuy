import { BrowserRouter, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Weights from "./pages/Weights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/weights" element={<Weights />} />
      </Routes>
    </BrowserRouter>
  );
}
