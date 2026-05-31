import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { BottomTabBar } from "../components/BottomTabBar";
import "./AppLayout.css";

export function AppLayout() {
  return (
    <div className="flex min-h-screen app-shell">
      <Sidebar />
      <div className="flex-1 min-w-0 app-content">
        <Outlet />
      </div>
      <BottomTabBar />
    </div>
  );
}
