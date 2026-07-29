import { NextResponse } from "next/server";
import { getFollowUpClients } from "@/lib/client-book";
import { sendEmail } from "@/lib/email";
import type { ClientBook } from "@/lib/types";

// Wednesday-morning follow-up: emails Jesus the clients he's flagged for
// follow-up (the 🔵 list). Secured with CRON_SECRET; fires from Vercel Cron.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const clients = await getFollowUpClients("jesus");
    const to = process.env.FOLLOWUP_EMAIL || "JHEIRAS@monexusa.com";
    const base = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "";

    if (clients.length === 0) {
      return NextResponse.json({ ok: true, sent: false, reason: "no follow-ups flagged" });
    }

    await sendEmail({
      to,
      subject: `Follow-ups for this week (${clients.length})`,
      html: buildHtml(clients, base),
    });
    return NextResponse.json({ ok: true, sent: true, count: clients.length, to });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Follow-up email failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function esc(s: string): string {
  return s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c);
}

export function buildHtml(clients: ClientBook[], base: string): string {
  const rows = clients
    .map(
      (c) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;vertical-align:top;">${esc(c.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;font-size:13px;vertical-align:top;">${esc(c.last_follow_up ?? "—").replace(/\n/g, "<br>")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#555;vertical-align:top;">${esc(c.follow_up ?? "—")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#777;font-size:13px;vertical-align:top;">${esc(c.comments ?? "")}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:640px;margin:0 auto;color:#222;">
    <h2 style="margin:0 0 4px;">Good morning, Jesus 👋</h2>
    <p style="margin:0 0 16px;color:#555;">Here are the <strong>${clients.length}</strong> clients you flagged to follow up this week:</p>
    <table style="width:100%;border-collapse:collapse;border:1px solid #eee;">
      <thead>
        <tr style="background:#fafafa;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">
          <th style="padding:8px 12px;">Client</th>
          <th style="padding:8px 12px;">Last contact</th>
          <th style="padding:8px 12px;">Next follow-up</th>
          <th style="padding:8px 12px;">Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${
      base
        ? `<p style="margin:20px 0 0;"><a href="${base}/clients" style="background:#059669;color:#fff;text-decoration:none;padding:10px 18px;border-radius:4px;font-weight:600;">Open your Client Book →</a></p>`
        : ""
    }
    <p style="margin:20px 0 0;color:#aaa;font-size:12px;">FX Lead Terminal · to change who's on this list, set a client's status to "Chucho needs to follow up".</p>
  </div>`;
}
