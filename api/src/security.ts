import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "./types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const JWT_EXPIRES_IN = "2h";

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const comparePassword = (pw: string, hash: string) =>
  bcrypt.compare(pw, hash);
export const signToken = (payload: AuthTokenPayload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
export const verifyToken = (token: string) => jwt.verify(token, JWT_SECRET);
