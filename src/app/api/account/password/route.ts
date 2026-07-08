import { NextResponse } from "next/server";
import { getSessionUser, getUserByUsername, updateUserPassword } from "@/lib/users";
import { hashPassword, verifyPassword } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const full = await getUserByUsername(user.username);
    if (!full) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const ok = await verifyPassword(String(currentPassword ?? ""), full.password_hash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 403 });
    }

    await updateUserPassword(user.username, await hashPassword(newPassword));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to change password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
