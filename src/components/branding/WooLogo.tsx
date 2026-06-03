type WooLogoProps = {
  /** Vit logo på mörk/lila bakgrund */
  inverted?: boolean;
  className?: string;
};

/** Officiell Woo-wordmark från WooCommerce (plugins/woocommerce/assets/images/woo-logo.svg). */
export function WooLogo({ inverted = false, className = "h-[13px] w-auto" }: WooLogoProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/woo-logo.svg"
      alt=""
      aria-hidden
      className={`${className}${inverted ? " brightness-0 invert" : ""}`}
    />
  );
}
