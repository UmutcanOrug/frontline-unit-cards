import test from "node:test";
import assert from "node:assert/strict";
import {normalizeConfig} from "../scripts/core.mjs";
import {THEMES, normalizeAppearance, appearanceStyles} from "../scripts/appearance.mjs";

test("old cards receive classic appearance and keep their content and image", () => {
  const config = normalizeConfig({name: "Panthera", background: "assets/tank.webp", description: "Lore"});
  assert.equal(config.theme, "classic");
  assert.equal(config.backgroundOpacity, 100);
  assert.equal(config.backgroundDarkness, 60);
  assert.equal(config.backgroundBlur, 0);
  assert.equal(config.backgroundBrightness, 100);
  assert.equal(config.background, "assets/tank.webp");
  assert.equal(config.description, "Lore");
});

test("appearance rejects invalid colors and keeps image controls within bounds", () => {
  const config = normalizeAppearance({theme: "constructor", cardColor: "red;opacity:0", accentColor: "#f00", backgroundOpacity: -20, backgroundDarkness: 500, backgroundBlur: 80, backgroundBrightness: "bad", backgroundFit: "url(x)", backgroundPosition: "left;display:none"});
  assert.equal(config.theme, "classic");
  assert.equal(config.cardColor, "#171d1a");
  assert.equal(config.accentColor, "#c7ad76");
  assert.equal(config.backgroundOpacity, 0);
  assert.equal(config.backgroundDarkness, 100);
  assert.equal(config.backgroundBlur, 12);
  assert.equal(config.backgroundBrightness, 100);
  assert.equal(config.backgroundFit, "cover");
  assert.equal(config.backgroundPosition, "center");
  assert.equal(appearanceStyles({background: "javascript:alert(1)"})["--fuc-background-image"], "none");
});

test("all presets and custom colors resolve independently of image opacity", () => {
  for (const [theme, palette] of Object.entries(THEMES)) {
    const styles = appearanceStyles({theme, backgroundOpacity: 0});
    assert.equal(styles["--fuc-base"], palette.base);
    assert.equal(styles["--fuc-brass"], palette.accent);
    assert.equal(styles["--fuc-image-opacity"], "0");
  }
  const styles = appearanceStyles({theme: "custom", cardColor: "#EFE2CB", accentColor: "#513123", backgroundOpacity: 37, backgroundBlur: 2.5, backgroundFit: "stretch", backgroundPosition: "top"});
  assert.equal(styles["--fuc-base"], "#efe2cb");
  assert.equal(styles["--fuc-ink"], "#202820");
  assert.equal(styles["--fuc-image-opacity"], "0.37");
  assert.equal(styles["--fuc-image-blur"], "2.5px");
  assert.equal(styles["--fuc-image-size"], "100% 100%");
  assert.equal(styles["--fuc-image-position"], "top");
});

test("Foundry image paths resolve against the document base, including route prefixes", () => {
  const styles = appearanceStyles({background: "assets/My Tank.webp"}, "https://foundry.example/tabletop/");
  assert.equal(styles["--fuc-background-image"], 'url("https://foundry.example/tabletop/assets/My%20Tank.webp")');
  assert.equal(appearanceStyles({background: "https://bad[host/image.png"}, "https://foundry.example/")["--fuc-background-image"], "none");
});
