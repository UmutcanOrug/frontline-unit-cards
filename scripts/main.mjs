import {MODULE_ID, readConfig, cardModel, cardHTML, cardPosition, canViewCard} from "./core.mjs";
import {UnitCardEditor} from "./editor.mjs";

const label = key => game.i18n.localize(`FUC.${key}`);

export class HoverCard {
  constructor() {
    this.token = null;
    this.element = null;
    this.timer = null;
    this.pointerInside = false;
    this.revision = 0;
    this.preview = false;
  }

  mount() {
    if (this.element) return;
    const element = document.createElement("aside");
    element.id = "frontline-unit-card";
    element.className = "fuc-card";
    element.hidden = true;
    element.setAttribute("role", "region");
    element.setAttribute("aria-label", label("Dossier"));
    element.addEventListener("pointerenter", () => {this.pointerInside = true; clearTimeout(this.timer);});
    element.addEventListener("pointerleave", () => {this.pointerInside = false; this.scheduleHide();});
    element.addEventListener("focusin", () => clearTimeout(this.timer));
    element.addEventListener("focusout", event => {
      if (!element.contains(event.relatedTarget)) this.scheduleHide();
    });
    element.addEventListener("error", event => {
      if (event.target.tagName === "IMG" && !event.target.dataset.fucFallback) {
        event.target.dataset.fucFallback = "true";
        event.target.src = event.target.classList.contains("fuc-portrait-image") ? "icons/svg/mystery-man.svg" : "icons/svg/aura.svg";
      }
    }, true);
    document.body.append(element);
    this.element = element;
    this.resizeObserver = new ResizeObserver(() => this.position());
    this.resizeObserver.observe(element);
    window.addEventListener("resize", () => this.position());
    document.addEventListener("keydown", event => {if (event.key === "Escape") this.hide();});
    document.addEventListener("pointerdown", event => {
      if (this.preview && !element.contains(event.target)) this.hide();
    });
    window.addEventListener("blur", () => this.hide());
  }

  allowed(token) {
    return game.settings.get(MODULE_ID, "enabled") && !token?.destroyed
      && canViewCard(token?.document, game.user, readConfig(token?.document), {visible: !!token?.isVisible});
  }

  hover(token, hovered) {
    if (!hovered) {
      if (this.token === token) this.scheduleHide();
      return;
    }
    clearTimeout(this.timer);
    this.pointerInside = false;
    if (!this.allowed(token)) {this.hide(); return;}
    this.token = token;
    this.preview = false;
    const revision = ++this.revision;
    this.timer = setTimeout(() => {
      if (revision === this.revision && this.allowed(token)) this.show(token.document);
    }, game.settings.get(MODULE_ID, "delay"));
  }

  scheduleHide() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.pointerInside && !this.element?.contains(document.activeElement)) this.hide();
    }, 260);
  }

  show(document, config = readConfig(document)) {
    this.mount();
    this.element.innerHTML = cardHTML(cardModel(document, config), label);
    this.element.style.width = `${config.width * game.settings.get(MODULE_ID, "scale")}px`;
    if (config.background) this.element.style.setProperty("--fuc-background", `url(${JSON.stringify(config.background)})`);
    else this.element.style.removeProperty("--fuc-background");
    this.element.hidden = false;
    this.position();
  }

  showPreview(document, config) {
    this.hide();
    this.preview = true;
    this.show(document, config);
  }

  position() {
    if (!this.element || this.element.hidden) return;
    const size = this.element.getBoundingClientRect();
    let anchor;
    if (this.token && !this.preview && canvas.ready) {
      const transform = canvas.stage.transform.worldTransform;
      const point = transform.apply(this.token.center);
      const view = (canvas.app.canvas ?? canvas.app.view)?.getBoundingClientRect() ?? {left: 0, top: 0};
      const width = this.token.w * Math.hypot(transform.a, transform.b);
      const height = this.token.h * Math.hypot(transform.c, transform.d);
      anchor = {left: point.x + view.left - width / 2, right: point.x + view.left + width / 2, top: point.y + view.top - height / 2};
    } else {
      anchor = {left: innerWidth / 2, right: innerWidth / 2, top: (innerHeight - size.height) / 2};
    }
    const position = cardPosition(anchor, size, {width: innerWidth, height: innerHeight});
    this.element.style.left = `${position.left}px`;
    this.element.style.top = `${position.top}px`;
  }

  refresh() {
    if (!this.token || this.preview || this.element?.hidden) return;
    if (!this.allowed(this.token)) this.hide();
    else this.show(this.token.document);
  }

  hide() {
    ++this.revision;
    clearTimeout(this.timer);
    if (this.element) this.element.hidden = true;
    this.token = null;
    this.pointerInside = false;
    this.preview = false;
  }
}

const hoverCard = new HoverCard();
const editors = new Map();

export function openEditor(token, {prototype = false, actor = token?.actor} = {}) {
  if (!token) return;
  const key = prototype ? `prototype-${actor.uuid}` : token.uuid;
  let editor = editors.get(key);
  if (!editor || !editor.rendered) {
    editor = new UnitCardEditor({token, actor, prototype, onPreview: (doc, config) => hoverCard.showPreview(doc, config)});
    editors.set(key, editor);
    editor.addEventListener("close", () => editors.delete(key), {once: true});
  }
  return editor.render({force: true});
}

function addConfigButton(app, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector("[data-fuc-config]")) return;
  const actor = app.actor;
  const token = app.isPrototype ? actor?.prototypeToken : app.document;
  if (!token || !(game.user.isGM || ((app.isPrototype ? actor?.isOwner : token.isOwner) && game.user.can("TOKEN_CONFIGURE")))) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.fucConfig = "true";
  button.className = "fuc-config-button";
  button.innerHTML = `<i class="fa-solid fa-id-card" aria-hidden="true"></i> ${label("Configure")}`;
  button.addEventListener("click", event => {
    event.preventDefault();
    void openEditor(token, {prototype: app.isPrototype, actor});
  });
  const footer = root.querySelector("footer.form-footer") ?? root.querySelector("footer");
  if (footer) footer.prepend(button);
  else root.querySelector(".window-content")?.append(button);
}

Hooks.once("init", () => {
  game.settings.register(MODULE_ID, "enabled", {name: "FUC.Settings.Enabled", hint: "FUC.Settings.EnabledHint", scope: "client", config: true, type: Boolean, default: true, onChange: () => hoverCard.hide()});
  game.settings.register(MODULE_ID, "delay", {name: "FUC.Settings.Delay", scope: "client", config: true, type: Number, default: 180, range: {min: 0, max: 1000, step: 20}});
  game.settings.register(MODULE_ID, "scale", {name: "FUC.Settings.Scale", scope: "client", config: true, type: Number, default: 1, range: {min: 0.7, max: 1.5, step: 0.05}, onChange: () => hoverCard.refresh()});
  game.keybindings.register(MODULE_ID, "configure", {
    name: "FUC.Configure", hint: "FUC.ShortcutHint", editable: [{key: "KeyU", modifiers: ["Shift"]}],
    onDown: () => {
      const token = canvas.ready && (canvas.tokens.hover ?? canvas.tokens.controlled[0]);
      if (!token) return false;
      void openEditor(token.document);
      return true;
    }
  });
});

Hooks.once("ready", () => {
  hoverCard.mount();
  game.modules.get(MODULE_ID).api = {
    configure: (token = canvas.tokens?.controlled[0]) => openEditor(token?.document ?? token),
    preview: token => hoverCard.showPreview(token?.document ?? token, readConfig(token?.document ?? token)),
    hide: () => hoverCard.hide()
  };
});
Hooks.on("hoverToken", (token, hovered) => hoverCard.hover(token, hovered));
Hooks.on("renderTokenConfig", addConfigButton);
Hooks.on("renderPrototypeTokenConfig", addConfigButton);
Hooks.on("canvasPan", () => hoverCard.position());
Hooks.on("canvasTearDown", () => hoverCard.hide());
Hooks.on("deleteToken", token => {if (hoverCard.token?.document === token) hoverCard.hide();});
Hooks.on("updateToken", token => {if (hoverCard.token?.document === token) hoverCard.refresh();});
Hooks.on("refreshToken", token => {
  if (hoverCard.token !== token || hoverCard.preview) return;
  if (!hoverCard.allowed(token)) hoverCard.hide();
  else hoverCard.position();
});
for (const event of ["updateActor", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect", "createItem", "updateItem", "deleteItem", "updateUser"]) {
  Hooks.on(event, () => hoverCard.refresh());
}
