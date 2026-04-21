import { Mail as MailIcon } from "lucide-react";
import { ComingSoon } from "../components/ComingSoon";
import { PageHeader } from "../components/PageHeader";

export default function Mail() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title="Mail"
        description="Daily and weekly digests for your watchlist."
      />
      <ComingSoon
        title="Mail digests"
        description="Get a daily summary of rating changes and indicator triggers across your watchlist."
        icon={MailIcon}
      />
    </div>
  );
}
