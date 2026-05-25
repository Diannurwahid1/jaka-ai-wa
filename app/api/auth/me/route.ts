import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth";
import { getBusinessById } from "@/lib/business";

export async function GET() {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ ok: false, authenticated: false }, { status: 401 });
  }

  const business = session.businessId ? await getBusinessById(session.businessId) : null;

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: session.sub,
      email: session.email,
      businessId: session.businessId
    },
    business
  });
}
