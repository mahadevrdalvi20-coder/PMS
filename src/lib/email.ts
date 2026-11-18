import "server-only";
import { Resend } from "resend";

/**
 * Transactional e-mail via Resend.
 *
 * Why server-only: RESEND_API_KEY lets anyone send mail as you. Code that runs
 * in the browser is public, so the key may only ever be read on the server
 * (server actions and route handlers). `server-only` turns a mistake into a
 * build error.
 *
 * E-mail is a SIDE EFFECT, never a dependency: sendEmail() never throws. If
 * Resend is down or the key is missing, the appraisal still saves and we log
 * the problem.
 */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — skipped "${subject}" to ${to}`);
    return { sent: false };
  }
  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "Stride PMS <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error.message);
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
    return { sent: false };
  }
}

export function appUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null) ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path}`;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** One consistent, simple HTML layout for every e-mail. Inputs are escaped. */
export function emailTemplate(opts: { heading: string; lines: string[]; cta: { label: string; href: string } }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb">
      <tr><td style="padding:20px 28px;border-bottom:1px solid #e5e7eb;font-weight:700;color:#1e3a8a;font-size:16px">Stride · Performance</td></tr>
      <tr><td style="padding:28px">
        <h1 style="margin:0 0 16px;font-size:20px;color:#111827">${esc(opts.heading)}</h1>
        ${opts.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55">${esc(l)}</p>`).join("")}
        <p style="margin:24px 0 0"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600;font-size:14px">${esc(opts.cta.label)}</a></p>
      </td></tr>
      <tr><td style="padding:16px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">You are receiving this because you take part in a performance review cycle.</td></tr>
    </table>
  </td></tr></table></body></html>`;
}
