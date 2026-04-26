import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  addWatchlistTicker,
  fetchWatchlist,
  removeWatchlistTicker,
} from "../lib/api";
import type { WatchlistResponse } from "../types";

const QUERY_KEY = ["watchlist"] as const;

export function useWatchlist() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ signal }) => fetchWatchlist(signal),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: (q) =>
      q.state.data?.tickers.some((t) => !t.dataReady) ? 3000 : false,
  });

  const add = useMutation({
    mutationFn: (ticker: string) => addWatchlistTicker(ticker),
    onSuccess: (data, ticker) => {
      qc.setQueryData<WatchlistResponse>(QUERY_KEY, {
        tickers: data.tickers,
      });
      qc.invalidateQueries({ queryKey: ["dashboard", ticker.toUpperCase()] });
    },
  });

  const remove = useMutation({
    mutationFn: (ticker: string) => removeWatchlistTicker(ticker),
    onMutate: async (ticker) => {
      await qc.cancelQueries({ queryKey: QUERY_KEY });
      const prev = qc.getQueryData<WatchlistResponse>(QUERY_KEY);
      if (prev) {
        qc.setQueryData<WatchlistResponse>(QUERY_KEY, {
          tickers: prev.tickers.filter((t) => t.ticker !== ticker),
        });
      }
      return { prev };
    },
    onError: (_err, _ticker, ctx) => {
      if (ctx?.prev) qc.setQueryData(QUERY_KEY, ctx.prev);
    },
    onSuccess: (data) => {
      qc.setQueryData<WatchlistResponse>(QUERY_KEY, {
        tickers: data.tickers,
      });
    },
  });

  return { query, add, remove };
}
