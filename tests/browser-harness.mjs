import {MODULE_ID, readConfig} from "../scripts/core.mjs";

const callbacks = new Map();
globalThis.Hooks = {on(name, callback) {if (!callbacks.has(name)) callbacks.set(name, []); callbacks.get(name).push(callback);}, once(name, callback) {this.on(name, callback);}, callAll(name, ...args) {for (const callback of callbacks.get(name) ?? []) callback(...args);}};
const translations = (await (await fetch("/lang/tr.json")).json()).FUC;
const localize = key => key.split(".").slice(1).reduce((o, k) => o?.[k], translations) ?? key;
const values = new Map();
const module = {};
globalThis.game = {
  user: {isGM: true, can: () => true}, modules: new Map([[MODULE_ID, module]]),
  i18n: {localize}, keybindings: {register() {}},
  settings: {register(id, key, options) {values.set(key, options.default);}, get(id, key) {return values.get(key);}}
};
globalThis.ui = {notifications: {info: text => {document.querySelector("#test-output").textContent = text;}, error: text => {throw new Error(text);}}};
Handlebars.registerHelper("localize", key => localize(key));
Handlebars.registerHelper("checked", value => value ? "checked" : "");

class PreviewApplication extends EventTarget {
  constructor(options) {super(); this.options = options; this.rendered = false;}
  _canRender() {return true;}
  async _prepareContext() {return {};}
  async _onRender() {}
  async render() {
    if (this._canRender() === false) return;
    this.element?.remove();
    const form = document.createElement("form");
    form.className = "fuc-editor";
    const context = await this._prepareContext({});
    const template = await (await fetch("/templates/editor.hbs")).text();
    form.innerHTML = `<div class="window-content">${Handlebars.compile(template)(context)}</div>`;
    this.element = form;
    form.addEventListener("submit", event => {event.preventDefault(); void this.constructor.DEFAULT_OPTIONS.form.handler.call(this, event, form);});
    document.body.append(form); this.rendered = true;
    await this._onRender(context, {});
  }
  async close() {this.element?.remove(); this.rendered = false; this.dispatchEvent(new Event("close"));}
}
globalThis.foundry = {applications: {api: {ApplicationV2: PreviewApplication, HandlebarsApplicationMixin: Base => Base}, apps: {FilePicker: {implementation: class {constructor(options) {this.options = options;} render() {this.options.callback("tests/tank.svg");}}}}}};

const actor = {
  name: "Demir Muhafız", img: "tests/tank.svg", uuid: "Actor.A", isOwner: true,
  system: {wounds: {value: 1, max: 4}},
  effects: [
    {id: "armor", uuid: "Actor.A.ActiveEffect.armor", name: "Zırhlı Gövde", img: "icons/svg/shield.svg", isTemporary: false},
    {id: "veteran", uuid: "Actor.A.ActiveEffect.veteran", name: "Deneyimli Mürettebat", img: "icons/svg/upgrade.svg", isTemporary: false},
    {id: "inspire", uuid: "Actor.A.ActiveEffect.inspire", name: "İleri Harekât", img: "icons/svg/sword.svg", isTemporary: true}
  ],
  *allApplicableEffects() {yield* this.effects;},
  testUserPermission: () => true,
  async update(changes) {this.lastUpdate = changes; this.prototypeToken.flags[MODULE_ID].card = changes[`prototypeToken.flags.${MODULE_ID}.card`];}
};
const doc = {
  actor, name: actor.name, uuid: "Scene.S.Token.T", isOwner: true, texture: {src: "tests/tank.svg"},
  flags: {[MODULE_ID]: {card: {faction: "Astar İmparatorluğu · 4. Zırhlı Alay", name: "Demir Muhafız", description: "Doğu cephesinin çamurlu yollarında ilerleyen bu ağır tank, Astar'ın çelikten iradesini taşır.\n\nKalın zırhı ve disiplinli mürettebatıyla ön hattın dayanağıdır. Motorunun sesi, piyadeye yalnız olmadığını hatırlatır.", specialty: "Ön hattı tutmak ve piyade ilerleyişini desteklemek için üretilmiştir."}}},
  getFlag(id, key) {return this.flags[id]?.[key];},
  async update(changes) {this.lastUpdate = changes; this.flags[MODULE_ID].card = changes[`flags.${MODULE_ID}.card`]; Hooks.callAll("updateToken", this);}
};
actor.prototypeToken = {name: actor.name, parent: actor, flags: structuredClone(doc.flags)};
const token = {document: doc, isVisible: true, destroyed: false, w: 66, h: 66, get center() {const rect = document.querySelector("#unit").getBoundingClientRect(); return {x: rect.x + 33, y: rect.y + 33};}};
globalThis.canvas = {ready: true, tokens: {controlled: [token], hover: token}, app: {canvas: {getBoundingClientRect: () => ({left: 0, top: 0})}}, stage: {transform: {worldTransform: {a: 1, b: 0, c: 0, d: 1, apply: p => p}}}};
const {HoverCard, openEditor} = await import("../scripts/main.mjs");
Hooks.callAll("init"); Hooks.callAll("ready");
const open = () => Hooks.callAll("hoverToken", token, true);
document.querySelector("#unit").addEventListener("pointerenter", open);
document.querySelector("#unit").addEventListener("pointerleave", () => Hooks.callAll("hoverToken", token, false));
document.querySelector("#unit").addEventListener("click", open);
document.querySelector("#open-card").addEventListener("click", open);
for (const [id, amount] of [["wound-add", 1], ["wound-remove", -1]]) document.getElementById(id).addEventListener("click", () => {
  actor.system.wounds.value = Math.max(0, actor.system.wounds.value + amount); Hooks.callAll("updateActor", actor); open();
});
document.querySelector("#edit-card").addEventListener("click", () => openEditor(doc));
document.querySelector("#move-edge").addEventListener("click", () => {
  const unit = document.querySelector("#unit"); unit.style.left = `${innerWidth - 100}px`; Hooks.callAll("canvasPan"); open();
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
document.querySelector("#run-tests").addEventListener("click", async () => {
  const results = [];
  const assert = (value, message) => {if (!value) throw new Error(message); results.push(`✓ ${message}`);};
  try {
    module.api.hide(); values.set("delay", 0);
    open(); await wait(20);
    const card = document.querySelector("#frontline-unit-card");
    assert(!card.hidden && card.querySelector("h2").textContent === "Demir Muhafız", "Token hover kartı açıyor");
    actor.system.wounds.value = 2; Hooks.callAll("updateActor", actor);
    assert(card.querySelector(".fuc-health > span").style.width === "50%", "Yara değişikliği açık karta yansıyor");
    doc.hidden = true; game.user.isGM = false; Hooks.callAll("updateToken", doc);
    assert(card.hidden, "Gizli token oyuncuya gösterilmiyor");
    doc.hidden = false; game.user.isGM = true;
    values.set("delay", 70); open(); Hooks.callAll("hoverToken", token, false); await wait(100);
    assert(card.hidden, "Hover bitince gecikmiş kart açılmıyor");
    values.set("delay", 0); open(); await wait(10);
    document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"}));
    assert(card.hidden, "Escape kartı kapatıyor");
    await openEditor(doc);
    const form = document.querySelector(".fuc-editor");
    form.elements.name.value = "Test birliği";
    form.querySelector("select[data-effect-key]").value = "active";
    form.requestSubmit(); await wait(20);
    assert(readConfig(doc).name === "Test birliği" && readConfig(doc).effectKinds["ActiveEffect.armor"] === "active", "Token ayarları ve etki grupları kaydediliyor");
    assert(Object.keys(doc.lastUpdate).length === 1 && Object.keys(doc.lastUpdate)[0] === `flags.${MODULE_ID}.card`, "Kaydetme yalnızca modun token alanını değiştiriyor");
    await openEditor(actor.prototypeToken, {prototype: true, actor});
    const prototypeForm = document.querySelector(".fuc-editor");
    prototypeForm.elements.name.value = "Prototype birliği"; prototypeForm.requestSubmit(); await wait(20);
    assert(actor.prototypeToken.flags[MODULE_ID].card.name === "Prototype birliği" && readConfig(doc).name === "Test birliği", "Prototype kaydı mevcut sahne tokenını değiştirmiyor");
    doc.flags[MODULE_ID].card.name = "Demir Muhafız";
    doc.flags[MODULE_ID].card.effectKinds = {};
    actor.system.wounds.value = 1; values.set("delay", 180);
    open();
    document.querySelector("#test-output").textContent = `${results.join("\n")}\n${results.length} / ${results.length} başarılı`;
  } catch (error) {document.querySelector("#test-output").textContent = `FAIL: ${error.stack}`; console.error(error);}
});
open();
