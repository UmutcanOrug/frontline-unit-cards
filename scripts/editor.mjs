import {MODULE_ID, readConfig, normalizeConfig, actorEffects, effectKey, effectKind} from "./core.mjs";
import {THEMES, APPEARANCE_DEFAULTS} from "./appearance.mjs";

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;
const label = key => game.i18n.localize(`FUC.${key}`);

export class UnitCardEditor extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    tag: "form", classes: ["fuc-editor"],
    window: {title: "FUC.EditorTitle", icon: "fa-solid fa-id-card", resizable: true},
    position: {width: 640, height: 760},
    form: {closeOnSubmit: false, handler: UnitCardEditor.submitCard}
  };
  static PARTS = {body: {template: `modules/${MODULE_ID}/templates/editor.hbs`}};

  constructor({token, actor = token?.actor, prototype = false, onPreview, ...options}) {
    super(options);
    this.token = token;
    this.actor = actor;
    this.prototype = prototype;
    this.onPreview = onPreview;
    this.previewOpen = false;
  }

  get canEdit() {
    return game.user.isGM || (game.user.can("TOKEN_CONFIGURE") && (this.prototype ? this.actor?.isOwner : this.token?.isOwner));
  }

  _canRender(options) {
    if (!this.canEdit) return false;
    return super._canRender(options);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const token = this.prototype ? this.actor.prototypeToken : this.token;
    const config = readConfig(token);
    return {...context, config, tokenName: token.name || this.actor?.name,
      prototype: this.prototype,
      customTheme: config.theme === "custom",
      themeOptions: [...Object.keys(THEMES), "custom"].map(value => ({value, label: label(`Theme.${value}`), selected: value === config.theme})),
      themeSwatches: Object.entries(THEMES).map(([value, palette]) => ({value, name: label(`Theme.${value}`), color: palette.base, accent: palette.accent, selected: value === config.theme})),
      fitOptions: ["cover", "contain", "stretch"].map(value => ({value, label: label(`Fit.${value}`), selected: value === config.backgroundFit})),
      positionOptions: ["center", "top", "bottom", "left", "right"].map(value => ({value, label: label(`Position.${value}`), selected: value === config.backgroundPosition})),
      visibilityOptions: ["all", "observer", "owner", "gm"].map(value => ({value, label: label(`Visibility.${value}`), selected: value === config.visibility})),
      effects: actorEffects(this.actor).map((effect, index) => ({
        index, key: effectKey(effect), name: effect.name, img: effect.img || "icons/svg/aura.svg",
        disabled: effect.disabled || effect.isSuppressed,
        options: ["auto", "passive", "active", "hidden"].map(value => ({value, label: label(`Kind.${value}`), selected: value === (config.effectKinds[effectKey(effect)] ?? config.effectKinds[effect.id] ?? "auto")})),
        automatic: label(`Kind.${effectKind(effect, {...config, effectKinds: {}})}`)
      }))};
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const form = this.element;
    const updateAppearance = () => {
      form.querySelector("[data-fuc-custom-colors]").hidden = form.elements.theme.value !== "custom";
      for (const button of form.querySelectorAll("[data-fuc-theme]")) button.setAttribute("aria-pressed", String(button.dataset.fucTheme === form.elements.theme.value));
      for (const output of form.querySelectorAll("output[data-fuc-value-for]")) output.value = `${form.elements[output.dataset.fucValueFor].value}${output.dataset.unit}`;
      if (this.previewOpen) this.refreshPreview();
    };
    form.addEventListener("input", updateAppearance);
    form.addEventListener("change", updateAppearance);
    form.querySelectorAll("[data-fuc-preview]").forEach(button => button.addEventListener("click", () => {this.previewOpen = true; this.refreshPreview();}));
    form.querySelectorAll("[data-fuc-theme]").forEach(button => button.addEventListener("click", () => {
      form.elements.theme.value = button.dataset.fucTheme;
      updateAppearance();
    }));
    form.querySelector("[data-fuc-reset-appearance]")?.addEventListener("click", () => {
      for (const [key, value] of Object.entries(APPEARANCE_DEFAULTS)) form.elements[key].value = value;
      updateAppearance();
    });
    this.element.querySelectorAll("[data-fuc-pick]").forEach(button => button.addEventListener("click", () => {
      const input = this.element.querySelector(`[name="${button.dataset.fucPick}"]`);
      new foundry.applications.apps.FilePicker.implementation({type: "image", current: input.value,
        callback: path => {input.value = path; input.dispatchEvent(new Event("change", {bubbles: true}));}
      }).render({force: true});
    }));
  }

  refreshPreview() {
    this.onPreview?.({...this.token, actor: this.actor, name: this.token.name}, this.readForm(this.element), this.element.getBoundingClientRect());
  }

  readForm(form) {
    const data = new FormData(form);
    const effectKinds = {...readConfig(this.prototype ? this.actor.prototypeToken : this.token).effectKinds};
    for (const select of form.querySelectorAll("select[data-effect-key]")) {
      effectKinds[select.dataset.effectKey] = select.value;
    }
    return normalizeConfig({
      ...Object.fromEntries(data), enabled: data.has("enabled"), showHealth: data.has("showHealth"),
      showEffects: data.has("showEffects"), effectKinds
    });
  }

  static async submitCard(event, form) {
    if (!this.canEdit) return;
    const config = this.readForm(form);
    const path = `flags.${MODULE_ID}.card`;
    try {
      if (this.prototype) await this.actor.update({[`prototypeToken.${path}`]: config});
      else await this.token.update({[path]: config});
      ui.notifications.info(label("Saved"));
      await this.close();
    } catch (error) {
      console.error(`${MODULE_ID} | Save failed`, error);
      ui.notifications.error(label("SaveFailed"));
    }
  }
}
