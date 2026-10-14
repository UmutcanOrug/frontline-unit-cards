import {APPEARANCE_DEFAULTS, normalizeAppearance} from "./appearance.mjs";
import {clamp, finite, imagePath} from "./utils.mjs";
export {clamp, finite, imagePath} from "./utils.mjs";

export const MODULE_ID = "frontline-unit-cards";
export const DEFAULTS = Object.freeze({
  enabled: true, name: "", faction: "", description: "", specialty: "",
  portrait: "", background: "", width: 470, visibility: "all",
  showHealth: true, showEffects: true, effectKinds: {}, ...APPEARANCE_DEFAULTS
});

const string = (value, limit) => typeof value === "string" ? value.trim().slice(0, limit) : "";

export function normalizeConfig(value = {}) {
  const data = value && typeof value === "object" ? value : {};
  const effectKinds = Object.fromEntries(Object.entries(data.effectKinds ?? {})
    .filter(([key, kind]) => key.length < 500 && ["auto", "passive", "active", "hidden"].includes(kind)));
  return {
    ...normalizeAppearance(data),
    enabled: data.enabled !== false,
    name: string(data.name, 180), faction: string(data.faction, 180),
    description: string(data.description, 12000), specialty: string(data.specialty, 500),
    portrait: imagePath(data.portrait), background: imagePath(data.background),
    width: clamp(finite(data.width, DEFAULTS.width), 340, 720),
    visibility: ["all", "observer", "owner", "gm"].includes(data.visibility) ? data.visibility : "all",
    showHealth: data.showHealth !== false, showEffects: data.showEffects !== false, effectKinds
  };
}

export function readConfig(token) {
  return normalizeConfig(token?.getFlag?.(MODULE_ID, "card") ?? token?.flags?.[MODULE_ID]?.card);
}

export function woundState(actor) {
  const wounds = actor?.system?.wounds;
  if (!wounds || !Number.isFinite(Number(wounds.value)) || wounds.value == null) return null;
  // SWADE Extras have max=0: they are healthy until their first wound.
  const max = Math.max(1, finite(wounds.max, 3));
  const value = Math.max(0, finite(wounds.value));
  const remaining = Math.max(0, max - value);
  const percent = clamp(remaining / max * 100, 0, 100);
  return {value, max, remaining, percent, level: percent > 50 ? "healthy" : percent > 25 ? "hurt" : "critical"};
}

export function actorEffects(actor) {
  if (!actor) return [];
  const effects = typeof actor.allApplicableEffects === "function"
    ? Array.from(actor.allApplicableEffects()) : Array.from(actor.effects ?? []);
  return Array.from(new Map(effects.map(effect => [effect.uuid ?? effect.id, effect])).values());
}

// Stable across prototype -> scene copies, including synthetic unlinked actors.
export const effectKey = effect => effect.uuid?.match(/(?:Item\.[^.]+\.)?ActiveEffect\.[^.]+$/)?.[0] ?? effect.id;
export function effectKind(effect, config) {
  const kind = config.effectKinds[effectKey(effect)] ?? config.effectKinds[effect.id];
  return kind && kind !== "auto" ? kind : (effect.isTemporary ? "active" : "passive");
}

export function groupedEffects(actor, config) {
  const result = {passive: [], active: []};
  if (!config.showEffects) return result;
  for (const effect of actorEffects(actor)) {
    if (effect.disabled || effect.isSuppressed || effect.active === false) continue;
    const kind = effectKind(effect, config);
    if (kind === "hidden") continue;
    result[kind].push({
      key: effectKey(effect), name: string(effect.name, 180),
      img: imagePath(effect.img) || "icons/svg/aura.svg"
    });
  }
  return result;
}

export function canViewCard(token, user, config, {visible = true} = {}) {
  if (!config.enabled || !user || !visible || (token?.hidden && !user.isGM)) return false;
  if (user.isGM) return true;
  if (config.visibility === "gm") return false;
  if (config.visibility === "owner") return !!token?.actor?.testUserPermission?.(user, "OWNER");
  if (config.visibility === "observer") return !!token?.actor?.testUserPermission?.(user, "OBSERVER");
  return true;
}

export function cardModel(token, config = readConfig(token)) {
  return {
    ...config,
    name: config.name || token.actor?.name || token.name || "",
    portrait: config.portrait || imagePath(token.actor?.img) || imagePath(token.texture?.src) || "icons/svg/mystery-man.svg",
    health: config.showHealth ? woundState(token.actor) : null,
    ...groupedEffects(token.actor, config)
  };
}

export function cardPosition(anchor, size, viewport) {
  const margin = 12, gap = 18;
  let left = anchor.right + gap;
  if (left + size.width > viewport.width - margin) left = anchor.left - size.width - gap;
  return {
    left: clamp(left, margin, Math.max(margin, viewport.width - size.width - margin)),
    top: clamp(anchor.top, margin, Math.max(margin, viewport.height - size.height - margin))
  };
}

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

export function cardHTML(model, label) {
  const esc = escapeHTML;
  const effects = (items, group) => items.map(effect => `<span class="fuc-effect fuc-effect--${group}" tabindex="0" aria-label="${esc(effect.name)}"><img src="${esc(effect.img)}" alt=""><span class="fuc-effect-tip" role="tooltip">${esc(effect.name)}</span></span>`).join("");
  const health = model.health;
  return `<div class="fuc-frame">
    <div class="fuc-background" aria-hidden="true"${model.background ? "" : " hidden"}></div>
    <div class="fuc-portrait-column">
      <div class="fuc-portrait"><img class="fuc-portrait-image" src="${esc(model.portrait)}" alt="${esc(model.name)}"><div class="fuc-passives" aria-label="${esc(label("Passive"))}">${effects(model.passive, "passive")}</div><span class="fuc-portrait-mark" aria-hidden="true">✦</span></div>
      ${health ? `<div class="fuc-health ${health.level}" role="meter" aria-label="${esc(label("Health"))}" aria-valuemin="0" aria-valuemax="${health.max}" aria-valuenow="${health.remaining}" aria-valuetext="${esc(label("Wounds"))}: ${health.value} / ${health.max}"><span style="width:${health.percent}%"></span></div><div class="fuc-wound-label">${esc(label("Wounds"))} <b>${health.value} / ${health.max}</b></div>` : ""}
    </div>
    <div class="fuc-dossier">
      <div class="fuc-kicker"><span class="fuc-insignia" aria-hidden="true">✦</span><span>${esc(model.faction || label("Dossier"))}</span><span class="fuc-dossier-rule"></span></div>
      <h2>${esc(model.name)}</h2>
      ${model.active.length ? `<div class="fuc-actives" aria-label="${esc(label("Active"))}">${effects(model.active, "active")}</div>` : ""}
      ${model.description ? `<div class="fuc-description">${esc(model.description)}</div>` : `<div class="fuc-description fuc-description--empty">${esc(label("NoLore"))}</div>`}
      ${model.specialty ? `<div class="fuc-specialty">${esc(model.specialty)}</div>` : ""}
      <div class="fuc-footer"><span>${esc(label("UnitRecord"))}</span><span aria-hidden="true">◆ ◆ ◆</span></div>
    </div>
  </div>`;
}
