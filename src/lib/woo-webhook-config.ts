export type WooWebhookMode = "test" | "production";

/** test = alla ordrar räknas som upphämtning (lokal utveckling). production = riktig Woo-butik. */
export function getWooWebhookMode(): WooWebhookMode {
  return process.env.WOOCOMMERCE_WEBHOOK_MODE === "test" ? "test" : "production";
}

export function isWooWebhookTestMode(): boolean {
  return getWooWebhookMode() === "test";
}

/** Endast i development + test-läge: webhook utan Woo-signatur (simulate-skript). */
export function canSkipWooWebhookSignature(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    isWooWebhookTestMode() &&
    process.env.WOOCOMMERCE_WEBHOOK_SKIP_SIGNATURE === "true"
  );
}

/** method_id från Woo shipping_lines som ska skapa upphämtning (production). */
export function getPickupShippingMethodIds(): string[] {
  const raw =
    process.env.WOO_PICKUP_SHIPPING_METHOD_IDS ??
    "local_pickup,pickup_location,legacy_local_pickup";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}
