import { decryptSecret } from "@/lib/secret-crypto";

export type StoreWooCredentials = {
  wooUrl: string | null;
  wooConsumerKey: string | null;
  wooConsumerSecret: string | null;
};

export function hasWooCredentials(store: StoreWooCredentials): boolean {
  return Boolean(store.wooUrl && store.wooConsumerKey && store.wooConsumerSecret);
}

export const canLoadWooVariations = hasWooCredentials;

export async function fetchLatestWooProducts(
  store: StoreWooCredentials,
  limit = 10,
): Promise<unknown[]> {
  return fetchWooProductsPage(store, {
    page: 1,
    perPage: limit,
    orderby: "date",
    order: "desc",
  });
}

/** Hämtar alla produkter från Woo (paginerat). */
export async function fetchAllWooProducts(
  store: StoreWooCredentials,
  perPage = 100,
): Promise<unknown[]> {
  const all: unknown[] = [];
  let page = 1;

  while (true) {
    const batch = await fetchWooProductsPage(store, { page, perPage });
    if (batch.length === 0) {
      break;
    }

    all.push(...batch);
    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return all;
}

async function fetchWooProductsPage(
  store: StoreWooCredentials,
  options: {
    page: number;
    perPage: number;
    orderby?: string;
    order?: string;
  },
): Promise<unknown[]> {
  const data = await wooApiGet(store, "/products", {
    page: String(options.page),
    per_page: String(options.perPage),
    ...(options.orderby ? { orderby: options.orderby } : {}),
    ...(options.order ? { order: options.order } : {}),
  });

  if (!Array.isArray(data)) {
    throw new Error("WooCommerce returnerade inga produkter");
  }

  return data;
}

export async function loadWooVariations(
  store: StoreWooCredentials,
  productId: number,
): Promise<unknown[]> {
  const data = await wooApiGet(store, `/products/${productId}/variations`, {
    per_page: "100",
  });

  return Array.isArray(data) ? data : [];
}

async function wooApiGet(
  store: StoreWooCredentials,
  path: string,
  query: Record<string, string> = {},
): Promise<unknown> {
  const url = buildWooApiUrl(store, path, query);
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `WooCommerce svarade ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }

  return response.json();
}

function buildWooApiUrl(
  store: StoreWooCredentials,
  path: string,
  query: Record<string, string>,
): string {
  const wooUrl = store.wooUrl?.replace(/\/$/, "");
  if (!wooUrl || !store.wooConsumerKey || !store.wooConsumerSecret) {
    throw new Error(
      "WooCommerce är inte konfigurerat för butiken. Fyll i URL och API-nycklar under Admin → Inställningar.",
    );
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${wooUrl}/wp-json/wc/v3${normalizedPath}`);
  url.searchParams.set("consumer_key", decryptSecret(store.wooConsumerKey));
  url.searchParams.set("consumer_secret", decryptSecret(store.wooConsumerSecret));

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}
