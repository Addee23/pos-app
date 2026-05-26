import {
  PRODUCT_BRANDS,
  PRODUCT_CATEGORIES,
  PRODUCT_COUNTRIES,
  taxonomySelectOptions,
} from "@/lib/product-taxonomy-options";

type TaxonomyFieldsProps = {
  category?: string | null;
  brand?: string | null;
  country?: string | null;
};

export function TaxonomyFields({
  category = "",
  brand = "",
  country = "",
}: TaxonomyFieldsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <TaxonomySelect
        label="Kategori"
        name="category"
        options={taxonomySelectOptions(PRODUCT_CATEGORIES, category)}
        defaultValue={category ?? ""}
        emptyLabel="Välj kategori"
      />
      <TaxonomySelect
        label="Varumärke"
        name="brand"
        options={taxonomySelectOptions(PRODUCT_BRANDS, brand)}
        defaultValue={brand ?? ""}
        emptyLabel="Välj varumärke"
      />
      <TaxonomySelect
        label="Ursprungsland"
        name="country"
        options={taxonomySelectOptions(PRODUCT_COUNTRIES, country)}
        defaultValue={country ?? ""}
        emptyLabel="Välj land"
      />
    </div>
  );
}

function TaxonomySelect({
  label,
  name,
  options,
  defaultValue,
  emptyLabel,
}: {
  label: string;
  name: string;
  options: string[];
  defaultValue: string;
  emptyLabel: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <div className="relative">
        <select
          name={name}
          defaultValue={defaultValue}
          className="min-h-11 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-9 text-sm font-normal text-zinc-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500/10"
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
          aria-hidden
        >
          ▾
        </span>
      </div>
    </label>
  );
}
