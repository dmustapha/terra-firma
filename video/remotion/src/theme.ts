import { loadFont as loadSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as loadSans } from "@remotion/google-fonts/PublicSans";
export const SERIF = loadSerif("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;
loadSerif("italic", { weights: ["400"], subsets: ["latin"] });
export const SANS = loadSans("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] }).fontFamily;
export const MONO = "ui-monospace, Menlo, monospace";
// Terra Firma tokens (DESIGN_SYSTEM.md, brand.json): almanac paper and ink, moss for confirmed, rust for the eroded meme layer
export const C = {
  paper: "#F1EBDD", paper2: "#E8E0CD", ink: "#1A1712", bg: "#110E0A", s1: "#17140F", s2: "#1F1B15", line: "#4B4438",
  text: "#ECE4D2", soft: "#BCB4A2", moss: "#3F6B4A", mossHi: "#86B391", rust: "#9B3B1F", rustHi: "#D07A55", sand: "#BCB4A2", warn: "#7A5512",
};
export const FPS = 30;
export const f = (s: number) => Math.round(s * FPS);
