import jwt from "jsonwebtoken";
import type { Role } from "../lib/types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me-in-production";

export interface JwtPayload {
  sub: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
