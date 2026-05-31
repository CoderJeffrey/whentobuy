import { useTranslation } from "react-i18next";
import { Watchlist } from "../components/Watchlist";
import "./Dashboard.css";
import "./WatchlistPage.css";

/**
 * Dedicated mobile watchlist screen (a bottom-tab destination). On desktop the
 * same data renders as the right-hand sidebar inside the Dashboard, so this
 * route is primarily reached on mobile — but it works at any width.
 *
 * Reuses the `.dbg`-scoped watchlist styles by rendering under a `.dbg` root.
 * Passing an empty `activeSymbol` means no row is highlighted as "current".
 */
export default function WatchlistPage() {
  const { t } = useTranslation();
  return (
    <div className="dbg wl-page">
      <div className="bg-grid" />
      <div className="wl-page-inner">
        <h1 className="wl-page-title">{t("watchlist.title")}</h1>
        <Watchlist activeSymbol="" />
      </div>
    </div>
  );
}
