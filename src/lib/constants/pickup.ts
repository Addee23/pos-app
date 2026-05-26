/** Testadress tills riktig butiksadress är ifylld i inställningar. */
export const DEFAULT_TEST_PICKUP_ADDRESS =
  "Drottninggatan 71, 111 36 Stockholm, Sverige";

export function resolvePickupAddress(address: string | null | undefined): string {
  const trimmed = address?.trim();
  return trimmed || DEFAULT_TEST_PICKUP_ADDRESS;
}
