import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "user";
  full_name?: string;
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const secret = () => process.env.JWT_SECRET || "nuasa-local-development-secret";

export function readAuth(req: Request): AuthUser | undefined {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) return undefined;
  try {
    return jwt.verify(token, secret()) as AuthUser;
  } catch {
    return undefined;
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.authUser = readAuth(req);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  req.authUser = readAuth(req);
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  req.authUser = readAuth(req);
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({ error: "Administrator access required" });
    return;
  }
  next();
}

export function issueToken(user: AuthUser) {
  return jwt.sign(user, secret(), { expiresIn: "30d" });
}