interface BrandLogoProps {
  /** Tailwind sizing classes; set a height (e.g. `h-9`) and the width follows the original 4:3 ratio. */
  className?: string;
  label?: string;
}

/**
 * Official Dezaakir logo. Rendered via a CSS mask of `/logo.png` so the original
 * geometry and proportions are untouched while the fill follows the theme:
 * White on Navy in Dark Mode, Navy on White in Light Mode.
 */
export function BrandLogo({ className = "h-9", label = "Dezaakir Logo" }: BrandLogoProps) {
  return <span role="img" aria-label={label} className={`brand-logo ${className}`} />;
}
