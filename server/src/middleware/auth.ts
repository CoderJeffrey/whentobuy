import type { NextFunction, Request, Response } from "express";
import { ensureUserHasCombo } from "../services/combos.js";
import { ensureUserLibraryInitialized } from "../services/indicator-library.js";
import {
  devUserEmail,
  devUserId,
  getSupabaseAdmin,
  isDevAutoLogin,
} from "../supabase.js";

export interface AuthedUser {
  id: string;
  email: string;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (isDevAutoLogin()) {
    req.user = { id: devUserId(), email: devUserEmail() };
    await ensureUserLibraryInitialized(req.user.id).catch((err: unknown) => {
      console.warn("[requireAuth] library init failed:", err);
    });
    await ensureUserHasCombo(req.user.id).catch((err: unknown) => {
      console.warn("[requireAuth] combo init failed:", err);
    });
    next();
    return;
  }

  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
    return;
  }

  try {
    const { data, error } = await getSupabaseAdmin().auth.getUser(token);
    if (error || !data.user) {
      res.status(401).json({ error: "Invalid token", code: "UNAUTHORIZED" });
      return;
    }
    req.user = {
      id: data.user.id,
      email: data.user.email ?? "",
    };
    await ensureUserLibraryInitialized(req.user.id).catch((err: unknown) => {
      console.warn("[requireAuth] library init failed:", err);
    });
    await ensureUserHasCombo(req.user.id).catch((err: unknown) => {
      console.warn("[requireAuth] combo init failed:", err);
    });
    next();
  } catch (err) {
    console.error("[requireAuth] error verifying token:", err);
    res.status(401).json({ error: "Invalid token", code: "UNAUTHORIZED" });
  }
}
