import { Mail as MailIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ComingSoon } from "../components/ComingSoon";
import { PageHeader } from "../components/PageHeader";

export default function Mail() {
  const { t } = useTranslation();
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <PageHeader
        title={t("mail.title")}
        description={t("mail.description")}
      />
      <ComingSoon
        title={t("mail.comingSoonTitle")}
        description={t("mail.comingSoonDescription")}
        icon={MailIcon}
      />
    </div>
  );
}
