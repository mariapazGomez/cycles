import { loadFont as loadDisplay } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadText } from "@remotion/google-fonts/Inter";

// Colores de marca (docs/brand/identidad-visual.md).
export const BLUE = "#3080fc";
export const INK = "#1f2228";
export const WHITE = "#ffffff";
export const MUTED = "#9aa3b2";
export const FPS = 30;
export const DURATION = 58.14; // segundos: igual al video original

export const display = loadDisplay("normal", { weights: ["700", "800"], ignoreTooManyRequestsWarning: true }).fontFamily;
export const text = loadText("normal", { weights: ["500", "600", "700"], ignoreTooManyRequestsWarning: true }).fontFamily;
