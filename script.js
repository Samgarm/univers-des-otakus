
"use strict";

/* =========================================================
   LYON : L'ÉVEIL
   Jeu de stratégie autonome, sans Firebase et sans mode hors ligne.
   Sauvegarde locale du navigateur.
   ========================================================= */

const SAVE_KEY = "lyon_eveil_v1";

const TROOPS = {
  fantassins: {
    name: "Fantassins", icon: "🛡️", attack: 7, defense: 8, hp: 55,
    cost: { gold: 35, food: 15 }, description: "Infanterie polyvalente."
  },
  piquiers: {
    name: "Piquiers", icon: "🔱", attack: 8, defense: 12, hp: 65,
    cost: { gold: 45, food: 18, wood: 3 }, description: "Redoutables contre la cavalerie."
  },
  archers: {
    name: "Archers", icon: "🏹", attack: 11, defense: 3, hp: 35,
    cost: { gold: 50, food: 15, wood: 5 }, description: "Attaquent à distance et ciblent les unités fragiles."
  },
  cavaliers: {
    name: "Cavaliers", icon: "🐎", attack: 14, defense: 7, hp: 50,
    cost: { gold: 90, food: 30, iron: 5 }, description: "Rapides, efficaces sur les flancs."
  },
  cavaliersBlindes: {
    name: "Cavaliers blindés", icon: "🐴", attack: 17, defense: 14, hp: 90,
    cost: { gold: 150, food: 40, iron: 15 }, description: "Cavalerie lourde très résistante."
  },
  balistes: {
    name: "Balistes", icon: "🎯", attack: 16, defense: 3, hp: 45,
    cost: { gold: 120, wood: 20, iron: 12 }, description: "Armes de siège contre les défenses."
  },
  mages: {
    name: "Mages", icon: "🔮", attack: 19, defense: 2, hp: 30,
    cost: { gold: 170, food: 15, iron: 5 }, description: "Infligent de lourds dégâts magiques."
  },
  golems: {
    name: "Golems", icon: "🗿", attack: 13, defense: 23, hp: 150,
    cost: { gold: 240, stone: 20, iron: 20 }, description: "Unités lourdes difficiles à éliminer."
  }
};

const BUILDINGS = {
  senate: {
    name: "Sénat", icon: "🏛️",
    description: "Centre administratif de la capitale.",
    base: { gold: 250, wood: 100, stone: 100 },
    effect: "Augmente le prestige et débloque le développement."
  },
  barracks: {
    name: "Caserne", icon: "⚔️",
    description: "Améliore le recrutement militaire.",
    base: { gold: 200, wood: 120, stone: 50 },
    effect: "Chaque niveau réduit le coût en or des soldats."
  },
  farm: {
    name: "Ferme", icon: "🌾",
    description: "Nourrit la population et l'armée.",
    base: { gold: 120, wood: 90 },
    effect: "Produit de la nourriture."
  },
  lumber: {
    name: "Scierie", icon: "🪵",
    description: "Fournit du bois pour les constructions.",
    base: { gold: 120, wood: 50 },
    effect: "Produit du bois."
  },
  quarry: {
    name: "Carrière", icon: "🪨",
    description: "Extrait la pierre des montagnes.",
    base: { gold: 140, wood: 60 },
    effect: "Produit de la pierre."
  },
  forge: {
    name: "Forge", icon: "⚒️",
    description: "Travaille le fer pour les équipements.",
    base: { gold: 200, wood: 100, stone: 60 },
    effect: "Produit du fer."
  },
  walls: {
    name: "Remparts", icon: "🧱",
    description: "Renforce la défense de la capitale.",
    base: { gold: 220, stone: 150, wood: 50 },
    effect: "Augmente la résistance de la capitale."
  },
  tavern: {
    name: "Taverne", icon: "🍺",
    description: "Attire les voyageurs et les commandants.",
    base: { gold: 180, wood: 100 },
    effect: "Augmente le prestige du royaume."
  }
};

const RANKS = [
  { name: "Citoyen", prestige: 0, victories: 0, territories: 0 },
  { name: "Chevalier", prestige: 30, victories: 1, territories: 1 },
  { name: "Baron", prestige: 100, victories: 3, territories: 2 },
  { name: "Comte", prestige: 220, victories: 6, territories: 3 },
  { name: "Marquis", prestige: 400, victories: 10, territories: 4 },
  { name: "Duc", prestige: 650, victories: 15, territories: 5 },
  { name: "Prince", prestige: 950, victories: 22, territories: 6 },
  { name: "Roi", prestige: 1400, victories: 30, territories: 7 },
  { name: "Grand Roi", prestige: 2100, victories: 42, territories: 8 },
  { name: "Empereur", prestige: 3200, victories: 60, territories: 10 }
];

const HEROES = [
  {
    id: "roly", name: "Roly Lyon", icon: "🦁", rarity: "Légendaire",
    war: 96, politics: 48, wisdom: 78, leadership: 94,
    skill: "Rugissement du Lion",
    description: "Renforce la résistance et le moral de l'infanterie.",
    bonus: { attack: 15, defense: 12 }
  },
  {
    id: "maelis", name: "Maëlys de Valombre", icon: "🦅", rarity: "Épique",
    war: 77, politics: 85, wisdom: 92, leadership: 73,
    skill: "Œil stratégique",
    description: "Améliore les dégâts des archers et les opérations de siège.",
    bonus: { attack: 10, defense: 7 }
  },
  {
    id: "kael", name: "Kaël le Rouge", icon: "🐺", rarity: "Épique",
    war: 91, politics: 30, wisdom: 51, leadership: 81,
    skill: "Charge sanglante",
    description: "Augmente l'efficacité des cavaliers.",
    bonus: { attack: 17, defense: 4 }
  },
  {
    id: "selene", name: "Sélène d'Ambre", icon: "🔮", rarity: "Rare",
    war: 66, politics: 71, wisdom: 96, leadership: 64,
    skill: "Voile protecteur",
    description: "Améliore le moral et la défense des armées.",
    bonus: { attack: 7, defense: 15 }
  }
];

const TERRITORY_SEED = [
  { id: "capital", name: "Lyon", icon: "🏰", x: 50, y: 52, kind: "Capitale", resource: "gold", level: 1, owner: "player", strength: 0 },
  { id: "plaine", name: "Plaine d'Or", icon: "🌾", x: 28, y: 26, kind: "Terres agricoles", resource: "food", level: 1, strength: 90 },
  { id: "foret", name: "Forêt Noire", icon: "🌲", x: 72, y: 22, kind: "Forêt", resource: "wood", level: 1, strength: 120 },
  { id: "carriere", name: "Monts de Fer", icon: "⛰️", x: 80, y: 52, kind: "Montagnes", resource: "stone", level: 1, strength: 160 },
  { id: "marais", name: "Marais d'Émeraude", icon: "🌿", x: 22, y: 72, kind: "Terres sauvages", resource: "food", level: 1, strength: 190 },
  { id: "forteresse", name: "Forteresse Rouge", icon: "🏯", x: 70, y: 79, kind: "Forteresse", resource: "iron", level: 2, strength: 270 },
  { id: "port", name: "Port des Brumes", icon: "⚓", x: 45, y: 13, kind: "Port commercial", resource: "gold", level: 2, strength: 330 },
  { id: "citadelle", name: "Citadelle du Nord", icon: "🛡️", x: 13, y: 43, kind: "Citadelle", resource: "iron", level: 3, strength: 420 },
  { id: "cristal", name: "Vallée de Cristal", icon: "💎", x: 89, y: 34, kind: "Vallée rare", resource: "stone", level: 3, strength: 500 }
];

const RESOURCE_NAMES = {
  gold: "Or",
  food: "Nourriture",
  wood: "Bois",
  stone: "Pierre",
  iron: "Fer"
};

function freshState() {
  const territories = TERRITORY_SEED.map(t => ({
    ...t,
    owner: t.id === "capital" ? "player" : "neutral",
    garrison: t.id === "capital" ? { fantassins: 30, archers: 10 } : {},
    fortification: t.id === "capital" ? 1 : 0,
    governor: null,
    tax: 5,
    lastProduction: Date.now()
  }));

  return {
    version: 1,
    player: {
      name: "Seigneur de Lyon",
      title: "Chevalier",
      avatar: "👑",
      gold: 1500,
      food: 1200,
      wood: 900,
      stone: 750,
      iron: 350,
      prestige: 40,
      victories: 1,
      defeats: 0,
      buildings: {
        senate: 1, barracks: 1, farm: 1, lumber: 1,
        quarry: 1, forge: 1, walls: 1, tavern: 1
      },
      troops: {
        fantassins: 70, piquiers: 20, archers: 35,
        cavaliers: 12, cavaliersBlindes: 0, balistes: 2,
        mages: 3, golems: 0
      },
      wounded: {},
      heroes: HEROES.map((h, i) => ({
        ...h, assigned: i === 0, level: 1, experience: 0
      })),
      activeHero: "roly",
      formation: "equilibree",
      defenseFormation: "tenir-murs",
      battleReports: [],
      territoryIds: ["capital"],
      buildingsUpgraded: 0,
      questsCompleted: 0
    },
    territories,
    rankingTab: "military",
    createdAt: Date.now()
  };
}

let state = loadGame();
let selectedTerritoryId = null;
let battleBusy = false;
let toastTimer = null;

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return freshState();

    const saved = JSON.parse(raw);
    const base = freshState();

    if (!saved || saved.version !== 1 || !saved.player) return base;

    const player = { ...base.player, ...saved.player };
    player.buildings = { ...base.player.buildings, ...(saved.player.buildings || {}) };
    player.troops = { ...base.player.troops, ...(saved.player.troops || {}) };
    player.wounded = { ...(saved.player.wounded || {}) };
    player.battleReports = Array.isArray(saved.player.battleReports)
      ? saved.player.battleReports : [];
    player.heroes = Array.isArray(saved.player.heroes) && saved.player.heroes.length
      ? saved.player.heroes : base.player.heroes;

    const oldTerritories = Array.isArray(saved.territories) ? saved.territories : [];
    const territories = base.territories.map(t => {
      const old = oldTerritories.find(x => x.id === t.id);
      return old ? {
        ...t, ...old,
        garrison: { ...(old.garrison || {}) }
      } : t;
    });

    return { ...base, ...saved, player, territories };
  } catch (error) {
    console.error("Chargement impossible :", error);
    return freshState();
  }
}

function saveGame(showMessage = false) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (showMessage) toast("💾 Partie sauvegardée sur cet appareil.");
  } catch (error) {
    console.error(error);
    toast("Impossible de sauvegarder. Vérifie l'espace disponible du navigateur.");
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function fmt(number) {
  return Math.floor(Number(number) || 0).toLocaleString("fr-FR");
}

function totalTroops(troops) {
  return Object.values(troops || {}).reduce((sum, n) => sum + Math.max(0, Number(n) || 0), 0);
}

function troopPower(troops) {
  return Object.entries(troops || {}).reduce((sum, [key, n]) => {
    const t = TROOPS[key];
    return sum + (t ? n * (t.attack + t.defense * 0.6) : 0);
  }, 0);
}

function playerPower() {
  return Math.round(troopPower(state.player.troops));
}

function ownedTerritories() {
  return state.territories.filter(t => t.owner === "player");
}

function getTerritory(id) {
  return state.territories.find(t => t.id === id);
}

function activeHero() {
  return state.player.heroes.find(h => h.id === state.player.activeHero) ||
    state.player.heroes[0];
}

function heroBonus(hero = activeHero()) {
  if (!hero) return { attack: 0, defense: 0 };
  return {
    attack: Math.min(0.35, (hero.bonus?.attack || hero.war * 0.12) / 100),
    defense: Math.min(0.35, (hero.bonus?.defense || hero.leadership * 0.1) / 100)
  };
}

function rankIndex() {
  let result = 0;
  const p = state.player;
  const count = ownedTerritories().length;

  for (let i = 0; i < RANKS.length; i++) {
    const rank = RANKS[i];
    if (p.prestige >= rank.prestige &&
        p.victories >= rank.victories &&
        count >= rank.territories) {
      result = i;
    }
  }
  return result;
}

function updateRank() {
  const p = state.player;
  const next = RANKS[rankIndex()];
  p.title = next.name;
}

function toast(message) {
  const region = document.getElementById("toastRegion");
  if (!region) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  region.appendChild(item);

  setTimeout(() => item.remove(), 3600);
}

function showModal(html, extraClass = "") {
  const backdrop = document.getElementById("modalBackdrop");
  const modal = backdrop.querySelector(".modal");
  modal.className = `modal ${extraClass}`.trim();
  document.getElementById("modalContent").innerHTML = html;
  backdrop.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("modalBackdrop").classList.add("hidden");
  document.body.style.overflow = "";
  battleBusy = false;
}

function canAfford(cost) {
  return Object.entries(cost).every(([key, amount]) => (state.player[key] || 0) >= amount);
}

function spend(cost) {
  if (!canAfford(cost)) return false;
  for (const [key, amount] of Object.entries(cost)) {
    state.player[key] -= amount;
  }
  return true;
}

function costText(cost) {
  return Object.entries(cost).map(([key, amount]) =>
    `${({ gold: "🪙", food: "🌾", wood: "🪵", stone: "🪨", iron: "⚒️" })[key] || ""} ${fmt(amount)}`
  ).join(" · ");
}

function buildingCost(id) {
  const b = BUILDINGS[id];
  const level = state.player.buildings[id] || 1;
  const multiplier = 1 + level * 0.65;
  return Object.fromEntries(
    Object.entries(b.base).map(([key, value]) => [key, Math.ceil(value * multiplier)])
  );
}

function buildingProduction(id) {
  const level = state.player.buildings[id] || 1;
  return Math.floor(4 * level + level * level * 1.5);
}

function productionPerHour() {
  const p = state.player;
  const result = {
    gold: 3 + (p.buildings.senate || 1) * 2 + (p.buildings.tavern || 1),
    food: buildingProduction("farm"),
    wood: buildingProduction("lumber"),
    stone: buildingProduction("quarry"),
    iron: buildingProduction("forge")
  };

  for (const territory of ownedTerritories()) {
    if (territory.id === "capital") continue;
    const level = territory.level || 1;
    const bonus = 3 + level * 2 + (territory.fortification || 0);
    result[territory.resource] = (result[territory.resource] || 0) + bonus;
  }
  return result;
}

function updateHUD() {
  const p = state.player;
  updateRank();

  for (const key of ["gold", "food", "wood", "stone", "iron", "prestige"]) {
    const element = document.getElementById(key === "prestige" ? "prestige" : key);
    if (element) element.textContent = fmt(p[key]);
  }

  document.getElementById("rankBadge").textContent = p.title;
  document.getElementById("playerName").textContent = p.name;
  document.getElementById("playerTitle").textContent = `${p.title} · Niveau ${rankIndex() + 1}`;
  document.getElementById("playerAvatar").textContent = p.avatar || "👑";
  document.getElementById("ownedCount").textContent = ownedTerritories().length;
  document.getElementById("armyCount").textContent = totalTroops(p.troops);
  document.getElementById("victoryCount").textContent = p.victories;

  const armyBig = document.getElementById("armyTotalBig");
  if (armyBig) armyBig.textContent = fmt(totalTroops(p.troops));
  const power = document.getElementById("armyPower");
  if (power) power.textContent = fmt(playerPower());
  const wounded = document.getElementById("woundedTotal");
  if (wounded) wounded.textContent = fmt(totalTroops(p.wounded));

  const next = RANKS[Math.min(rankIndex() + 1, RANKS.length - 1)];
  document.getElementById("buildingHint").textContent =
    rankIndex() === RANKS.length - 1
      ? "Le sommet du pouvoir."
      : `Prochain rang : ${next.name} · ${next.prestige} prestige`;

  saveGame();
}

function renderBuildings() {
  const grid = document.getElementById("buildingGrid");
  grid.innerHTML = Object.entries(BUILDINGS).map(([id, b]) => {
    const level = state.player.buildings[id] || 1;
    const cost = buildingCost(id);
    const affordable = canAfford(cost);
    return `
      <article class="building-card">
        <div class="building-art">${b.icon}</div>
        <div class="building-body">
          <div style="display:flex;justify-content:space-between;gap:6px;align-items:center">
            <h3>${b.name}</h3>
            <span class="level-tag">Niv. ${level}</span>
          </div>
          <p>${b.description}</p>
          <div class="cost-line">${costText(cost)}</div>
          <button class="button ${affordable ? "primary" : "secondary"} full"
            data-upgrade="${id}">Améliorer</button>
          <p>${b.effect}</p>
        </div>
      </article>`;
  }).join("");

  grid.querySelectorAll("[data-upgrade]").forEach(button => {
    button.addEventListener("click", () => upgradeBuilding(button.dataset.upgrade));
  });

  const rates = productionPerHour();
  document.getElementById("productionPanel").innerHTML = Object.entries(rates).map(([key, amount]) => `
    <div class="production-item">
      <span>${RESOURCE_NAMES[key]} / heure</span>
      <strong>+${fmt(amount)}</strong>
    </div>
  `).join("");
}

function upgradeBuilding(id) {
  const cost = buildingCost(id);
  if (!spend(cost)) {
    toast("Ressources insuffisantes pour cette amélioration.");
    return;
  }

  state.player.buildings[id] = (state.player.buildings[id] || 1) + 1;
  state.player.buildingsUpgraded++;
  state.player.prestige += 8;

  toast(`🏗️ ${BUILDINGS[id].name} amélioré au niveau ${state.player.buildings[id]}.`);
  renderAll();
}

function renderMap() {
  const map = document.getElementById("mapNodes");
  map.innerHTML = state.territories.map(t => {
    const status = t.owner === "player" ? "own" : t.owner === "enemy" ? "enemy" : "neutral";
    return `
      <button class="map-node ${status}" data-map-territory="${t.id}"
        style="left:${t.x}%;top:${t.y}%"
        aria-label="${escapeHTML(t.name)}">
        <span class="node-icon">${t.icon}</span>
        <small>${escapeHTML(t.name)}</small>
      </button>`;
  }).join("");

  map.querySelectorAll("[data-map-territory]").forEach(button => {
    button.addEventListener("click", () => openTerritory(button.dataset.mapTerritory));
  });

  document.getElementById("worldTerritoryList").innerHTML = state.territories
    .filter(t => t.owner !== "player")
    .map(t => territoryCard(t, false)).join("") ||
    `<div class="empty-state">Toutes les terres connues sont sous ton autorité.</div>`;

  document.getElementById("worldTerritoryList").querySelectorAll("[data-territory]").forEach(button => {
    button.addEventListener("click", () => openTerritory(button.dataset.territory));
  });
}

function territoryCard(t, owned) {
  const label = owned ? "Administrer" : "Examiner";
  const owner = t.owner === "player" ? "Ton domaine" :
    t.owner === "enemy" ? "Seigneur ennemi" : "Indépendant";

  return `
    <article class="territory-card">
      <div class="territory-card-top">
        <div class="territory-icon">${t.icon}</div>
        <div>
          <h3>${escapeHTML(t.name)}</h3>
          <span class="muted">${escapeHTML(t.kind)} · Niveau ${t.level}</span>
        </div>
      </div>
      <p>${owner} · Ressource : ${RESOURCE_NAMES[t.resource] || t.resource}</p>
      <p>Garnison : ${totalTroops(t.garrison)} soldats · Fortification : ${t.fortification || 0}/5</p>
      <button class="button ${owned ? "primary" : "secondary"} full"
        data-territory="${t.id}">${label}</button>
    </article>`;
}

function renderOwnedTerritories() {
  document.getElementById("ownedTerritoryList").innerHTML =
    ownedTerritories().map(t => territoryCard(t, true)).join("");
  document.getElementById("ownedTerritoryList").querySelectorAll("[data-territory]").forEach(button => {
    button.addEventListener("click", () => openTerritory(button.dataset.territory));
  });
}

function openTerritory(id) {
  const t = getTerritory(id);
  if (!t) return;
  selectedTerritoryId = id;

  if (t.owner !== "player") {
    const estimated = Math.round((t.strength || 100) + (t.fortification || 0) * 90);
    showModal(`
      <span class="eyebrow">RECONNAISSANCE</span>
      <h2>${t.icon} ${escapeHTML(t.name)}</h2>
      <p class="muted">${escapeHTML(t.kind)} · Niveau ${t.level}</p>
      <div class="report-metrics">
        <div class="report-metric"><span>Défense estimée</span><b>${fmt(estimated)}</b></div>
        <div class="report-metric"><span>Récompense</span><b>${RESOURCE_NAMES[t.resource]}</b></div>
        <div class="report-metric"><span>Garnison connue</span><b>${fmt(totalTroops(t.garrison)) || "Inconnue"}</b></div>
      </div>
      <p>Une victoire permet de prendre le contrôle du territoire. Tes pertes seront calculées selon tes troupes, la formation et les défenses ennemies.</p>
      <label class="modal-field">Formation de l'armée
        <select id="battleFormation">
          ${formationOptions(state.player.formation)}
        </select>
      </label>
      <label class="modal-field">Opération militaire
        <select id="battleOperation">
          <option value="assaut">Assaut général</option>
          <option value="raid">Raid rapide</option>
          <option value="siege">Siège</option>
          <option value="recon">Reconnaissance prudente</option>
        </select>
      </label>
      <div class="modal-actions">
        <button class="button secondary" id="cancelTerritory">Annuler</button>
        <button class="button primary" id="attackTerritory">⚔️ Attaquer</button>
      </div>
    `);
    document.getElementById("cancelTerritory").onclick = closeModal;
    document.getElementById("attackTerritory").onclick = () => {
      const formation = document.getElementById("battleFormation").value;
      const operation = document.getElementById("battleOperation").value;
      startTerritoryBattle(id, formation, operation);
    };
    return;
  }

  showTerritoryAdmin(t);
}

function formationOptions(selected) {
  const formations = [
    ["equilibree", "Formation équilibrée"],
    ["charge", "Charge de cavalerie"],
    ["archers", "Protection des archers"],
    ["flancs", "Attaque sur les flancs"],
    ["defensive", "Formation défensive"],
    ["contre", "Contre-attaque"],
    ["murs", "Tenir les remparts"],
    ["preserver", "Préserver les troupes"],
    ["dernier", "Défendre à tout prix"]
  ];

  return formations.map(([value, label]) =>
    `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`
  ).join("");
}

function showTerritoryAdmin(t) {
  const p = state.player;
  const governorOptions = [
    `<option value="">Aucun gouverneur</option>`,
    ...p.heroes.map(h =>
      `<option value="${h.id}" ${t.governor === h.id ? "selected" : ""}>${escapeHTML(h.name)} · Politique ${h.politics}</option>`
    )
  ].join("");

  const garrisonRows = Object.entries(t.garrison || {})
    .filter(([, n]) => n > 0)
    .map(([key, n]) => `<div class="ranking-row"><span>${TROOPS[key]?.icon || "⚔️"}</span><div class="ranking-name">${TROOPS[key]?.name || key}</div><b>${n}</b></div>`)
    .join("");

  showModal(`
    <span class="eyebrow">ADMINISTRATION DU ROYAUME</span>
    <h2>${t.icon} ${escapeHTML(t.name)}</h2>
    <p class="muted">${escapeHTML(t.kind)} · Niveau ${t.level} · Ressource : ${RESOURCE_NAMES[t.resource]}</p>
    <div class="report-metrics">
      <div class="report-metric"><span>Garnison</span><b>${fmt(totalTroops(t.garrison))}</b></div>
      <div class="report-metric"><span>Fortification</span><b>${t.fortification || 0}/5</b></div>
      <div class="report-metric"><span>Production</span><b>+${3 + t.level * 2}/h</b></div>
    </div>

    <h3>🛡️ Transfert de troupes</h3>
    <label class="modal-field">Type d'unité
      <select id="garrisonType">
        ${Object.entries(TROOPS).map(([key, troop]) =>
          `<option value="${key}">${troop.icon} ${troop.name} · Armée : ${p.troops[key] || 0} · Garnison : ${t.garrison[key] || 0}</option>`
        ).join("")}
      </select>
    </label>
    <label class="modal-field">Nombre de soldats
      <input id="garrisonAmount" type="number" min="1" value="5">
    </label>
    <div class="modal-actions">
      <button class="button primary" id="garrisonSend">➕ Déployer</button>
      <button class="button secondary" id="garrisonRecall">↩️ Rappeler</button>
    </div>
    <div style="margin-top:12px">${garrisonRows || '<p class="muted">Aucune troupe dans la garnison.</p>'}</div>

    <h3>🏰 Fortifications</h3>
    <p class="muted">Coût du prochain niveau : ${fmt(300 + (t.fortification || 0) * 250)} or et ${fmt(100 + (t.fortification || 0) * 75)} pierres.</p>
    <button class="button primary full" id="fortifyTerritory" ${(t.fortification || 0) >= 5 ? "disabled" : ""}>Améliorer les fortifications</button>

    <h3>👑 Gouverneur et fiscalité</h3>
    <label class="modal-field">Gouverneur
      <select id="territoryGovernor">${governorOptions}</select>
    </label>
    <label class="modal-field">Impôt local
      <select id="territoryTax">
        ${[0,5,10,15,20,25,30].map(n =>
          `<option value="${n}" ${Number(t.tax) === n ? "selected" : ""}>${n}%</option>`
        ).join("")}
      </select>
    </label>
    <div class="modal-actions">
      <button class="button secondary" id="closeAdmin">Fermer</button>
      <button class="button primary" id="saveAdmin">Enregistrer</button>
    </div>
  `);

  document.getElementById("closeAdmin").onclick = closeModal;
  document.getElementById("garrisonSend").onclick = () => transferGarrison(t.id, true);
  document.getElementById("garrisonRecall").onclick = () => transferGarrison(t.id, false);
  document.getElementById("fortifyTerritory").onclick = () => fortifyTerritory(t.id);
  document.getElementById("saveAdmin").onclick = () => {
    t.governor = document.getElementById("territoryGovernor").value || null;
    t.tax = Number(document.getElementById("territoryTax").value) || 0;
    saveGame();
    toast("Administration enregistrée.");
    renderAll();
    showTerritoryAdmin(t);
  };
}

function transferGarrison(id, deploy) {
  const t = getTerritory(id);
  const key = document.getElementById("garrisonType").value;
  const amount = Math.max(1, Math.floor(Number(document.getElementById("garrisonAmount").value) || 1));

  t.garrison ||= {};
  t.garrison[key] ||= 0;

  if (deploy) {
    if ((state.player.troops[key] || 0) < amount) {
      toast("Tu n'as pas assez de soldats disponibles.");
      return;
    }
    state.player.troops[key] -= amount;
    t.garrison[key] += amount;
  } else {
    if (t.garrison[key] < amount) {
      toast("La garnison ne contient pas autant de soldats.");
      return;
    }
    t.garrison[key] -= amount;
    state.player.troops[key] = (state.player.troops[key] || 0) + amount;
  }

  saveGame();
  renderAll();
  showTerritoryAdmin(t);
  toast(deploy ? "Garnison renforcée." : "Soldats rappelés.");
}

function fortifyTerritory(id) {
  const t = getTerritory(id);
  const level = t.fortification || 0;

  if (level >= 5) {
    toast("Les fortifications sont au niveau maximal.");
    return;
  }

  const cost = { gold: 300 + level * 250, stone: 100 + level * 75 };
  if (!spend(cost)) {
    toast(`Il faut ${fmt(cost.gold)} or et ${fmt(cost.stone)} pierres.`);
    return;
  }

  t.fortification = level + 1;
  state.player.prestige += 5;
  saveGame();
  renderAll();
  showTerritoryAdmin(t);
  toast(`🏰 Fortification de niveau ${t.fortification}.`);
}

function renderRecruitment() {
  const grid = document.getElementById("recruitGrid");
  const discount = Math.max(0.55, 1 - ((state.player.buildings.barracks || 1) - 1) * 0.05);

  grid.innerHTML = Object.entries(TROOPS).map(([key, t]) => {
    const cost = { ...t.cost };
    cost.gold = Math.ceil(cost.gold * discount);
    const available = state.player.troops[key] || 0;
    return `
      <article class="troop-card">
        <div class="troop-icon">${t.icon}</div>
        <h3>${t.name}</h3>
        <p>${t.description}</p>
        <div class="troop-stats"><span>⚔️ ${t.attack}</span><span>🛡️ ${t.defense}</span><span>❤️ ${t.hp}</span></div>
        <p>Disponibles : <b>${fmt(available)}</b></p>
        <div class="cost-line">${costText(cost)} / soldat</div>
        <button class="button primary" data-recruit="${key}">Recruter ×10</button>
      </article>`;
  }).join("");

  grid.querySelectorAll("[data-recruit]").forEach(button => {
    button.onclick = () => recruitTroops(button.dataset.recruit, 10);
  });

  document.getElementById("healButton").onclick = healWounded;
}

function recruitTroops(key, amount) {
  const troop = TROOPS[key];
  if (!troop) return;

  const discount = Math.max(0.55, 1 - ((state.player.buildings.barracks || 1) - 1) * 0.05);
  const cost = Object.fromEntries(
    Object.entries(troop.cost).map(([resource, n]) => [
      resource, Math.ceil(n * amount * (resource === "gold" ? discount : 1))
    ])
  );

  if (!spend(cost)) {
    toast("Ressources insuffisantes pour ce recrutement.");
    return;
  }

  state.player.troops[key] = (state.player.troops[key] || 0) + amount;
  toast(`${troop.icon} ${amount} ${troop.name} recrutés.`);
  renderAll();
}

function healWounded() {
  const total = totalTroops(state.player.wounded);
  if (!total) {
    toast("Aucun blessé à soigner.");
    return;
  }

  const cost = { gold: total * 4, food: total * 2 };
  if (!spend(cost)) {
    toast(`Il faut ${fmt(cost.gold)} or et ${fmt(cost.food)} nourriture pour les soins.`);
    return;
  }

  for (const [key, amount] of Object.entries(state.player.wounded)) {
    state.player.troops[key] = (state.player.troops[key] || 0) + amount;
    state.player.wounded[key] = 0;
  }

  toast(`⛑️ ${fmt(total)} soldats soignés et réintégrés.`);
  renderAll();
}

function renderHeroes() {
  document.getElementById("heroGrid").innerHTML = state.player.heroes.map(h => {
    const assigned = h.id === state.player.activeHero;
    const stats = [
      ["Guerre", h.war], ["Politique", h.politics],
      ["Sagesse", h.wisdom], ["Leadership", h.leadership]
    ];

    return `
      <article class="hero-card">
        <div class="hero-top">
          <div class="hero-portrait">${h.icon}</div>
          <div>
            <h3>${escapeHTML(h.name)}</h3>
            <div class="hero-rarity">${h.rarity} · Niveau ${h.level || 1}</div>
            <div class="muted" style="margin-top:4px">${assigned ? "Commandant actif" : "Disponible"}</div>
          </div>
        </div>
        ${stats.map(([name, value]) => `
          <div class="hero-stat">
            <div class="hero-stat-label"><span>${name}</span><b>${value}/100</b></div>
            <div class="stat-track"><i style="width:${Math.max(0, Math.min(100, value))}%"></i></div>
          </div>
        `).join("")}
        <p class="muted">${escapeHTML(h.skill)} : ${escapeHTML(h.description)}</p>
        <button class="button ${assigned ? "secondary" : "primary"}" data-hero="${h.id}"
          ${assigned ? "disabled" : ""}>${assigned ? "Commandant actuel" : "Nommer commandant"}</button>
      </article>`;
  }).join("");

  document.getElementById("heroGrid").querySelectorAll("[data-hero]").forEach(button => {
    button.onclick = () => {
      state.player.activeHero = button.dataset.hero;
      toast(`👑 ${state.player.heroes.find(h => h.id === button.dataset.hero).name} prend le commandement.`);
      renderAll();
    };
  });
}

function rankingScore(type) {
  const p = state.player;
  const territoryCount = ownedTerritories().length;
  const buildings = Object.values(p.buildings).reduce((sum, n) => sum + n, 0);

  switch (type) {
    case "military": return playerPower() + p.victories * 80;
    case "development": return buildings * 100 + territoryCount * 180;
    case "prestige": return p.prestige;
    case "alliance": return territoryCount * 120 + p.victories * 40;
    default: return 0;
  }
}

function renderRankings() {
  const type = state.rankingTab || "military";
  const labels = {
    military: ["Puissance militaire", "Soldats, qualité de l'armée et victoires"],
    development: ["Développement", "Bâtiments et territoires contrôlés"],
    prestige: ["Prestige", "Victoires, conquêtes et progression"],
    alliance: ["Influence collective", "Progression territoriale locale"]
  };

  const score = rankingScore(type);
  const fictifs = [
    { name: "Aurel le Conquérant", icon: "🦅", score: Math.round(score * 1.45 + 700) },
    { name: "Dame Isolde", icon: "🦢", score: Math.round(score * 1.22 + 450) },
    { name: "Marcus de Fer", icon: "🛡️", score: Math.round(score * 1.08 + 180) },
    { name: state.player.name, icon: state.player.avatar, score },
    { name: "Le Baron Gris", icon: "🐺", score: Math.round(score * 0.76 + 70) }
  ].sort((a, b) => b.score - a.score);

  document.getElementById("rankingPanel").innerHTML = `
    <p class="muted">${labels[type][0]} · ${labels[type][1]}</p>
    ${fictifs.map((entry, index) => `
      <div class="ranking-row">
        <div class="ranking-place">#${index + 1}</div>
        <div>
          <div class="ranking-name">${entry.icon} ${escapeHTML(entry.name)}</div>
          <div class="ranking-desc">${entry.name === state.player.name ? "Ton royaume" : "Seigneur simulé"}</div>
        </div>
        <div class="ranking-score">${fmt(entry.score)}</div>
      </div>
    `).join("")}`;
}

function renderReports() {
  const reports = state.player.battleReports || [];
  const target = document.getElementById("reportList");

  if (!reports.length) {
    target.innerHTML = `<div class="empty-state">📜<br>Aucun rapport pour le moment.<br>Une armée ne gagne pas de batailles en restant dans la caserne.</div>`;
    return;
  }

  target.innerHTML = reports.map(report => `
    <article class="report-card">
      <div class="report-head">
        <div>
          <h3>${report.won ? "🏆 Victoire" : "💀 Défaite"} contre ${escapeHTML(report.opponent)}</h3>
          <span class="report-date">${new Date(report.date).toLocaleString("fr-FR")}</span>
        </div>
        <span class="report-result ${report.won ? "win" : "loss"}">${report.won ? "VICTOIRE" : "DÉFAITE"}</span>
      </div>
      <div class="report-metrics">
        <div class="report-metric"><span>Pertes</span><b>${fmt(report.casualties)}</b></div>
        <div class="report-metric"><span>Blessés</span><b>${fmt(report.wounded)}</b></div>
        <div class="report-metric"><span>Rounds</span><b>${report.rounds}</b></div>
      </div>
      <details style="margin-top:12px">
        <summary style="cursor:pointer;color:var(--gold-light);font-size:11px">Lire le rapport tactique</summary>
        <div class="report-details">${escapeHTML((report.log || []).join("\n"))}</div>
      </details>
    </article>
  `).join("");
}

/* ---------------------- MOTEUR DE COMBAT ---------------------- */

function chooseTarget(attackerType, enemyTroops) {
  const available = Object.keys(enemyTroops).filter(key => enemyTroops[key] > 0);
  if (!available.length) return null;

  const priorities = {
    archers: ["cavaliers", "cavaliersBlindes", "mages", "archers", "fantassins"],
    balistes: ["golems", "cavaliersBlindes", "fantassins", "piquiers"],
    cavaliers: ["archers", "mages", "balistes", "fantassins"],
    cavaliersBlindes: ["archers", "mages", "fantassins", "piquiers"],
    piquiers: ["cavaliers", "cavaliersBlindes", "fantassins", "golems"],
    mages: ["golems", "cavaliersBlindes", "fantassins", "archers"],
    golems: ["fantassins", "piquiers", "archers", "cavaliers"],
    fantassins: ["fantassins", "archers", "piquiers", "cavaliers"]
  };

  for (const key of priorities[attackerType] || []) {
    if (enemyTroops[key] > 0) return key;
  }
  return available.sort((a, b) => enemyTroops[b] - enemyTroops[a])[0];
}

function formationModifiers(formation, troops, attacking) {
  const cavalry = (troops.cavaliers || 0) + (troops.cavaliersBlindes || 0);
  const archers = troops.archers || 0;
  let attack = 1;
  let defense = 1;
  let speed = 1;

  switch (formation) {
    case "charge":
      attack *= cavalry ? 1.24 : 0.9;
      defense *= 0.91;
      speed *= 1.2;
      break;
    case "archers":
      attack *= archers ? 1.10 : 0.96;
      defense *= 1.13;
      break;
    case "flancs":
      attack *= cavalry ? 1.17 : 1.03;
      speed *= 1.15;
      break;
    case "defensive":
    case "murs":
      defense *= attacking ? 1.08 : 1.28;
      attack *= 0.93;
      break;
    case "contre":
      attack *= attacking ? 1.04 : 1.13;
      defense *= 1.09;
      break;
    case "preserver":
      attack *= 0.87;
      defense *= 1.2;
      break;
    case "dernier":
      attack *= attacking ? 1 : 1.12;
      defense *= attacking ? 1 : 1.2;
      break;
  }

  return { attack, defense, speed };
}

function simulateBattle({
  attackerName, defenderName, attackerTroops, defenderTroops,
  attackerHero, defenderHero, formation, defenderFormation,
  fortification = 0, operation = "assaut", defenderIsPlayer = false
}) {
  const a = {
    name: attackerName,
    troops: { ...attackerTroops },
    morale: 85,
    hero: attackerHero,
    formation: formation || "equilibree"
  };
  const d = {
    name: defenderName,
    troops: { ...defenderTroops },
    morale: 85,
    hero: defenderHero,
    formation: defenderFormation || "murs"
  };

  const initialA = { ...a.troops };
  const initialD = { ...d.troops };
  const log = [];
  const rounds = [];
  const maxRounds = 12;

  if (!totalTroops(a.troops) || !totalTroops(d.troops)) {
    return { a, d, initialA, initialD, log: ["Une armée est absente."], rounds: [], won: totalTroops(a.troops) > 0 };
  }

  const modA = formationModifiers(a.formation, a.troops, true);
  const modD = formationModifiers(d.formation, d.troops, false);
  const heroA = heroBonus(a.hero);
  const heroD = heroBonus(d.hero);

  function executeSide(source, target, mods, hero, targetMods, targetHero, sourceIsAttacker) {
    const order = Object.keys(source.troops).sort((x, y) => {
      const priority = { balistes: 1, archers: 2, mages: 3, cavaliers: 4, cavaliersBlindes: 5, piquiers: 6, fantassins: 7, golems: 8 };
      return (priority[x] || 10) - (priority[y] || 10);
    });

    for (const type of order) {
      const count = source.troops[type] || 0;
      if (!count || !totalTroops(target.troops)) continue;

      const targetType = chooseTarget(type, target.troops);
      if (!targetType) break;

      const unit = TROOPS[type];
      const enemyUnit = TROOPS[targetType];
      let damage = count * unit.attack * (0.86 + Math.random() * 0.28);
      damage *= mods.attack * (1 + hero.attack);
      damage *= 0.65 + source.morale / 280;

      if (type === "piquiers" && ["cavaliers", "cavaliersBlindes"].includes(targetType)) damage *= 1.7;
      if (type === "cavaliers" && ["archers", "mages", "balistes"].includes(targetType)) damage *= 1.35;
      if (type === "cavaliersBlindes" && ["archers", "mages"].includes(targetType)) damage *= 1.25;
      if (type === "archers" && ["cavaliers", "cavaliersBlindes"].includes(targetType)) damage *= 1.12;
      if (type === "balistes" && operation === "siege" && sourceIsAttacker) damage *= 1.65;
      if (operation === "raid" && sourceIsAttacker && type === "cavaliers") damage *= 1.15;
      if (operation === "recon" && sourceIsAttacker) damage *= 0.72;

      let defense = enemyUnit.defense * targetMods.defense * (1 + targetHero.defense);
      if (!sourceIsAttacker) defense += Math.max(0, fortification) * 2.3;
      if (type === "golems" && targetType === "fantassins") damage *= 1.1;

      damage = Math.max(0, damage - (target.troops[targetType] * defense * 0.18));
      const losses = Math.min(
        target.troops[targetType],
        Math.max(0, Math.floor(damage / Math.max(15, enemyUnit.hp)))
      );

      if (losses > 0) {
        target.troops[targetType] -= losses;
        target.morale = Math.max(0, target.morale - losses * 0.45);
        log.push(`${unit.icon} ${unit.name} éliminent ${losses} ${enemyUnit.name}.`);
      } else {
        log.push(`${unit.icon} ${unit.name} engagent les ${enemyUnit.name}, sans perte décisive.`);
      }
    }
  }

  for (let round = 1; round <= maxRounds; round++) {
    if (!totalTroops(a.troops) || !totalTroops(d.troops) || a.morale <= 0 || d.morale <= 0) break;

    const beforeA = { ...a.troops };
    const beforeD = { ...d.troops };
    log.push(`ROUND ${round}`);

    if (modA.speed >= modD.speed) {
      executeSide(a, d, modA, heroA, modD, heroD, true);
      if (totalTroops(d.troops)) executeSide(d, a, modD, heroD, modA, heroA, false);
    } else {
      executeSide(d, a, modD, heroD, modA, heroA, false);
      if (totalTroops(a.troops)) executeSide(a, d, modA, heroA, modD, heroD, true);
    }

    const lostA = totalTroops(beforeA) - totalTroops(a.troops);
    const lostD = totalTroops(beforeD) - totalTroops(d.troops);
    a.morale = Math.max(0, a.morale - lostA * 0.12);
    d.morale = Math.max(0, d.morale - lostD * 0.12);

    if (a.hero && a.morale < 45) a.morale = Math.min(100, a.morale + 2);
    if (d.hero && d.morale < 45) d.morale = Math.min(100, d.morale + 2);

    rounds.push({
      number: round,
      a: { ...a.troops },
      d: { ...d.troops },
      moraleA: a.morale,
      moraleD: d.morale,
      lostA, lostD
    });
  }

  const scoreA = troopPower(a.troops) * (0.4 + a.morale / 150);
  const scoreD = troopPower(d.troops) * (0.4 + d.morale / 150);
  const won = totalTroops(a.troops) > 0 &&
    (totalTroops(d.troops) === 0 || a.morale > 0 && scoreA >= scoreD);

  log.push(won
    ? `🏆 ${a.name} remporte la bataille.`
    : `🛡️ ${d.name} tient le champ de bataille.`);

  return { a, d, initialA, initialD, log, rounds, won };
}

function calculateLosses(initial, remaining) {
  const losses = {};
  for (const key of Object.keys(TROOPS)) {
    losses[key] = Math.max(0, (initial[key] || 0) - (remaining[key] || 0));
  }
  return losses;
}

function preserveOneSurvivor(initial, remaining) {
  const result = { ...remaining };
  if (totalTroops(initial) > 0 && totalTroops(result) === 0) {
    const largest = Object.keys(initial).sort((a, b) => initial[b] - initial[a])[0];
    if (largest) result[largest] = 1;
  }
  return result;
}

function addWounded(losses) {
  let dead = 0;
  let wounded = 0;

  for (const [key, count] of Object.entries(losses)) {
    if (!count) continue;
    const hurt = Math.floor(count * 0.7);
    const killed = count - hurt;
    state.player.wounded[key] = (state.player.wounded[key] || 0) + hurt;
    dead += killed;
    wounded += hurt;
  }

  return { dead, wounded };
}

function renderBattleUnits(container, troops, side, round, initial) {
  const element = document.getElementById(container);
  const entries = Object.entries(troops).filter(([, count]) => count > 0);

  element.innerHTML = entries.map(([key, count], index) => {
    const troop = TROOPS[key];
    const column = index % 3;
    const row = Math.floor(index / 3);
    const advance = Math.min(1, round / 7);
    const left = side === "left"
      ? 5 + advance * 31 + column * 4
      : 95 - advance * 31 - column * 4;
    return `
      <div class="battle-unit ${side}" style="left:${left}%;top:${35 + row * 43}px">
        ${troop.icon}<small>${count}</small>
      </div>`;
  }).join("");
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function animateBattle(result, attackerName, defenderName) {
  battleBusy = true;

  showModal(`
    <span class="eyebrow">ENGAGEMENT MILITAIRE</span>
    <h2>⚔️ Bataille de Lyon</h2>
    <p class="muted">Les formations avancent. Les résultats dépendent des troupes et des choix tactiques.</p>
    <div class="battle-arena">
      <div class="battle-midline"></div>
      <span class="battle-side-label left">${escapeHTML(attackerName)}</span>
      <span class="battle-side-label right">${escapeHTML(defenderName)}</span>
      <div id="battleUnitsA"></div><div id="battleUnitsD"></div>
    </div>
    <div class="battle-bars">
      <div class="battle-status"><strong>${escapeHTML(attackerName)}</strong><small id="battleStatsA"></small><div class="battle-health"><i id="battleMoraleA" style="width:85%;background:#62b8ff"></i></div><small id="battleMoraleTextA">Moral : 85</small></div>
      <div class="battle-status"><strong>${escapeHTML(defenderName)}</strong><small id="battleStatsD"></small><div class="battle-health"><i id="battleMoraleD" style="width:85%;background:#f27c89"></i></div><small id="battleMoraleTextD">Moral : 85</small></div>
    </div>
    <div class="battle-log" id="battleLog">Les armées prennent position...</div>
    <div class="battle-controls">
      <button class="button secondary" id="skipBattle">Passer l'animation</button>
      <button class="button primary" id="finishBattle" disabled>Résultat...</button>
    </div>
  `, "battle-modal");

  let skip = false;
  document.getElementById("skipBattle").onclick = () => { skip = true; };

  function updateRound(roundIndex) {
    const round = result.rounds[roundIndex];
    const a = round ? round.a : result.a.troops;
    const d = round ? round.d : result.d.troops;
    const ma = round ? round.moraleA : result.a.morale;
    const md = round ? round.moraleD : result.d.morale;

    renderBattleUnits("battleUnitsA", a, "left", roundIndex + 1, result.initialA);
    renderBattleUnits("battleUnitsD", d, "right", roundIndex + 1, result.initialD);

    document.getElementById("battleStatsA").textContent = `${fmt(totalTroops(a))} soldats`;
    document.getElementById("battleStatsD").textContent = `${fmt(totalTroops(d))} soldats`;
    document.getElementById("battleMoraleA").style.width = `${Math.max(0, ma)}%`;
    document.getElementById("battleMoraleD").style.width = `${Math.max(0, md)}%`;
    document.getElementById("battleMoraleTextA").textContent = `Moral : ${Math.round(ma)}`;
    document.getElementById("battleMoraleTextD").textContent = `Moral : ${Math.round(md)}`;

    const entries = result.log.filter(line =>
      !line.startsWith("ROUND") &&
      result.log.indexOf(line) >= 0
    );
    document.getElementById("battleLog").textContent =
      result.log.slice(0, Math.max(1, result.log.indexOf(`ROUND ${roundIndex + 2}`) + 1)).join("\n");
    document.getElementById("battleLog").scrollTop =
      document.getElementById("battleLog").scrollHeight;
  }

  renderBattleUnits("battleUnitsA", result.initialA, "left", 0, result.initialA);
  renderBattleUnits("battleUnitsD", result.initialD, "right", 0, result.initialD);

  for (let i = 0; i < result.rounds.length; i++) {
    if (skip) break;
    updateRound(i);
    await wait(700);
  }

  updateRound(result.rounds.length - 1);
  document.getElementById("battleLog").textContent = result.log.join("\n");
  document.getElementById("battleLog").scrollTop =
    document.getElementById("battleLog").scrollHeight;

  const finish = document.getElementById("finishBattle");
  finish.disabled = false;
  finish.textContent = result.won ? "🏆 Victoire · Continuer" : "💀 Défaite · Continuer";
  finish.onclick = closeModal;

  if (!skip) await wait(500);
  battleBusy = false;
}

function addBattleReport(opponent, won, losses, rounds, log) {
  const casualtyCount = Object.values(losses).reduce((sum, n) => sum + n, 0);
  const wounded = Object.values(losses).reduce((sum, n) => sum + Math.floor(n * 0.7), 0);

  state.player.battleReports.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: Date.now(),
    opponent,
    won,
    casualties: casualtyCount,
    wounded,
    rounds,
    log: log.slice()
  });

  state.player.battleReports = state.player.battleReports.slice(0, 60);
}

async function startTerritoryBattle(id, formation, operation) {
  if (battleBusy) return;

  const t = getTerritory(id);
  if (!t || t.owner === "player") {
    closeModal();
    toast("Ce territoire est déjà sous ton autorité.");
    return;
  }

  const playerTroops = { ...state.player.troops };
  if (!totalTroops(playerTroops)) {
    toast("Ton armée est vide. Recrute avant d'attaquer.");
    return;
  }

  state.player.formation = formation;
  const defenderTroops = { ...(t.garrison || {}) };

  if (!totalTroops(defenderTroops)) {
    const strength = Math.max(1, t.strength || 100);
    defenderTroops.fantassins = Math.max(4, Math.floor(strength / 8));
    defenderTroops.piquiers = Math.floor(strength / 20);
    defenderTroops.archers = Math.floor(strength / 16);
    defenderTroops.cavaliers = Math.floor(strength / 30);
    if (t.level >= 2) defenderTroops.golems = Math.floor(strength / 90);
    if (t.level >= 3) defenderTroops.mages = Math.floor(strength / 60);
  }

  closeModal();

  const result = simulateBattle({
    attackerName: state.player.name,
    defenderName: t.name,
    attackerTroops: playerTroops,
    defenderTroops,
    attackerHero: activeHero(),
    defenderHero: null,
    formation,
    defenderFormation: "murs",
    fortification: t.fortification || 0,
    operation
  });

  await animateBattle(result, state.player.name, t.name);

  const lossesA = calculateLosses(result.initialA, result.a.troops);
  const lossesD = calculateLosses(result.initialD, result.d.troops);

  state.player.troops = preserveOneSurvivor(playerTroops, result.a.troops);
  addWounded(lossesA);

  if (result.won) {
    t.owner = "player";
    t.garrison = { ...result.a.troops };
    t.fortification = Math.max(0, t.fortification || 0);
    t.lastProduction = Date.now();
    t.governor = null;
    t.tax = 5;

    state.player.prestige += 25 + t.level * 5;
    state.player.victories++;
    state.player.territoryIds = ownedTerritories().map(x => x.id);

    const reward = 30 + t.level * 20;
    state.player[t.resource] = (state.player[t.resource] || 0) + reward;

    if (operation === "raid") {
      const loot = Math.floor((state.player.gold || 0) * 0.05) + 35;
      state.player.gold += loot;
      toast(`🏆 Victoire ! Territoire conquis, +${reward} ${RESOURCE_NAMES[t.resource]}, +${loot} or.`);
    } else {
      toast(`🏆 ${t.name} est désormais à toi ! +${reward} ${RESOURCE_NAMES[t.resource]}.`);
    }
  } else {
    t.garrison = preserveOneSurvivor(defenderTroops, result.d.troops);
    state.player.defeats++;
    state.player.prestige = Math.max(0, state.player.prestige - 5);
    toast("💀 L'attaque échoue. La garnison conserve le territoire.");
  }

  addBattleReport(t.name, result.won, lossesA, result.rounds.length, result.log);
  renderAll();

  if (result.won) openTerritory(t.id);
}

function renderAll() {
  updateHUD();
  renderBuildings();
  renderMap();
  renderOwnedTerritories();
  renderRecruitment();
  renderHeroes();
  renderRankings();
  renderReports();
  saveGame();
}

function changeView(name) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  const view = document.getElementById(`view-${name}`);
  if (view) view.classList.add("active");

  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });

  if (name === "world") renderMap();
  if (name === "territories") renderOwnedTerritories();
  if (name === "reports") renderReports();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renamePlayer() {
  showModal(`
    <span class="eyebrow">IDENTITÉ ROYALE</span>
    <h2>Le nom de ton royaume</h2>
    <label class="modal-field">Nom du seigneur
      <input id="newPlayerName" maxlength="28" value="${escapeHTML(state.player.name)}">
    </label>
    <label class="modal-field">Emblème
      <select id="newPlayerAvatar">
        ${["👑","🦁","🐺","🦅","🐉","🛡️","⚔️","🦊"].map(icon =>
          `<option value="${icon}" ${state.player.avatar === icon ? "selected" : ""}>${icon}</option>`
        ).join("")}
      </select>
    </label>
    <div class="modal-actions">
      <button class="button secondary" id="cancelRename">Annuler</button>
      <button class="button primary" id="confirmRename">Enregistrer</button>
    </div>
  `);

  document.getElementById("cancelRename").onclick = closeModal;
  document.getElementById("confirmRename").onclick = () => {
    const name = document.getElementById("newPlayerName").value.trim();
    if (name.length < 2) {
      toast("Le nom doit contenir au moins deux caractères.");
      return;
    }

    state.player.name = name.slice(0, 28);
    state.player.avatar = document.getElementById("newPlayerAvatar").value;
    closeModal();
    renderAll();
  };
}

function resetGame() {
  showModal(`
    <span class="eyebrow">ATTENTION</span>
    <h2>Recommencer une nouvelle partie ?</h2>
    <p>Cette action supprimera ta progression locale : ressources, armée, bâtiments, héros et territoires conquis.</p>
    <div class="modal-actions">
      <button class="button secondary" id="cancelReset">Garder ma partie</button>
      <button class="button danger" id="confirmReset">Tout recommencer</button>
    </div>
  `);

  document.getElementById("cancelReset").onclick = closeModal;
  document.getElementById("confirmReset").onclick = () => {
    state = freshState();
    saveGame();
    closeModal();
    renderAll();
    changeView("city");
    toast("Nouvelle partie commencée.");
  };
}

function clearReports() {
  if (!state.player.battleReports.length) {
    toast("Aucun rapport à effacer.");
    return;
  }

  showModal(`
    <h2>Effacer les archives ?</h2>
    <p>Les rapports de bataille seront supprimés de ta sauvegarde locale.</p>
    <div class="modal-actions">
      <button class="button secondary" id="keepReports">Annuler</button>
      <button class="button danger" id="deleteReports">Effacer</button>
    </div>
  `);

  document.getElementById("keepReports").onclick = closeModal;
  document.getElementById("deleteReports").onclick = () => {
    state.player.battleReports = [];
    closeModal();
    renderReports();
    saveGame();
    toast("Archives effacées.");
  };
}

/* ---------------------- PRODUCTION ACTIVE ---------------------- */

function collectProduction() {
  const rates = productionPerHour();
  const now = Date.now();

  if (!state.lastProduction) state.lastProduction = now;

  const elapsed = Math.min(30, Math.max(0, (now - state.lastProduction) / 60000));
  if (elapsed < 1) return;

  for (const [resource, perHour] of Object.entries(rates)) {
    const gain = Math.floor(perHour * elapsed / 60);
    state.player[resource] = (state.player[resource] || 0) + gain;
  }

  state.lastProduction = now;
  saveGame();
}

/* ---------------------- ÉVÉNEMENTS ET INITIALISATION ---------------------- */

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => changeView(button.dataset.view));
});

document.querySelectorAll("[data-ranking]").forEach(button => {
  button.addEventListener("click", () => {
    state.rankingTab = button.dataset.ranking;
    document.querySelectorAll("[data-ranking]").forEach(tab =>
      tab.classList.toggle("active", tab === button)
    );
    renderRankings();
    saveGame();
  });
});

document.getElementById("saveButton").addEventListener("click", () => saveGame(true));
document.getElementById("renameButton").addEventListener("click", renamePlayer);
document.getElementById("resetButton").addEventListener("click", resetGame);
document.getElementById("clearReportsButton").addEventListener("click", clearReports);

document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("modalBackdrop").addEventListener("click", event => {
  if (event.target.id === "modalBackdrop" && !battleBusy) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !battleBusy) closeModal();
});

document.querySelectorAll("[data-ranking]").forEach(button => {
  button.classList.toggle("active", button.dataset.ranking === state.rankingTab);
});

renderAll();
changeView("city");

/* Production pendant une partie ouverte uniquement.
   Aucun combat ni revenu simulé pendant l'absence du joueur. */
setInterval(() => {
  collectProduction();
  updateHUD();
  renderBuildings();
}, 60000);

console.info("Lyon : l'Éveil est prêt.");
