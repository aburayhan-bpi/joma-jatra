import nodemailer from "nodemailer";
import { serverEnv } from "../core/env";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let cachedTransporter: nodemailer.Transporter | null = null;
let cachedTransportKey = "";

function getTransporter(): nodemailer.Transporter {
  const key = `${serverEnv.smtpHost}:${serverEnv.smtpPort}:${serverEnv.smtpUser}`;
  if (cachedTransporter && cachedTransportKey === key) {
    return cachedTransporter;
  }

  cachedTransporter = nodemailer.createTransport({
    host: serverEnv.smtpHost,
    port: serverEnv.smtpPort,
    secure: serverEnv.smtpPort === 465,
    auth: {
      user: serverEnv.smtpUser,
      pass: serverEnv.smtpPass,
    },
  });
  cachedTransportKey = key;
  return cachedTransporter;
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
    } else {
      console.error(
        `[EMAIL_UNCONFIGURED] SMTP credentials missing; skipped "${options.subject}" to ${options.to}`,
      );
    }
    return false;
  }

  const transporter = getTransporter();

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
