import {clamp, finite, imagePath} from "./utils.mjs";

export const THEMES = Object.freeze({
  classic: {base: "#171d1a", shade: "#30342f", accent: "#c7ad76", ink: "#d5d7ca", title: "#f2ead4", muted: "#9ba18b"},
  olive: {base: "#253022", shade: "#46503a", accent: "#b5bd7b", ink: "#d9dfc8", title: "#f2f0d9", muted: "#a4b094"},
  steel: {base: "#202930", shade: "#3c4955", accent: "#a8bdca", ink: "#d5dde3", title: "#eef3f7", muted: "#98a7b3"},
  sand: {base: "#40372a", shade: "#69563c", accent: "#d7b779", ink: "#e7d8bc", title: "#fff0d4", muted: "#baac91"},
  crimson: {base: "#321e21", shade: "#513237", accent: "#cd977c", ink: "#e8d0c5", title: "#ffebdd", muted: "#b99893"},
  navy: {base: "#182737", shade: "#31445d", accent: "#8fb5d5", ink: "#cddae9", title: "#e9f3ff", muted: "#90a4bc"}
});
export const APPEARANCE_DEFAULTS = Object.freeze({
  theme: "classic", cardColor: "#171d1a", accentColor: "#c7ad76",
  backgroundOpacity: 100, backgroundDarkness: 60, backgroundBrightness: 100,
  backgroundBlur: 0, backgroundFit: "cover", backgroundPosition: "center"
});
const color = (value, fallback) => typeof value === "string" && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
const channels = hex => [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16));

export function normalizeAppearance(data = {}) {
  return {
    theme: Object.hasOwn(THEMES, data.theme) || data.theme === "custom" ? data.theme : "classic",
    cardColor: color(data.cardColor, APPEARANCE_DEFAULTS.cardColor),
    accentColor: color(data.accentColor, APPEARANCE_DEFAULTS.accentColor),
    backgroundOpacity: clamp(finite(data.backgroundOpacity, 100), 0, 100),
    backgroundDarkness: clamp(finite(data.backgroundDarkness, 60), 0, 100),
    backgroundBrightness: clamp(finite(data.backgroundBrightness, 100), 20, 180),
    backgroundBlur: clamp(finite(data.backgroundBlur, 0), 0, 12),
    backgroundFit: ["cover", "contain", "stretch"].includes(data.backgroundFit) ? data.backgroundFit : "cover",
    backgroundPosition: ["center", "top", "bottom", "left", "right"].includes(data.backgroundPosition) ? data.backgroundPosition : "center"
  };
}

export function appearanceStyles(value = {}, baseURI) {
  const config = normalizeAppearance(value);
  let background = imagePath(value.background);
  // CSS resolves relative URLs inside variables against the stylesheet URL.
  // Resolve Foundry media paths against the document's route/base instead.
  if (background && baseURI) {
    try {background = new URL(background, baseURI).href;} catch {background = "";}
  }
  let palette = THEMES[config.theme];
  if (config.theme === "custom") {
    const rgb = channels(config.cardColor);
    const light = rgb.reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0) > 150;
    const shade = `#${rgb.map(channel => Math.round(channel * .8 + (light ? 0 : 28)).toString(16).padStart(2, "0")).join("")}`;
    palette = {base: config.cardColor, shade, accent: config.accentColor,
      ink: light ? "#202820" : "#e4e5d9", title: light ? "#111811" : "#fff1da", muted: light ? "#425042" : "#adb5a6"};
  }
  return {
    "--fuc-base": palette.base, "--fuc-shade": palette.shade, "--fuc-brass": palette.accent,
    "--fuc-accent-rgb": channels(palette.accent).join(","),
    "--fuc-ink": palette.ink, "--fuc-title": palette.title, "--fuc-muted": palette.muted,
    "--fuc-background-image": background ? `url(${JSON.stringify(background)})` : "none",
    "--fuc-image-opacity": String(config.backgroundOpacity / 100),
    "--fuc-image-darkness": String(config.backgroundDarkness / 100),
    "--fuc-image-brightness": `${config.backgroundBrightness}%`,
    "--fuc-image-blur": `${config.backgroundBlur}px`,
    "--fuc-image-size": config.backgroundFit === "stretch" ? "100% 100%" : config.backgroundFit,
    "--fuc-image-position": config.backgroundPosition
  };
}
