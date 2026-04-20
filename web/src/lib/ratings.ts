import type { Rating } from "../types";

export const RATING_LABELS: Record<Rating, string> = {
  immediate_sell: "Don't Buy",
  weak_sell: "Probably Not",
  hold: "Maybe",
  weak_buy: "Worth Considering",
  strong_buy: "Strong Buy",
};
