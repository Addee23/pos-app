"use client";

import { Suspense, useState } from "react";
import { ProductSearch } from "@/components/products/ProductSearch";
import {
  ProductSearchPopupClient,
  type SearchProduct,
} from "@/components/search/ProductSearchPopupClient";
import type { ProductFilterOptions } from "@/lib/product-filters";

type StoreOption = { id: string; name: string };

type Props = {
  products: SearchProduct[];
  hasQuery: boolean;
  searchToken: string;
  stores: StoreOption[];
  filterOptions: ProductFilterOptions;
  storeMetaLabels?: Record<string, Record<string, string>>;
  initialQuery: string;
  initialStoreId: string;
  initialCategory: string;
  initialBrand: string;
  initialCountry: string;
};

export function SökPageClient({
  products,
  hasQuery,
  searchToken,
  stores,
  filterOptions,
  storeMetaLabels = {},
  initialQuery,
  initialStoreId,
  initialCategory,
  initialBrand,
  initialCountry,
}: Props) {
  const [filterVersion, setFilterVersion] = useState(0);

  return (
    <>
      <Suspense>
        <ProductSearch
          basePath="/sok"
          submitOnButtonOnly
          showStoreFilter={stores.length > 1}
          stores={stores}
          filterOptions={filterOptions}
          initialQuery={initialQuery}
          initialStoreId={initialStoreId}
          initialCategory={initialCategory}
          initialBrand={initialBrand}
          initialCountry={initialCountry}
          onDraftChange={() => setFilterVersion((v) => v + 1)}
        />
      </Suspense>
      <ProductSearchPopupClient
        products={products}
        hasQuery={hasQuery}
        searchToken={searchToken}
        filterVersion={filterVersion}
        storeMetaLabels={storeMetaLabels}
      />
    </>
  );
}
