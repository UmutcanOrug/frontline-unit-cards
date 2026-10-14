import test from "node:test";
import assert from "node:assert/strict";
import {normalizeConfig, woundState, groupedEffects, canViewCard, cardPosition, cardModel, cardHTML, effectKey, effectKind, imagePath} from "../scripts/core.mjs";

test("SWADE wound bar shrinks, clamps excess wounds and handles zero-capacity Extras", () => {
  const actor = {system: {wounds: {value: 0, max: 3}}};
  assert.equal(woundState(actor).percent, 100);
  actor.system.wounds.value = 1;
  assert.equal(Math.round(woundState(actor).percent), 67);
  actor.system.wounds.value = 3;
  assert.equal(woundState(actor).percent, 0);
  actor.system.wounds.value = 9;
  assert.equal(woundState(actor).remaining, 0);
  actor.system.wounds.max = 0;
  actor.system.wounds.value = 0;
  assert.equal(woundState(actor).percent, 100);
  actor.system.wounds.value = 1;
  assert.equal(woundState(actor).percent, 0);
  assert.equal(woundState({}), null);
  assert.equal(woundState({system: {wounds: {value: "bad"}}}), null);
});

test("automatic effects include item transfers, exclude disabled effects, and support overrides", () => {
  const effects = [
    {id: "permanent", uuid: "Actor.A.ActiveEffect.permanent", name: "Armor", isTemporary: false},
    {id: "temporary", uuid: "Actor.A.ActiveEffect.temporary", name: "Inspired", isTemporary: true},
    {id: "item", uuid: "Actor.A.Item.weapon.ActiveEffect.item", name: "Weapon aura", isTemporary: false},
    {id: "disabled", disabled: true}, {id: "suppressed", isSuppressed: true}, {id: "inactive", active: false}
  ];
  const actor = {allApplicableEffects: () => [...effects, effects[0]]};
  let config = normalizeConfig();
  assert.deepEqual(groupedEffects(actor, config).passive.map(e => e.name), ["Armor", "Weapon aura"]);
  assert.deepEqual(groupedEffects(actor, config).active.map(e => e.name), ["Inspired"]);
  config.effectKinds = {"ActiveEffect.permanent": "active", "ActiveEffect.temporary": "hidden"};
  assert.deepEqual(groupedEffects(actor, config).active.map(e => e.name), ["Armor"]);
  config.effectKinds["ActiveEffect.permanent"] = "auto";
  assert.equal(effectKind(effects[0], config), "passive");
  config.showEffects = false;
  assert.deepEqual(groupedEffects(actor, config), {passive: [], active: []});
});

test("effect classifications survive unlinked token copies and keep item effects distinct", () => {
  assert.equal(effectKey({id: "abc", uuid: "Actor.A.ActiveEffect.abc"}), effectKey({id: "abc", uuid: "Scene.S.Token.T.Actor.A.ActiveEffect.abc"}));
  assert.notEqual(effectKey({uuid: "Actor.A.Item.one.ActiveEffect.abc"}), effectKey({uuid: "Actor.A.Item.two.ActiveEffect.abc"}));
});

test("hidden tokens, visibility policies, owners and GM access", () => {
  const user = {isGM: false};
  const token = {actor: {testUserPermission: (_, level) => level === "OBSERVER"}};
  const config = normalizeConfig();
  assert.equal(canViewCard(token, user, config), true);
  assert.equal(canViewCard(token, user, {...config, visibility: "observer"}), true);
  assert.equal(canViewCard(token, user, {...config, visibility: "owner"}), false);
  assert.equal(canViewCard(token, user, {...config, visibility: "gm"}), false);
  assert.equal(canViewCard({...token, hidden: true}, user, config), false);
  assert.equal(canViewCard(token, user, config, {visible: false}), false);
  assert.equal(canViewCard({...token, hidden: true}, {isGM: true}, config), true);
  assert.equal(canViewCard(token, {isGM: true}, {...config, enabled: false}), false);
});

test("cards flip at the right edge and clamp to a narrow viewport", () => {
  const size = {width: 470, height: 240};
  assert.deepEqual(cardPosition({left: 100, right: 150, top: 50}, size, {width: 1400, height: 800}), {left: 168, top: 50});
  assert.deepEqual(cardPosition({left: 1100, right: 1150, top: 750}, size, {width: 1200, height: 800}), {left: 612, top: 548});
  assert.deepEqual(cardPosition({left: 10, right: 50, top: -30}, size, {width: 320, height: 200}), {left: 12, top: 12});
});

test("manual text is escaped and empty identity fields use the actor", () => {
  const config = normalizeConfig({name: "", description: '<img src=x onerror="alert(1)">', width: 9999, portrait: "javascript:alert(1)"});
  const model = cardModel({actor: {name: "Tank", img: "icons/tank.webp"}, name: "Token"}, config);
  assert.equal(model.name, "Tank");
  assert.equal(model.portrait, "icons/tank.webp");
  assert.equal(model.width, 720);
  const html = cardHTML(model, key => key);
  assert.ok(html.includes("&lt;img"));
  assert.ok(!html.includes('<img src=x'));
  assert.equal(imagePath("data:text/html,hello"), "");
  assert.equal(imagePath("//example.com/tracker"), "");
  assert.equal(imagePath("icons/My Tank.webp"), "icons/My Tank.webp");
});
