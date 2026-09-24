import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { verifyToken } from "../security.js";

const httpError = (status: number, message: string) => {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) return next(httpError(401, "No token provided"));

  try {
    const payload = verifyToken(token);
    if (
      typeof payload === "string" ||
      typeof (payload as JwtPayload).id !== "number"
    ) {
      return next(httpError(401, "Invalid token payload"));
    }
    req.ownerEmail = (payload as JwtPayload).id;
    next();
  } catch (error) {
    if (
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.JsonWebTokenError
    ) {
      return next(httpError(401, "Invalid or expired token"));
    }
    next(error);
  }
}
