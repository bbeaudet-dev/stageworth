/** Pulled from Icon Kitchen artwork (blue → purple gradient). */
export const BRAND_BLUE = "#536DFE";
export const BRAND_PURPLE = "#673AB7";

/** PWA splash / Chrome theme: use the deeper end of the gradient. */
export const BRAND_THEME_COLOR = BRAND_PURPLE;

/** Manifest `background_color` should match the first paint users see with the icon. */
export const BRAND_SPLASH_BACKGROUND = BRAND_BLUE;

export const BRAND_GRADIENT_STYLE = {
  background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_PURPLE} 100%)`,
} as const;
