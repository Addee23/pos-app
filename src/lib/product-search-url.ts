export type ProductSearchParams = {
  q?: string;
  storeId?: string;
  category?: string;
  brand?: string;
  country?: string;
  page?: number;
};

export function buildProductSearchHref(
  basePath: string,
  params: ProductSearchParams,
): string {
  const search = new URLSearchParams();

  if (params.q?.trim()) {
    search.set("q", params.q.trim());
  }

  if (params.storeId) {
    search.set("storeId", params.storeId);
  }

  if (params.category) {
    search.set("category", params.category);
  }

  if (params.brand) {
    search.set("brand", params.brand);
  }

  if (params.country) {
    search.set("country", params.country);
  }

  if (params.page && params.page > 1) {
    search.set("page", String(params.page));
  }

  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}
