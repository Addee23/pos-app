import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadPickupDashboard } from "@/lib/pickup-dashboard-data";
import { rateLimit } from "@/lib/rate-limit";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
  }

  if (!session.user.storeId) {
    return NextResponse.json(
      { error: "Användaren saknar butik" },
      { status: 400 },
    );
  }

  const refreshLimit = rateLimit({
    key: `pickup-dashboard:${session.user.id}`,
    limit: 90,
    windowMs: 60 * 1000,
  });

  if (!refreshLimit.allowed) {
    return NextResponse.json(
      {
        error: `För många uppdateringar. Vänta ${refreshLimit.retryAfterSeconds} sekunder.`,
      },
      { status: 429 },
    );
  }

  const dashboard = await loadPickupDashboard(session.user.storeId);
  return NextResponse.json(dashboard);
}
