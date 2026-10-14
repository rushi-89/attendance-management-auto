import nodemailer from "nodemailer";
import twilio from "twilio";

let cachedTransporter;

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT || 587),
      secure: String(SMTP_SECURE || "false").toLowerCase() === "true",
      auth: { user: SMTP_USER, pass: SMTP_PASS }
    });
  }
  return cachedTransporter;
}

export async function sendEmail({ to, subject, text }) {
  const transporter = getTransporter();
  if (!transporter || !process.env.SMTP_FROM) {
    return { status: "skipped", detail: "Email provider is not configured." };
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      text
    });
    return { status: "submitted", detail: `Accepted by SMTP server (${info.messageId || "message accepted"}).` };
  } catch (error) {
    console.error("Email provider error:", error.message);
    return { status: "failed", detail: `Email send failed: ${error.code || "provider error"}` };
  }
}

export async function sendSms({ to, body }) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    return { status: "skipped", detail: "SMS provider is not configured." };
  }
  try {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({ from: TWILIO_FROM_NUMBER, to, body });
    return { status: "submitted", detail: `Accepted by SMS provider (ID ${message.sid}).` };
  } catch (error) {
    console.error("SMS provider error:", error.message);
    return { status: "failed", detail: `SMS send failed: ${error.code || "provider error"}` };
  }
}
