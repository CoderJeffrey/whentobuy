import { TrendingUp } from "lucide-react";
import { ComingSoon } from "../components/ComingSoon";
import { PageHeader } from "../components/PageHeader";

export default function Indicators() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title="Indicators"
        description="Browse and configure the indicator library."
      />
      <ComingSoon
        title="Indicator library"
        description="Review every indicator, read the methodology, and tune thresholds in one place."
        icon={TrendingUp}
      />
    </div>
  );
}
