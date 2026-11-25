import { UserRole } from "@/types/backend";
import jwt, { SignOptions } from "jsonwebtoken";
import { NextRequest } from "next/server";
import { IUserDocument, UserModel } from "../modules/members/user.model";
import { forbidden, unauthorized } from "./app-error";
import { connectDB } from "./db";
import { serverEnv } from "./env";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tokenVersion?: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
  doc: IUserDocument;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, serverEnv.jwtAccessSecret, {
    expiresIn: serverEnv.jwtAccessExpiresIn as SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, serverEnv.jwtRefreshSecret, {
    expiresIn: serverEnv.jwtRefreshExpiresIn as SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, serverEnv.jwtAccessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, serverEnv.jwtRefreshSecret) as JwtPayload;
}

/**
 * Extracts Bearer token from Authorization header or accessToken/auth_token cookie.
 */
export function extractAccessToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return (
    req.cookies.get("accessToken")?.value ||
    req.cookies.get("auth_token")?.value ||
    null
  );
}

/**
 * Authenticates the request, verifies live DB active status and tokenVersion, and enforces RBAC roles.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[],
): Promise<AuthUser> {
  const token = extractAccessToken(req);
  if (!token) {
    throw unauthorized("Authentication token is missing");
  }

  const decoded = verifyAccessToken(token);
  await connectDB();

  const user = await UserModel.findById(decoded.userId);
  if (!user || user.isDeleted || user.status !== "ACTIVE") {
    throw unauthorized("Your account is inactive or no longer accessible");
  }

  // Enforce server-side token revocation (logout / password change / password reset)
  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    throw unauthorized("Session has been revoked. Please log in again.");
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    throw forbidden("You do not have permission to access this resource");
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    doc: user,
  };
}
