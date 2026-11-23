/**
 * Centralized Environment Configuration
 * Lazily accessed so Next.js static builds succeed without runtime secrets,
 * while throwing clear errors at runtime if critical secrets are missing.
 */

const getRequiredEnv = (key: string, devFallback?: string): string => {
  const value = process.env[key];
  if (value && value.trim().length > 0) {
    return value.trim();
  }

  if (process.env.NODE_ENV !== "production" && devFallback) {
    return devFallback;
  }

  throw new Error(`Missing required environment variable: ${key}`);
};

export const serverEnv = {
  get mongodbUri(): string {
    return getRequiredEnv("MONGODB_URI");
  },
  get jwtAccessSecret(): string {
    return getRequiredEnv(
      "JWT_ACCESS_SECRET",
      "joma-jatra-dev-access-secret-change-in-production",
    );
  },
  get jwtRefreshSecret(): string {
    return getRequiredEnv(
      "JWT_REFRESH_SECRET",
      "joma-jatra-dev-refresh-secret-change-in-production",
    );
  },
  get jwtAccessExpiresIn(): string {
    return process.env.JWT_ACCESS_EXPIRES_IN || "1d";
  },
  get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || "30d";
  },
  get cloudinaryCloudName(): string {
    return process.env.CLOUDINARY_CLOUD_NAME || "";
  },
  get cloudinaryApiKey(): string {
    return process.env.CLOUDINARY_API_KEY || "";
  },
  get cloudinaryApiSecret(): string {
    return process.env.CLOUDINARY_API_SECRET || "";
  },
  get smtpHost(): string {
    return process.env.SMTP_HOST || "";
  },
  get smtpPort(): number {
    return Number(process.env.SMTP_PORT || 587);
  },
  get smtpUser(): string {
    return process.env.SMTP_USER || "";
  },
  get smtpPass(): string {
    return process.env.SMTP_PASS || "";
  },
  get smtpFrom(): string {
    return process.env.SMTP_FROM || "JomaJatra <no-reply@jomajatra.app>";
  },
};
