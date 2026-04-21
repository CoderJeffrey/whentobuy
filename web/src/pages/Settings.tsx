import { Settings as SettingsIcon } from "lucide-react";
import { ComingSoon } from "../components/ComingSoon";
import { PageHeader } from "../components/PageHeader";

export default function Settings() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title="Settings"
        description="Account, preferences, and data sources."
      />
      <ComingSoon
        title="App settings"
        description="Manage your profile, notification preferences, and connected data providers."
        icon={SettingsIcon}
      />
    </div>
  );
}
