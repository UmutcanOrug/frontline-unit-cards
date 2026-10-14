import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJSON = file => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const keys = (value, prefix = "") => Object.entries(value).flatMap(([key, v]) => typeof v === "object" ? keys(v, `${prefix}${key}.`) : `${prefix}${key}`);

test("manifest references packaged files and English/Turkish translations match", () => {
  const manifest = readJSON("module.json");
  assert.equal(manifest.id, "frontline-unit-cards");
  assert.equal(manifest.version, readJSON("package.json").version);
  assert.equal(manifest.compatibility.maximum, "13");
  for (const file of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(language => language.path), "templates/editor.hbs"]) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  const english = keys(readJSON("lang/en.json"));
  assert.deepEqual(keys(readJSON("lang/tr.json")).sort(), english.sort());
  const template = fs.readFileSync(path.join(root, "templates/editor.hbs"), "utf8");
  for (const match of template.matchAll(/localize ["']([^"']+)["']/g)) assert.ok(english.includes(match[1]), match[1]);
});
