import { NextResponse } from "next/server";
import { createAdminSession, verifyAdminPassword } from "../../../admin-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");

  if (!await verifyAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin?error=invalid", request.url), 303);
  }

  await createAdminSession();
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
