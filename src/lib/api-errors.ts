import { NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ error: "Ej inloggad" }, { status: 401 });
}

export function forbidden(message = "Åtkomst nekad") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function tooManyRequests(retryAfterSeconds: number, prefix?: string) {
  const base =
    prefix ??
    `För många förfrågningar. Vänta ${retryAfterSeconds} sekunder och försök igen.`;

  return NextResponse.json(
    { error: base },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    },
  );
}
