import nodemailer from "nodemailer";
import { serverEnv } from "../core/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends transactional email via SMTP when configured.
 * In development without SMTP credentials, logs a clear fallback notice so auth flows remain testable.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!serverEnv.smtpHost || !serverEnv.smtpUser || !serverEnv.smtpPass) {
    if (process.env.NODE_ENV !== "production") {
      console.info(
        `[EMAIL_DEV_FALLBACK] To: ${options.to} | Subject: ${options.subject}\n${options.text || ""}`,
      );
    }
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port: serverEnv.smtpPort,
    secure: serverEnv.smtpPort === 465,
    auth: {
      user: serverEnv.smtpUser,
      pass: serverEnv.smtpPass,
    },
  });

  await transporter.sendMail({
    from: serverEnv.smtpFrom,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  return true;
}

/**
 * Non-fatal wrapper for notification emails (receipts, welcome, role updates).
 * Ensures a temporary SMTP/network glitch never rolls back or fails a financial API call.
 */
export async function safeSendEmail(options: SendEmailOptions): Promise<void> {
  try {
    await sendEmail(options);
  } catch (err) {
    console.error(
      `[EMAIL_ERROR] Failed sending "${options.subject}" to ${options.to}:`,
      err,
    );
  }
}
