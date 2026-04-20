import type { Rating } from "../types";

export const RATING_LABELS: Record<Rating, string> = {
  immediate_sell: "Don't Buy",
  weak_sell: "Probably Not",
  hold: "Hold",
  weak_buy: "Weak Buy",
  strong_buy: "Strong Buy",
};
