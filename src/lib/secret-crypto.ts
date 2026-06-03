import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";

export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptSecret(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".");

  if (!ivText || !tagText || !encryptedText) {
    throw new Error("INVALID_SECRET_FORMAT");
  }

  const decipher = createDecipheriv(
    algorithm,
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** Maskerad visning: stjärnor + sista fyra tecken (t.ex. ************6334). */
export function maskSecretLastFour(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const tail = trimmed.slice(-4);
  const hiddenLength = Math.max(trimmed.length - 4, 12);
  return "*".repeat(hiddenLength) + tail;
}

export function previewSecretLastFour(
  encrypted: string | null | undefined,
): string | null {
  if (!encrypted) {
    return null;
  }

  try {
    const masked = maskSecretLastFour(decryptSecret(encrypted));
    return masked || null;
  } catch {
    return null;
  }
}

/** Tom sträng = behåll sparad nyckel (ignorera maskerad visning i fältet). */
export function normalizeSecretFormValue(
  raw: FormDataEntryValue | null | undefined,
  savedMask: string | null,
): string {
  const value = String(raw ?? "").trim();
  if (!value || (savedMask && value === savedMask)) {
    return "";
  }

  return value;
}

function encryptionKey(): Buffer {
  const secret =
    process.env.AUTH_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.DATABASE_URL ??
    "local-development-secret";

  return createHash("sha256").update(secret).digest();
}
