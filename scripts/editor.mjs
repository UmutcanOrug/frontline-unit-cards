import {MODULE_ID, readConfig, normalizeConfig, actorEffects, effectKey, effectKind} from "./core.mjs";

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
    this.element.querySelector("[data-fuc-preview]")?.addEventListener("click", () => {
      this.onPreview?.({...this.token, actor: this.actor, name: this.token.name}, this.readForm(this.element));
    });
    this.element.querySelectorAll("[data-fuc-pick]").forEach(button => button.addEventListener("click", () => {
      const input = this.element.querySelector(`[name="${button.dataset.fucPick}"]`);
      new foundry.applications.apps.FilePicker.implementation({type: "image", current: input.value,
        callback: path => {input.value = path; input.dispatchEvent(new Event("change", {bubbles: true}));}
      }).render({force: true});
    }));
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
