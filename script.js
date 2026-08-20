import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCHw1y_HTgPvtFrn18QOR5y7mvMo53p01A",
  authDomain: "univers-des-otakus-90640.firebaseapp.com",
  projectId: "univers-des-otakus-90640",
  storageBucket: "univers-des-otakus-90640.firebasestorage.app",
  messagingSenderId: "55096557900",
  appId: "1:55096557900:web:280115592b1dc051564fe9"
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);

const COL = "lyonMembres";
const COL_CHAT = "lyonMessages";
const COL_JOURNAL = "lyonJournal";
const COL_ALLIANCES = "lyonAlliances";
const COL_COURRIER = "lyonCourrier";
const COL_TERRITOIRES = "lyonTerritoires";
const CODE_COMMUN = "LYON2026";

let monId = "", monProfil = null;

// ==================== DEFAUTS ====================
function batimentsParDefaut() {
  return {
    senat:1, maison1:1, maison2:1, maison3:1, maison4:1, villa:1,
    baraques:1, taverne:1, forgeron:1, stationrelais:1, mirador:1, atelier:1, rassemblement:1,
    ferme1:1, scierie1:1, carriere1:1, mine1:1, ferme2:1, ferme3:1, carriere2:1, ferme4:1
  };
}

function profilParDefaut(pseudo, codeRecup) {
  return {
    pseudo, avatar: "👑", codeRecuperation: codeRecup, banni: false, premiereConnexion: true,
    or: 500, moral: 80, tauxImpots: 10,
    allianceId: null, nomVille: "Lyon", prestige: 0,
    strategies: { mecontentement: 0, brusque: 0, contreOffensive: 0, faillite: 0 }, contreOffensifFin: null, malusProductionFin: null,
    heros: [], meneurIndex: null, herosFonctionnaireIndex: null, heroAttaqueIndex: null,
    inventaireEquipement: [], recherches: {},
    ressources: { nourriture: 800, bois: 600, pierre: 400, fer: 200 },
    batiments: batimentsParDefaut(),
    troupes: {
      fantassins:0, archers:0, cavaliers:0, cavaliersBlindes:0, balistes:0, trebuchets:0,
      piquiers:0, mages:0, golems:0, chevaliersNoirs:0, assassins:0, pretres:0
    },
    equipement: { epee:0, bouclier:0, armure:0, arc:0, heaume:0 },
    dernierCalcul: Date.now(),
    quetes: { actives: {}, terminees: [] },
    inventaireQuetes: []
  };
}

// ==================== AUTHENTIFICATION ====================
window.ouvrirEcran = function(id) {
  document.querySelectorAll('#login-screen .auth-overlay').forEach(el => el.style.display = 'none');
  document.getElementById(id).style.display = 'block';
};
window.seConnecter = async function() {
  const code = document.getElementById('codeInput').value.trim();
  const msg = document.getElementById('messageConnexion');
  if (!code) { msg.innerText = "Entre ton code."; return; }
  document.getElementById('loading-overlay').classList.add('show');
  try {
    const snap = await getDoc(doc(db, COL, code));
    if (snap.exists() && !snap.data().banni) {
      monId = code; monProfil = snap.data();
      localStorage.setItem('lyon_id', code);
      entrerDansLeJeu();
    } else {
      msg.innerText = snap.exists() ? "Compte banni." : "Code invalide.";
      document.getElementById('loading-overlay').classList.remove('show');
    }
  } catch (e) {
    msg.innerText = "Erreur : " + e.message;
    document.getElementById('loading-overlay').classList.remove('show');
  }
};
window.validerInscription = async function() {
  const codeSaisi = document.getElementById('codeInscriptionInput').value.trim();
  const pseudo = document.getElementById('pseudoInscriptionInput').value.trim();
  const msg = document.getElementById('messageInscription');
  if (codeSaisi !== CODE_COMMUN) { msg.innerText = "Code d'inscription invalide."; return; }
  if (!pseudo) { msg.innerText = "Choisis un nom de guerrier."; return; }
  const dejaExiste = await getDocs(query(collection(db, COL), where("pseudo", "==", pseudo)));
  if (!dejaExiste.empty) { msg.innerText = "Ce nom est déjà pris."; return; }
  const id = "LY" + Date.now();
  const codeRecup = String(Math.floor(100000 + Math.random() * 900000));
  const data = profilParDefaut(pseudo, codeRecup);
  await setDoc(doc(db, COL, id), data);
  monId = id; monProfil = data;
  localStorage.setItem('lyon_id', id);
  document.getElementById('codeRecupAffiche').innerText = codeRecup;
  document.getElementById('idAffiche').innerText = id;
  ouvrirEcran('coderecup-overlay');
};
window.fermerCodeRecup = function() { entrerDansLeJeu(); };
window.recupererCompte = async function() {
  const code = document.getElementById('codeRecuperationInput').value.trim();
  const msg = document.getElementById('messageRecuperation');
  const snap = await getDocs(query(collection(db, COL), where("codeRecuperation", "==", code)));
  if (snap.empty) { msg.innerText = "Code introuvable."; return; }
  const d = snap.docs[0];
  monId = d.id; monProfil = d.data();
  localStorage.setItem('lyon_id', d.id);
  entrerDansLeJeu();
};
async function sauvegarder(champs) {
  await updateDoc(doc(db, COL, monId), champs);
}

// ==================== POPULATION ====================
function calculerPopulationMax() {
  const b = monProfil.batiments;
  let pop = 0;
  ['maison1','maison2','maison3','maison4'].forEach(m => pop += (b[m] || 0) * 10);
  pop += (b['villa'] || 0) * 20;
  return pop;
}
function calculerPopulationActiveProduction() {
  const b = monProfil.batiments;
  let pop = 0;
  ['ferme1','ferme2','ferme3','ferme4'].forEach(f => pop += (b[f] || 0) * 2);
  pop += (b['scierie1'] || 0) * 3;
  pop += (b['carriere1'] || 0) * 3;
  pop += (b['carriere2'] || 0) * 3;
  pop += (b['mine1'] || 0) * 4;
  return pop;
}
function calculerPopulationMilitaire() {
  let pop = 0;
  for (const [type, n] of Object.entries(monProfil.troupes || {})) {
    const def = DEFS_TROUPES[type];
    if (def) pop += (n || 0) * def.population;
  }
  return pop;
}
function mettreAJourPopulation() {
  monProfil.populationMax = calculerPopulationMax();
  monProfil.populationActive = calculerPopulationActiveProduction();
  monProfil.populationMilitaire = calculerPopulationMilitaire();
  monProfil.populationInactive = Math.max(0, monProfil.populationMax - monProfil.populationActive - monProfil.populationMilitaire);
}

// ==================== PRODUCTION ====================
let dernierSauvegarde = Date.now();
let intervalleProduction = null;

function calculerTauxProduction() {
  const b = monProfil.batiments;
  let tauxN = 0, tauxB = 0, tauxP = 0, tauxF = 0;
  ['ferme1','ferme2','ferme3','ferme4'].forEach(f => tauxN += (b[f] || 0) * 10);
  tauxB += (b['scierie1'] || 0) * 12;
  tauxP += (b['carriere1'] || 0) * 10;
  tauxP += (b['carriere2'] || 0) * 10;
  tauxF += (b['mine1'] || 0) * 8;

  // Bonus héros fonctionnaire
  const idx = monProfil.herosFonctionnaireIndex;
  if (idx !== null && idx !== undefined && monProfil.heros && monProfil.heros[idx]) {
    const hero = monProfil.heros[idx];
    const bonus = 1 + hero.etoiles * 0.1;
    tauxN *= bonus; tauxB *= bonus; tauxP *= bonus; tauxF *= bonus;
  }
  if (bonusTechnologie(monProfil, 'agriculture1')) tauxN *= 1.2;
  if (monProfil.moral < 30) {
    tauxN *= 0.5; tauxB *= 0.5; tauxP *= 0.5; tauxF *= 0.5;
  }
  return { nourriture: tauxN, bois: tauxB, pierre: tauxP, fer: tauxF };
}

function lancerProductionEnDirect() {
  if (intervalleProduction) clearInterval(intervalleProduction);
  intervalleProduction = setInterval(() => {
    if (!monProfil) return;
    const taux = calculerTauxProduction();
    monProfil.ressources.nourriture += taux.nourriture / 3600;
    monProfil.ressources.bois += taux.bois / 3600;
    monProfil.ressources.pierre += taux.pierre / 3600;
    monProfil.ressources.fer += taux.fer / 3600;
    // Impôts
    const popTotale = monProfil.populationMax;
    const gainOrSeconde = (popTotale * (monProfil.tauxImpots / 100)) / 60;
    monProfil.or += gainOrSeconde;
    // Moral
    if (monProfil.tauxImpots > 20) {
      monProfil.moral = Math.max(0, monProfil.moral - 0.01 * (monProfil.tauxImpots - 20));
    } else if (monProfil.tauxImpots < 10) {
      monProfil.moral = Math.min(100, monProfil.moral + 0.005);
    }
    // Arrondi
    monProfil.ressources.nourriture = Math.floor(monProfil.ressources.nourriture);
    monProfil.ressources.bois = Math.floor(monProfil.ressources.bois);
    monProfil.ressources.pierre = Math.floor(monProfil.ressources.pierre);
    monProfil.ressources.fer = Math.floor(monProfil.ressources.fer);
    monProfil.or = Math.floor(monProfil.or);
    monProfil.moral = Math.round(monProfil.moral * 100) / 100;
    majHUD();
    if (Date.now() - dernierSauvegarde > 30000) {
      dernierSauvegarde = Date.now();
      sauvegarder({ ressources: monProfil.ressources, or: monProfil.or, moral: monProfil.moral });
    }
  }, 1000);
}

async function calculerProductionAutomatique() {
  const p = monProfil;
  const heures = Math.min(48, (Date.now() - (p.dernierCalcul || Date.now())) / 3600000);
  if (heures < 0.02) return;
  const taux = calculerTauxProduction();
  const gN = Math.round(taux.nourriture * heures);
  const gB = Math.round(taux.bois * heures);
  const gP = Math.round(taux.pierre * heures);
  const gF = Math.round(taux.fer * heures);
  p.ressources.nourriture += gN; p.ressources.bois += gB; p.ressources.pierre += gP; p.ressources.fer += gF;
  const popTotale = calculerPopulationMax();
  p.or += Math.round(popTotale * (p.tauxImpots / 100) * heures);
  p.dernierCalcul = Date.now();
  await sauvegarder({ ressources: p.ressources, or: p.or, dernierCalcul: p.dernierCalcul });
  if (gN||gB||gP||gF) afficherToast(`⏳ Pendant ton absence : +${gN}🌾 +${gB}🪵 +${gP}🪨 +${gF}⛓️ +💰`);
}

// ==================== HUD ====================
function majHUD() {
  document.getElementById('avatarBox').innerText = monProfil.avatar || "👑";
  document.getElementById('pnameAffiche').innerText = monProfil.pseudo;
  document.getElementById('puissanceAffiche').innerText = calculerPuissance();
  const prestigeEl = document.getElementById('prestigeAffiche');
  if (prestigeEl) prestigeEl.innerText = monProfil.prestige || 0;
  document.getElementById('hudNourriture').innerText = Math.floor(monProfil.ressources.nourriture);
  document.getElementById('hudBois').innerText = Math.floor(monProfil.ressources.bois);
  document.getElementById('hudPierre').innerText = Math.floor(monProfil.ressources.pierre);
  document.getElementById('hudFer').innerText = Math.floor(monProfil.ressources.fer);
  document.getElementById('hudOr').innerText = Math.floor(monProfil.or);
  // Population si éléments existent
  const popInactive = document.getElementById('hudPopInactive');
  const popMax = document.getElementById('hudPopMax');
  if (popInactive) popInactive.innerText = monProfil.populationInactive;
  if (popMax) popMax.innerText = monProfil.populationMax;
}

// ==================== BÂTIMENTS & MONDE ====================
const BATIMENTS_VILLE = [
  { id:'maison1', nom:'Maison', icon:'fa-house', x:140,y:180 },
  { id:'maison2', nom:'Maison', icon:'fa-house', x:420,y:260 },
  { id:'senat', nom:'Sénat', icon:'fa-university', img:'https://i.postimg.cc/9fF1572T/IMG-20260813-WA0003.jpg', x:1260,y:220, capital:true },
  { id:'ambassade', nom:'Ambassade', icon:'fa-building-columns', x:1610,y:480 },
  { id:'maison3', nom:'Maison', icon:'fa-house', x:500,y:700 },
  { id:'baraques', nom:'Baraques', icon:'fa-chess-rook', img:'https://i.postimg.cc/XJzqKGQ7/IMG-20260812-WA0067.jpg', x:1120,y:700 },
  { id:'maison4', nom:'Maison', icon:'fa-house', x:860,y:780 },
  { id:'taverne', nom:'Taverne', icon:'fa-beer-mug-empty', img:'https://i.postimg.cc/LXP1r9JN/IMG-20260813-WA0005.jpg', x:340,y:860 },
  { id:'villa', nom:'Villa', icon:'fa-hotel', img:'https://i.postimg.cc/0QKYPGBP/IMG-20260813-WA0004.jpg', x:570,y:900 },
  { id:'forgeron', nom:'Forgeron', icon:'fa-hammer', x:280,y:1120 },
  { id:'stationrelais', nom:'Station relais', icon:'fa-flag-checkered', img:'https://i.postimg.cc/0yHKjMm6/IMG-20260813-WA0006.jpg', x:780,y:1120 },
  { id:'mirador', nom:'Mirador', icon:'fa-tower-observation', x:500,y:1220 },
  { id:'atelier', nom:'Atelier', icon:'fa-toolbox', x:1120,y:1200 },
  { id:'rassemblement', nom:'Camp de rassemblement', icon:'fa-people-group', x:900,y:480 },
  { id:'ferme1', nom:'Ferme', icon:'fa-wheat-awn', x:230,y:1500 },
  { id:'scierie1', nom:'Scierie', icon:'fa-tree', x:460,y:1560 },
  { id:'carriere1', nom:'Carrière', icon:'fa-mountain', x:1000,y:1620 },
  { id:'mine1', nom:'Mine', icon:'fa-gem', x:1220,y:1660 },
  { id:'ferme2', nom:'Ferme', icon:'fa-wheat-awn', x:400,y:1880 },
  { id:'ferme3', nom:'Ferme', icon:'fa-wheat-awn', x:660,y:1900 },
  { id:'carriere2', nom:'Carrière', icon:'fa-mountain', x:250,y:2020 },
  { id:'ferme4', nom:'Ferme', icon:'fa-wheat-awn', x:920,y:2020 }
];

const MARQUEURS_MONDE = [
  { type:'mine-city', nom:'Toi', icon:'fa-landmark', x:900,y:1020 },
  { type:'grande-ville', nom:'Citadelle Oubliée', icon:'fa-chess-rook', badge:25, x:1500,y:400 },
  { type:'grande-ville', nom:'Cité des Abysses', icon:'fa-water', badge:30, x:300,y:2200 },
  { type:'camp', badge:4, icon:'fa-campground', x:1080,y:480 },
  { type:'monster', badge:15, icon:'fa-elephant', x:980,y:880 },
  { type:'monster', badge:13, icon:'fa-elephant', x:1180,y:780 },
  { type:'monster', badge:4, icon:'fa-horse', x:560,y:640 },
  { type:'monster', badge:3, icon:'fa-horse', x:700,y:1140 },
  { type:'monster', badge:5, icon:'fa-horse', x:1260,y:1180 },
  { type:'monster', badge:18, icon:'fa-spider', x:240,y:1520 },
  { type:'res', id:'terr0', nomtype:'Forêt', ressourceType:'bois', badge:9, icon:'fa-seedling', x:420,y:480 },
  { type:'res', id:'terr1', nomtype:'Forêt', ressourceType:'bois', badge:8, icon:'fa-tree', x:720,y:500 },
  { type:'res', id:'terr2', nomtype:'Forêt', ressourceType:'bois', badge:6, icon:'fa-tree', x:640,y:420 },
  { type:'res', id:'terr3', nomtype:'Montagne', ressourceType:'pierre', badge:7, icon:'fa-mountain', x:180,y:900 },
  { type:'res', id:'terr4', nomtype:'Montagne', ressourceType:'pierre', badge:11, icon:'fa-mountain', x:1400,y:1500 },
  { type:'res', id:'terr5', nomtype:'Mine', ressourceType:'fer', badge:10, icon:'fa-gem', x:480,y:1080 },
  { type:'res', id:'terr6', nomtype:'Champ', ressourceType:'nourriture', badge:8, icon:'fa-wheat-awn', x:780,y:1300 },
  { type:'res', id:'terr7', nomtype:'Marécage', ressourceType:'nourriture', badge:12, icon:'fa-water', x:340,y:1200 },
  { type:'res', id:'terr8', nomtype:'Marécage', ressourceType:'fer', badge:14, icon:'fa-water', x:1600,y:900 }
];

// ==================== HÉROS ====================
const HEROS_RECRUTABLES = [
  { nom: "Scribe", icon: "📜", etoiles: 1, attaque: 5, defense: 5, prix: 100, competence: { type: "butin", valeur: 0.1, desc: "+10% butin" }, equipements: [] },
  { nom: "Milicien", icon: "⚔️", etoiles: 1, attaque: 10, defense: 8, prix: 150, competence: { type: "aucune", desc: "Aucune compétence spéciale" }, equipements: [] },
  { nom: "Chevalier", icon: "🛡️", etoiles: 2, attaque: 25, defense: 20, prix: 400, competence: { type: "immunite", valeur: 0.15, desc: "15% de chance d'ignorer une attaque" }, equipements: [] },
  { nom: "Archer d'Élite", icon: "🏹", etoiles: 2, attaque: 30, defense: 10, prix: 380, competence: { type: "vitesse", valeur: 0.3, desc: "Déplacements 30% plus rapides" }, equipements: [] },
  { nom: "Mage de Guerre", icon: "🔮", etoiles: 3, attaque: 50, defense: 15, prix: 900, competence: { type: "critique", valeur: 0.2, desc: "20% de chance d'attaque critique (+50% dégâts)" }, equipements: [] },
  { nom: "Paladin", icon: "⚜️", etoiles: 3, attaque: 35, defense: 45, prix: 1000, competence: { type: "immunite", valeur: 0.25, desc: "25% de chance d'ignorer une attaque" }, equipements: [] },
  { nom: "Assassin Royal", icon: "🗡️", etoiles: 4, attaque: 90, defense: 10, prix: 2200, competence: { type: "critique", valeur: 0.35, desc: "35% de chance d'attaque critique (+50% dégâts)" }, equipements: [] },
  { nom: "Prêtresse", icon: "🌙", etoiles: 4, attaque: 20, defense: 70, prix: 2100, competence: { type: "butin", valeur: 0.25, desc: "+25% butin" }, equipements: [] }
];
const HEROS_LEGENDAIRES = [
  { nom: "Dragon d'Airain", icon: "🐉", etoiles: 5, attaque: 200, defense: 120, competence: { type: "critique", valeur: 0.4, desc: "40% de chance d'attaque critique (+50% dégâts)" }, equipements: [] },
  { nom: "Seigneur des Abysses", icon: "🌊", etoiles: 5, attaque: 150, defense: 180, competence: { type: "immunite", valeur: 0.35, desc: "35% de chance d'ignorer une attaque" }, equipements: [] },
  { nom: "Phénix Immortel", icon: "🔥", etoiles: 5, attaque: 175, defense: 150, competence: { type: "vitesse", valeur: 0.5, desc: "Déplacements 50% plus rapides + 20% butin" }, equipements: [] }
];

// ==================== TROUPES (12 types) ====================
const DEFS_TROUPES = {
  fantassins:      { nom:'Fantassins',       icon:'fa-shield',              attaque:6,  defense:9,  population:1, cout:{nourriture:20, bois:5, fer:0} },
  archers:         { nom:'Archers',          icon:'fa-crosshairs',          attaque:10, defense:4,  population:1, cout:{nourriture:25, bois:15, fer:5} },
  cavaliers:       { nom:'Cavaliers',        icon:'fa-horse',               attaque:14, defense:7,  population:2, cout:{nourriture:40, bois:10, fer:15} },
  cavaliersBlindes:{ nom:'Cavaliers blindés',icon:'fa-chess-knight',        attaque:20, defense:16, population:3, cout:{nourriture:60, bois:20, fer:40} },
  balistes:        { nom:'Balistes',         icon:'fa-location-crosshairs', attaque:26, defense:6,  population:2, cout:{nourriture:50, bois:60, fer:30} },
  trebuchets:      { nom:'Trébuchets',       icon:'fa-meteor',              attaque:34, defense:5,  population:3, cout:{nourriture:70, bois:80, fer:60} },
  piquiers:        { nom:'Piquiers',         icon:'fa-broom',               attaque:11, defense:12, population:1, cout:{nourriture:20, bois:10, fer:5} },
  mages:           { nom:'Mages',            icon:'fa-hat-wizard',          attaque:18, defense:3,  population:2, cout:{nourriture:35, bois:20, fer:15} },
  golems:          { nom:'Golems',           icon:'fa-robot',               attaque:30, defense:25, population:4, cout:{nourriture:100, bois:60, fer:80} },
  chevaliersNoirs: { nom:'Chevaliers Noirs', icon:'fa-skull',               attaque:28, defense:20, population:3, cout:{nourriture:80, bois:30, fer:50} },
  assassins:       { nom:'Assassins',        icon:'fa-user-secret',         attaque:24, defense:2,  population:2, cout:{nourriture:45, bois:15, fer:20} },
  pretres:         { nom:'Prêtres',          icon:'fa-hands-praying',       attaque:5,  defense:10, population:2, cout:{nourriture:30, bois:10, fer:10} }
};

// ==================== ÉQUIPEMENTS & SETS ====================
const TOUS_EQUIPEMENTS = [
  // Set Lion (Guerrier)
  { id:'lion_epee', slot:'arme', nom:'⚔️ Épée du Lion', att:20, def:0, vit:0, set:'Lion', source:'forge', coutOr:300, coutMat:{bois:20, fer:40}, rarete:'Commun' },
  { id:'lion_casque', slot:'casque', nom:'🪖 Heaume du Lion', att:0, def:20, vit:0, set:'Lion', source:'forge', coutOr:250, coutMat:{bois:10, fer:30}, rarete:'Commun' },
  { id:'lion_armure', slot:'armure', nom:'🛡️ Cuirasse du Lion', att:10, def:15, vit:0, set:'Lion', source:'forge', coutOr:400, coutMat:{bois:15, fer:50}, rarete:'Rare' },
  { id:'lion_bottes', slot:'bottes', nom:'👢 Bottes du Lion', att:0, def:5, vit:3, set:'Lion', source:'forge', coutOr:200, coutMat:{bois:5, fer:10}, rarete:'Commun' },
  { id:'lion_medaille', slot:'medaille', nom:'🎖️ Médaille du Lion', att:10, def:10, vit:0, set:'Lion', source:'forge', coutOr:350, coutMat:{bois:10, fer:20}, rarete:'Rare' },
  // Set Faille Temporelle
  { id:'faille_epee', slot:'arme', nom:'🗡️ Lame de la Faille', att:35, def:-5, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1500, rarete:'Épique' },
  { id:'faille_casque', slot:'casque', nom:'🌌 Heaume Temporel', att:0, def:25, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1200, rarete:'Épique' },
  { id:'faille_armure', slot:'armure', nom:'🌌 Armure Temporelle', att:15, def:30, vit:-2, set:'Faille Temporelle', source:'boutique', coutOr:1800, rarete:'Épique' },
  { id:'faille_bottes', slot:'bottes', nom:'👢 Bottes Temporelles', att:5, def:10, vit:15, set:'Faille Temporelle', source:'boutique', coutOr:1000, rarete:'Épique' },
  { id:'faille_medaille', slot:'medaille', nom:'⏳ Pendentif de la Faille', att:10, def:15, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:2000, rarete:'Épique' },
  // Set Assassin
  { id:'assassin_epee', slot:'arme', nom:'🗡️ Lame de l\'Assassin', att:30, def:0, vit:10, set:'Assassin', source:'boutique', coutOr:1400, rarete:'Rare' },
  { id:'assassin_casque', slot:'casque', nom:'🌑 Masque de l\'Assassin', att:10, def:15, vit:10, set:'Assassin', source:'boutique', coutOr:1100, rarete:'Rare' },
  { id:'assassin_armure', slot:'armure', nom:'🌑 Cape de l\'Assassin', att:20, def:20, vit:10, set:'Assassin', source:'boutique', coutOr:1700, rarete:'Rare' },
  { id:'assassin_bottes', slot:'bottes', nom:'👢 Bottes de l\'Assassin', att:5, def:5, vit:20, set:'Assassin', source:'boutique', coutOr:900, rarete:'Rare' },
  { id:'assassin_medaille', slot:'medaille', nom:'🎖️ Insigne de l\'Assassin', att:15, def:5, vit:10, set:'Assassin', source:'boutique', coutOr:1900, rarete:'Rare' },
  // Set Berserker
  { id:'berserker_epee', slot:'arme', nom:'🪓 Hache du Berserker', att:40, def:-10, vit:0, set:'Berserker', source:'forge', coutOr:1200, coutMat:{bois:50, fer:80}, rarete:'Rare' },
  { id:'berserker_casque', slot:'casque', nom:'🐺 Casque du Berserker', att:15, def:10, vit:5, set:'Berserker', source:'forge', coutOr:900, coutMat:{bois:30, fer:40}, rarete:'Rare' },
  { id:'berserker_armure', slot:'armure', nom:'🛡️ Armure du Berserker', att:20, def:25, vit:-5, set:'Berserker', source:'forge', coutOr:1500, coutMat:{bois:40, fer:70}, rarete:'Rare' },
  { id:'berserker_bottes', slot:'bottes', nom:'👢 Bottes du Berserker', att:10, def:5, vit:10, set:'Berserker', source:'forge', coutOr:700, coutMat:{bois:20, fer:30}, rarete:'Rare' },
  { id:'berserker_medaille', slot:'medaille', nom:'🎖️ Médaille du Berserker', att:20, def:5, vit:5, set:'Berserker', source:'forge', coutOr:1300, coutMat:{bois:30, fer:50}, rarete:'Rare' },
  // Set Paladin
  { id:'paladin_epee', slot:'arme', nom:'⚔️ Épée du Paladin', att:25, def:10, vit:0, set:'Paladin', source:'boutique', coutOr:1600, rarete:'Épique' },
  { id:'paladin_casque', slot:'casque', nom:'👑 Heaume du Paladin', att:5, def:30, vit:0, set:'Paladin', source:'boutique', coutOr:1400, rarete:'Épique' },
  { id:'paladin_armure', slot:'armure', nom:'✨ Armure Sacrée', att:10, def:40, vit:-3, set:'Paladin', source:'boutique', coutOr:2000, rarete:'Épique' },
  { id:'paladin_bottes', slot:'bottes', nom:'👢 Bottes du Paladin', att:0, def:15, vit:5, set:'Paladin', source:'boutique', coutOr:1000, rarete:'Épique' },
  { id:'paladin_medaille', slot:'medaille', nom:'📿 Amulette du Paladin', att:10, def:20, vit:0, set:'Paladin', source:'boutique', coutOr:1800, rarete:'Épique' },
];

function calculerStatsHeroAvecEquipements(hero) {
  let att = hero.attaque || 0;
  let def = hero.defense || 0;
  let vit = 0;
  if (hero.equipements) {
    hero.equipements.forEach(idEquip => {
      const equip = TOUS_EQUIPEMENTS.find(e => e.id === idEquip);
      if (equip) {
        att += equip.att;
        def += equip.def;
        vit += equip.vit || 0;
      }
    });
  }
  return { attaque: att, defense: def, vitesse: vit };
}

function calculerSetActifs(hero) {
  if (!hero.equipements) return {};
  const sets = {};
  hero.equipements.forEach(idEquip => {
    const equip = TOUS_EQUIPEMENTS.find(e => e.id === idEquip);
    if (equip && equip.set) {
      if (!sets[equip.set]) sets[equip.set] = [];
      sets[equip.set].push(idEquip);
    }
  });
  const result = {};
  for (const [nomSet, pieces] of Object.entries(sets)) {
    if (pieces.length >= 5) result[nomSet] = 5;
    else if (pieces.length >= 3) result[nomSet] = 3;
  }
  return result;
}

function obtenirEffetsSet(setNom, niveau) {
  const effets = {
    'Lion': {
      3: { type:'passif', nom:'Immortalité (2 rounds)', desc:'Survit à une attaque mortelle avec 1 PV pendant 2 rounds.' },
      5: { type:'contre_attaque', nom:'Contre-attaque', desc:'Riposte avec 50% de ta force d\'attaque quand tu es attaqué.' }
    },
    'Faille Temporelle': {
      3: { type:'passif', nom:'Distorsion', desc:'+10% vitesse de déplacement.' },
      5: { type:'reset_combat', nom:'Reset Temporel', desc:'Si tu perds, le combat recommence avec +80 force d\'attaque.' }
    },
    'Assassin': {
      3: { type:'passif', nom:'Frappe chirurgicale', desc:'20% de chance de coup critique (+50% dégâts).' },
      5: { type:'reset_combat', nom:'Résurrection tactique', desc:'Recommence le combat avec +80 force si tu perds.' }
    },
    'Berserker': {
      3: { type:'passif', nom:'Furie', desc:'+15% attaque, +10% vitesse.' },
      5: { type:'passif', nom:'Dernier souffle', desc:'Immortel 2 rounds quand PV < 20%, attaques critiques.' }
    },
    'Paladin': {
      3: { type:'passif', nom:'Bouclier sacré', desc:'Ignore 25% des dégâts reçus.' },
      5: { type:'inversion', nom:'Inversion', desc:'Échange attaquant/défenseur pendant 2 rounds.' }
    }
  };
  return effets[setNom] ? effets[setNom][niveau] : null;
}

// ==================== FONCTIONS ÉQUIPEMENT ====================
function afficherBoutiqueEquipement() {
  const box = document.getElementById('equipementBoutiqueListe');
  if (!box) return;
  const possedes = monProfil.inventaireEquipement || [];
  box.innerHTML = TOUS_EQUIPEMENTS.filter(e => e.source === 'boutique').map(e => {
    const possede = possedes.includes(e.id);
    const btn = possede ? '<span style="color:#6ee7b7;">✅ Possédé</span>' : `<button onclick="acheterEquipement('${e.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">${e.coutOr}🪙</button>`;
    return `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — Set ${e.set}</span></div>${btn}</div>`;
  }).join('');
}
window.acheterEquipement = async function(id) {
  const equip = TOUS_EQUIPEMENTS.find(e => e.id === id);
  if (!equip || equip.source !== 'boutique') return;
  if (monProfil.or < equip.coutOr) { afficherToast("⛔ Pas assez d'or."); return; }
  monProfil.or -= equip.coutOr;
  monProfil.inventaireEquipement = [...(monProfil.inventaireEquipement || []), id];
  await sauvegarder({ or: monProfil.or, inventaireEquipement: monProfil.inventaireEquipement });
  majHUD();
  afficherBoutiqueEquipement();
  afficherToast(`${equip.nom} acheté !`);
};

function afficherForgeEquipement() {
  const box = document.getElementById('equipementList');
  if (!box) return;
  const possedes = monProfil.inventaireEquipement || [];
  box.innerHTML = TOUS_EQUIPEMENTS.filter(e => e.source === 'forge').map(e => {
    const possede = possedes.includes(e.id);
    const coutMatTxt = Object.entries(e.coutMat).map(([k,v]) => `${v}${k==='bois'?'🪵':k==='fer'?'⛓️':''}`).join(' ');
    const btn = possede ? '<span style="color:#6ee7b7;">✅ Possédé</span>' : `<button onclick="forgerEquipement('${e.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">${e.coutOr}🪙 + ${coutMatTxt}</button>`;
    return `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — Set ${e.set}</span></div>${btn}</div>`;
  }).join('');
}
window.forgerEquipement = async function(id) {
  const equip = TOUS_EQUIPEMENTS.find(e => e.id === id);
  if (!equip || equip.source !== 'forge') return;
  if (monProfil.or < equip.coutOr) { afficherToast("⛔ Pas assez d'or."); return; }
  for (const [mat, qte] of Object.entries(equip.coutMat)) {
    if ((monProfil.ressources[mat]||0) < qte) { afficherToast(`⛔ Il manque du ${mat}.`); return; }
  }
  monProfil.or -= equip.coutOr;
  Object.entries(equip.coutMat).forEach(([mat, qte]) => monProfil.ressources[mat] -= qte);
  monProfil.inventaireEquipement = [...(monProfil.inventaireEquipement || []), id];
  await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, inventaireEquipement: monProfil.inventaireEquipement });
  majHUD();
  afficherForgeEquipement();
  afficherToast(`${equip.nom} forgé !`);
};

// ==================== PANEL HÉROS ÉQUIPEMENT ====================
function afficherPanelHeros(heroIndex) {
  const hero = monProfil.heros[heroIndex];
  if (!hero) return;
  const stats = calculerStatsHeroAvecEquipements(hero);
  const setsActifs = calculerSetActifs(hero);
  let html = `<h3>${hero.icon} ${hero.nom} ${"⭐".repeat(hero.etoiles)}</h3>`;
  html += `<p>Attaque : ${stats.attaque} | Défense : ${stats.defense} | Vitesse : ${stats.vitesse}</p>`;
  html += `<h4>Sets actifs</h4>`;
  if (Object.keys(setsActifs).length === 0) html += `<p>Aucun set complet</p>`;
  else {
    for (const [nomSet, niveau] of Object.entries(setsActifs)) {
      const effet = obtenirEffetsSet(nomSet, niveau);
      if (effet) html += `<p><b>${nomSet} (${niveau}/5)</b> : ${effet.nom} - ${effet.desc}</p>`;
    }
  }
  html += `<h4>Équipements possédés</h4>`;
  const inventaire = monProfil.inventaireEquipement || [];
  const equipementsDisponibles = TOUS_EQUIPEMENTS.filter(e => inventaire.includes(e.id));
  html += `<div style="max-height:200px;overflow-y:auto;">`;
  equipementsDisponibles.forEach(e => {
    const equipe = hero.equipements && hero.equipements.includes(e.id);
    const btn = equipe ? `<button onclick="desequiperHero(${heroIndex},'${e.id}')" class="btn-sm">Retirer</button>` : `<button onclick="equiperHero(${heroIndex},'${e.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">Équiper</button>`;
    html += `<div class="strategie-row"><div class="info"><h4>${e.nom}</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — Set ${e.set}</span></div>${btn}</div>`;
  });
  html += `</div>`;
  html += `<button onclick="fermerHeroPanel()" class="close-btn">Fermer</button>`;
  document.getElementById('hero-equip-modal').innerHTML = html;
  document.getElementById('hero-equip-backdrop').style.display = 'flex';
}
window.equiperHero = async function(heroIndex, equipId) {
  const hero = monProfil.heros[heroIndex];
  if (!hero.equipements) hero.equipements = [];
  if (!hero.equipements.includes(equipId)) {
    hero.equipements.push(equipId);
    await sauvegarder({ heros: monProfil.heros });
    afficherPanelHeros(heroIndex);
  }
};
window.desequiperHero = async function(heroIndex, equipId) {
  const hero = monProfil.heros[heroIndex];
  if (hero.equipements) {
    hero.equipements = hero.equipements.filter(id => id !== equipId);
    await sauvegarder({ heros: monProfil.heros });
    afficherPanelHeros(heroIndex);
  }
};
window.fermerHeroPanel = function() {
  document.getElementById('hero-equip-backdrop').style.display = 'none';
};

// ==================== SÉLECTION HÉROS ATTAQUE ====================
let cibleAttaque = null;
window.ouvrirAttaque = function(cible) {
  cibleAttaque = cible;
  const herosDisponibles = monProfil.heros || [];
  if (herosDisponibles.length === 0) {
    afficherToast("Recrute un héros avant d'attaquer.");
    return;
  }
  const modal = document.getElementById('hero-attaque-modal');
  let html = `<h3>Choisis le héros qui mène l'attaque</h3>`;
  herosDisponibles.forEach((h, i) => {
    html += `<div class="strategie-row"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}</h4><span>Att ${h.attaque} / Déf ${h.defense}</span></div><button onclick="selectionnerHeroAttaque(${i})" class="btn-sm" style="background:var(--gold);color:#0a061d;">Choisir</button></div>`;
  });
  html += `<button onclick="fermerSelectionHeroAttaque()" class="close-btn">Annuler</button>`;
  modal.innerHTML = html;
  document.getElementById('hero-attaque-backdrop').style.display = 'flex';
};
window.selectionnerHeroAttaque = function(index) {
  monProfil.heroAttaqueIndex = index;
  document.getElementById('hero-attaque-backdrop').style.display = 'none';
  const box = document.getElementById('attaqueTroupes');
  let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  for (const [key, def] of Object.entries(DEFS_TROUPES)) {
    html += `<div style="text-align:center;background:rgba(0,0,0,0.3);border:1px solid #3a2d63;border-radius:10px;padding:8px;"><i class="fas ${def.icon}" style="color:var(--gold);font-size:18px;"></i><div style="font-size:11px;margin-top:4px;">${def.nom}</div><div style="font-size:13px;font-weight:bold;color:#6ee7b7;">${monProfil.troupes[key]||0} dispo</div></div>`;
  }
  html += `</div><p class="hint">Force d'attaque totale : ${forceAttaque(monProfil)}</p>`;
  box.innerHTML = html;
  document.getElementById('attaqueTitle').innerText = `⚔️ Attaquer ${cibleAttaque.nom}`;
  toggleTiroir('attaque');
};
window.fermerSelectionHeroAttaque = function() {
  document.getElementById('hero-attaque-backdrop').style.display = 'none';
};

// ==================== COMBAT ====================
function bonusMeneur(profil) {
  const idx = profil.heroAttaqueIndex !== undefined ? profil.heroAttaqueIndex : profil.meneurIndex;
  if (idx !== null && idx !== undefined && profil.heros && profil.heros[idx]) {
    const hero = profil.heros[idx];
    const stats = calculerStatsHeroAvecEquipements(hero);
    return { attaque: stats.attaque, defense: stats.defense };
  }
  return { attaque: 0, defense: 0 };
}

function forceAttaque(profil) {
  const base = Object.entries(profil.troupes || {}).reduce((s, [k, n]) => s + n * (DEFS_TROUPES[k]?.attaque || 0), 0);
  const bonusTech = bonusTechnologie(profil, 'forge1') ? 1.15 : 1;
  return Math.round((base + bonusMeneur(profil).attaque) * bonusTech);
}
function forceDefense(profil) {
  const base = Object.entries(profil.troupes || {}).reduce((s, [k, n]) => s + n * (DEFS_TROUPES[k]?.defense || 0), 0);
  const niveauMirador = profil.batiments?.mirador || 0;
  const bonusTech = bonusTechnologie(profil, 'fortif1') ? 1.15 : 1;
  return Math.round((base + niveauMirador * 10 + bonusMeneur(profil).defense) * bonusTech);
}

function appliquerSetsAttaquant(attaque) {
  const hero = monProfil.heros[monProfil.heroAttaqueIndex];
  if (!hero) return attaque;
  const setsActifs = calculerSetActifs(hero);
  for (const [nomSet, niveau] of Object.entries(setsActifs)) {
    if (nomSet === 'Berserker' && niveau >= 3) attaque = Math.round(attaque * 1.15);
    if (nomSet === 'Assassin' && niveau >= 3) attaque = Math.round(attaque * 1.1);
  }
  return attaque;
}
function appliquerSetsDefenseur(profil, defense) {
  const idx = profil.meneurIndex || 0;
  const hero = profil.heros[idx];
  if (!hero) return defense;
  const setsActifs = calculerSetActifs(hero);
  for (const [nomSet, niveau] of Object.entries(setsActifs)) {
    if (nomSet === 'Paladin' && niveau >= 3) defense = Math.round(defense * 1.25);
    if (nomSet === 'Lion' && niveau >= 3) defense = Math.round(defense * 1.15);
  }
  return defense;
}

window.lancerAttaque = async function() {
  const total = Object.values(monProfil.troupes).reduce((a, b) => a + b, 0);
  if (total === 0) { afficherToast("⛔ Entraîne des troupes d'abord."); return; }
  let monAttaque = forceAttaque(monProfil);
  monAttaque = appliquerSetsAttaquant(monAttaque);
  let victoire;
  if (cibleAttaque.type === 'pnj') {
    victoire = monAttaque >= cibleAttaque.force;
  } else {
    const snap = await getDoc(doc(db, COL, cibleAttaque.id));
    if (!snap.exists()) { afficherToast("Ce joueur n'existe plus."); return; }
    const defenseur = snap.data();
    if (defenseur.village?.bouclierFin > Date.now()) { afficherToast("🛡️ Ville protégée par un bouclier."); return; }
    let sonDefense = forceDefense(defenseur);
    sonDefense = appliquerSetsDefenseur(defenseur, sonDefense);
    victoire = monAttaque * (0.85 + Math.random() * 0.3) >= sonDefense;
    const heroAttaquant = monProfil.heros[monProfil.heroAttaqueIndex];
    const setsAttaquant = calculerSetActifs(heroAttaquant);
    if (!victoire && setsAttaquant['Faille Temporelle'] === 5) {
      victoire = (monAttaque + 80) >= sonDefense;
      afficherToast("⏳ Faille Temporelle activée ! Le combat recommence avec +80 de force.");
    }
    const heroDefenseur = defenseur.heros[defenseur.meneurIndex || 0];
    const setsDefenseur = calculerSetActifs(heroDefenseur);
    if (victoire && setsDefenseur['Lion'] === 3) {
      victoire = false;
      afficherToast("🛡️ Immortalité du défenseur : il survit avec 1 PV !");
    }
  }

  await deplacerTroupes(cibleAttaque.nom);
  await animerCombat(monProfil.pseudo, monProfil.avatar, cibleAttaque.nom, cibleAttaque.type === 'pnj' ? '👹' : '🏰', victoire);

  // Conséquences (butin/pertes) — version simplifiée
  if (victoire) {
    if (cibleAttaque.type === 'pnj') {
      const butinOr = 20 + Math.floor(cibleAttaque.force * 0.2);
      const butinBois = Math.floor(cibleAttaque.force * 0.3);
      const butinPierre = Math.floor(cibleAttaque.force * 0.25);
      monProfil.or += butinOr;
      monProfil.ressources.bois += butinBois;
      monProfil.ressources.pierre += butinPierre;
      afficherToast(`🏆 Victoire ! +${butinOr}🪙 +${butinBois}🪵 +${butinPierre}🪨`);
    } else {
      // PvP : on pourrait piller, mais pour l'instant on donne un bonus simple
      monProfil.prestige += 15;
      afficherToast("🏆 Victoire contre " + cibleAttaque.nom + " !");
    }
    await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, prestige: monProfil.prestige });
  } else {
    reduireTroupes(monProfil.troupes, 0.2);
    await sauvegarder({ troupes: monProfil.troupes });
    afficherToast("💀 Défaite...");
  }
  majHUD();
  fermerTiroir();
};

function reduireTroupes(troupes, ratio) {
  let perdues = 0;
  Object.keys(troupes).forEach(k => {
    const perte = Math.floor((troupes[k] || 0) * ratio);
    troupes[k] = Math.max(0, (troupes[k] || 0) - perte);
    perdues += perte;
  });
  return perdues;
}

// ==================== RECHERCHE ====================
const TECHNOLOGIES = [
  { id: "forge1", nom: "🔥 Forge Améliorée", desc: "+15% attaque de toutes tes troupes.", prix: 800, materiaux: { bois: 200, pierre: 100 } },
  { id: "fortif1", nom: "🧱 Fortifications", desc: "+15% défense de toutes tes troupes.", prix: 800, materiaux: { pierre: 200, fer: 100 } },
  { id: "agriculture1", nom: "🌾 Agronomie", desc: "+20% production automatique de nourriture.", prix: 500, materiaux: { bois: 100 } },
  { id: "commerce1", nom: "💰 Routes Commerciales", desc: "+10% or gagné en combat.", prix: 900, materiaux: { fer: 150 } }
];
function bonusTechnologie(profil, id) { return (profil.recherches || {})[id] ? true : false; }
function afficherRecherche() {
  const box = document.getElementById('rechercheListe');
  if (!box) return;
  box.innerHTML = TECHNOLOGIES.map(t => {
    const possede = bonusTechnologie(monProfil, t.id);
    const coutTxt = Object.entries(t.materiaux).map(([k, v]) => `${v}${k === 'bois' ? '🪵' : k === 'pierre' ? '🪨' : '⛓️'}`).join(' ');
    return `<div class="item-card"><div class="info"><h4>${t.nom}</h4><span>${t.desc} — ${t.prix}🪙 + ${coutTxt}</span></div>${possede ? '<span style="color:#6ee7b7;font-size:11px;">✅ Recherché</span>' : `<button onclick="rechercherTech('${t.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">Rechercher</button>`}</div>`;
  }).join('');
}
window.rechercherTech = async function(id) {
  const t = TECHNOLOGIES.find(x => x.id === id);
  if (monProfil.or < t.prix) { afficherToast("⛔ Pas assez d'or."); return; }
  for (const [mat, qte] of Object.entries(t.materiaux)) { if (monProfil.ressources[mat] < qte) { afficherToast(`⛔ Il manque du ${mat}.`); return; } }
  monProfil.or -= t.prix;
  Object.entries(t.materiaux).forEach(([mat, qte]) => monProfil.ressources[mat] -= qte);
  monProfil.recherches = { ...(monProfil.recherches || {}), [id]: true };
  await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, recherches: monProfil.recherches });
  majHUD();
  afficherToast(`🧪 ${t.nom} recherché !`);
  afficherRecherche();
};

// ==================== DÉPLACEMENT & COMBAT ANIMÉ ====================
function deplacerTroupes(nomCible) {
  return new Promise((resolve) => {
    const overlay = document.getElementById('deplacement-troupes-backdrop');
    const texte = document.getElementById('deplacementTexte');
    const icone = document.getElementById('deplacementIcone');
    if (!overlay) { resolve(); return; }
    texte.innerText = `🐎 Tes troupes se dirigent vers ${nomCible}...`;
    overlay.style.display = 'flex';
    setTimeout(() => { overlay.style.display = 'none'; resolve(); }, 1800);
  });
}
let _combatAnimeResolve = null;
function animerCombat(nomMoi, avatarMoi, nomAdv, avatarAdv, victoire) {
  return new Promise((resolve) => {
    _combatAnimeResolve = resolve;
    const backdrop = document.getElementById('combat-anime-backdrop');
    if (!backdrop) { resolve(); return; }
    document.getElementById('combatAvatarMoi').innerText = avatarMoi || '⚔️';
    document.getElementById('combatAvatarAdv').innerText = avatarAdv || '👹';
    document.getElementById('combatNomMoi').innerText = nomMoi;
    document.getElementById('combatNomAdv').innerText = nomAdv;
    document.getElementById('combatPvMoi').style.width = '100%';
    document.getElementById('combatPvAdv').style.width = '100%';
    document.getElementById('combatLogAnime').innerText = "⚔️ Le combat commence...";
    backdrop.style.display = 'flex';
    // Simuler les rounds
    let round = 0;
    const interval = setInterval(() => {
      round++;
      document.getElementById('combatLogAnime').innerText += `\nRound ${round}...`;
      if (round >= 3) {
        clearInterval(interval);
        document.getElementById('combatLogAnime').innerText += victoire ? "\n🏆 Victoire !" : "\n💀 Défaite...";
        setTimeout(() => {
          backdrop.style.display = 'none';
          if (_combatAnimeResolve) { _combatAnimeResolve(); _combatAnimeResolve = null; }
        }, 1000);
      }
    }, 700);
  });
}
window.passerCombat = function() {
  const backdrop = document.getElementById('combat-anime-backdrop');
  if (backdrop) backdrop.style.display = 'none';
  if (_combatAnimeResolve) { _combatAnimeResolve(); _combatAnimeResolve = null; }
};

function afficherToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.style.display = 'none', 2400);
}

// ==================== JOURNAL ====================
async function ajouterAuJournal(texte) {
  await addDoc(collection(db, COL_JOURNAL), { texte, date: serverTimestamp() });
}
let _dernieresEntreesJournal = [];
let _indexTicker = 0, _intervalTicker = null;
function demarrerJournal() {
  onSnapshot(query(collection(db, COL_JOURNAL), orderBy("date", "desc")), (snap) => {
    const box = document.getElementById('journalMessages');
    _dernieresEntreesJournal = [];
    let html = "";
    let c = 0;
    snap.forEach(d => {
      if (c++ >= 40) return;
      _dernieresEntreesJournal.push(d.data().texte);
      html += `<div class="chat-msg">📌 ${d.data().texte}</div>`;
    });
    if (box) box.innerHTML = html || `<p class="hint">Aucun événement pour l'instant.</p>`;
  });
  if (_intervalTicker) clearInterval(_intervalTicker);
  _intervalTicker = setInterval(() => {
    if (!_dernieresEntreesJournal.length) return;
    _indexTicker = (_indexTicker + 1) % _dernieresEntreesJournal.length;
    const ticker = document.getElementById('hudTicker');
    if (ticker) ticker.innerText = "📯 " + _dernieresEntreesJournal[_indexTicker];
  }, 5000);
}

// ==================== PROFIL VILLE & TERRITOIRE ====================
window.ouvrirProfilVille = async function(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) { afficherToast("Cette ville n'existe plus."); return; }
  const cible = snap.data();
  const modal = document.getElementById('profil-ville-modal');
  modal.innerHTML = `<h3>🏰 ${cible.nomVille || cible.pseudo}</h3><p>Seigneur : ${cible.pseudo}</p><button class="btn-gold" onclick="ouvrirAttaque({type:'joueur', id:'${id}', nom:'${cible.pseudo}'}); fermerProfilVille();">⚔️ Attaquer</button><button class="close-btn" onclick="fermerProfilVille()">Fermer</button>`;
  document.getElementById('profil-ville-backdrop').style.display = 'flex';
};
window.fermerProfilVille = function() { document.getElementById('profil-ville-backdrop').style.display = 'none'; };
window.espionnerJoueur = async function(id) {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return;
  const cible = snap.data();
  alert(`🕵️ Espionnage : ${cible.pseudo} — Or: ${cible.or}, Force: ${forceAttaque(cible)}, Défense: ${forceDefense(cible)}`);
  fermerProfilVille();
};

let _territoiresPossedes = {};
async function chargerTerritoires() {
  const snap = await getDocs(collection(db, COL_TERRITOIRES));
  _territoiresPossedes = {};
  snap.forEach(d => { _territoiresPossedes[d.id] = d.data(); });
}
async function calculerProductionTerritoires() {
  const mesTerritoires = MARQUEURS_MONDE.filter(m => m.type === 'res' && _territoiresPossedes[m.id]?.proprietaireId === monId);
  if (mesTerritoires.length === 0) return;
  let gains = { bois:0, pierre:0, fer:0, nourriture:0 };
  for (const t of mesTerritoires) {
    const info = _territoiresPossedes[t.id];
    const heures = Math.min(48, (Date.now() - (info.dernierCalcul || Date.now())) / 3600000);
    const gain = Math.round((3 + t.badge * 0.4) * heures);
    gains[t.ressourceType] = (gains[t.ressourceType] || 0) + gain;
    info.dernierCalcul = Date.now();
    await setDoc(doc(db, COL_TERRITOIRES, t.id), info);
  }
  monProfil.ressources.bois += gains.bois;
  monProfil.ressources.pierre += gains.pierre;
  monProfil.ressources.fer += gains.fer;
  monProfil.ressources.nourriture += gains.nourriture;
  await sauvegarder({ ressources: monProfil.ressources });
  if (gains.bois + gains.pierre + gains.fer + gains.nourriture > 0)
    afficherToast(`🗺️ Territoires : +${gains.bois}🪵 +${gains.pierre}🪨 +${gains.fer}⛓️ +${gains.nourriture}🌾`);
}
window.ouvrirProfilTerritoire = function(id) {
  const t = MARQUEURS_MONDE.find(m => m.id === id);
  const info = _territoiresPossedes[id];
  const modal = document.getElementById('profil-territoire-modal');
  let html = `<h3>${t.nomtype} (niv.${t.badge})</h3>`;
  if (!info || !info.proprietaireId) {
    html += `<p>Gardé par un gardien (force ${t.badge * 70}).</p><button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Attaquer le Gardien</button>`;
  } else if (info.proprietaireId === monId) {
    html += `<p>🏳️ Ce territoire t'appartient.</p>`;
  } else {
    html += `<p>Contrôlé par ${info.proprietairePseudo}.</p><button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Conquérir</button>`;
  }
  html += `<button class="close-btn" onclick="fermerProfilTerritoire()">Fermer</button>`;
  modal.innerHTML = html;
  document.getElementById('profil-territoire-backdrop').style.display = 'flex';
};
window.fermerProfilTerritoire = function() { document.getElementById('profil-territoire-backdrop').style.display = 'none'; };
window.attaquerTerritoire = async function(id) {
  const t = MARQUEURS_MONDE.find(m => m.id === id);
  const info = _territoiresPossedes[id];
  const monAttaque = forceAttaque(monProfil);
  let seuil;
  if (!info || !info.proprietaireId) { seuil = t.badge * 70; }
  else { const propSnap = await getDoc(doc(db, COL, info.proprietaireId)); seuil = forceDefense(propSnap.data()); }
  const victoire = monAttaque * (0.85 + Math.random() * 0.3) >= seuil;
  await deplacerTroupes(t.nomtype);
  await animerCombat(monProfil.pseudo, monProfil.avatar, t.nomtype, '🐊', victoire);
  if (victoire) {
    const nouvelleInfo = { proprietaireId: monId, proprietairePseudo: monProfil.pseudo, dernierCalcul: Date.now() };
    await setDoc(doc(db, COL_TERRITOIRES, id), nouvelleInfo);
    _territoiresPossedes[id] = nouvelleInfo;
    const gain = 20 + t.badge * 5;
    monProfil.ressources[t.ressourceType] += gain;
    await sauvegarder({ ressources: monProfil.ressources });
    afficherToast(`🏁 Territoire conquis ! +${gain} ${t.ressourceType}`);
    rendreMondeCanvas();
  } else {
    reduireTroupes(monProfil.troupes, 0.1);
    await sauvegarder({ troupes: monProfil.troupes });
    afficherToast("💀 Échec de la conquête.");
  }
  fermerProfilTerritoire();
};

// ==================== CHAT ====================
function demarrerChat() {
  onSnapshot(query(collection(db, COL_CHAT), orderBy("date")), (snap) => {
    const box = document.getElementById('chatMessages');
    if (!box) return;
    box.innerHTML = "";
    snap.forEach(d => {
      const m = d.data();
      box.innerHTML += `<div class="chat-msg"><b>${m.pseudo} :</b> ${m.texte}</div>`;
    });
    box.scrollTop = box.scrollHeight;
  });
}
window.envoyerMessageChat = async function() {
  const input = document.getElementById('chatInput');
  if (!input.value.trim()) return;
  await addDoc(collection(db, COL_CHAT), { pseudo: monProfil.pseudo, texte: input.value.trim(), date: serverTimestamp() });
  input.value = "";
};

// ==================== PUISSANCE ====================
function calculerPuissanceDe(profil) {
  const niveauBatiments = Object.values(profil.batiments || {}).reduce((s, n) => s + n, 0);
  const nbTroupes = Object.values(profil.troupes || {}).reduce((s, n) => s + n, 0);
  const nbEquipement = Object.values(profil.equipement || {}).reduce((s, n) => s + n, 0);
  const scoreHeros = (profil.heros || []).reduce((s, h) => s + h.etoiles * 30, 0);
  return niveauBatiments * 25 + nbTroupes * 8 + nbEquipement * 40 + scoreHeros + Math.floor((profil.or || 0) / 10);
}
function calculerPuissance() { return calculerPuissanceDe(monProfil); }

// ==================== GAINS FLOTTANTS ====================
function afficherGainFlottant(texte) {
  const zone = document.getElementById('gains-flottants');
  if (!zone) return;
  const el = document.createElement('div');
  el.className = 'gain-flottant';
  el.innerText = texte;
  el.style.left = (40 + Math.random() * 40) + '%';
  zone.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

// ==================== CARTE ====================
let vueActuelle = 'city';
const canvas = document.getElementById('map-canvas');
const viewport = document.getElementById('map-viewport');

function rendreVilleCanvas() {
  canvas.className = 'terrain-city';
  canvas.innerHTML = '';
  BATIMENTS_VILLE.forEach(b => {
    const niv = monProfil.batiments[b.id] || 1;
    const el = document.createElement('div');
    el.className = 'marker' + (b.capital ? ' capital' : '');
    el.style.left = b.x + 'px';
    el.style.top = b.y + 'px';
    el.onclick = () => {
      if (b.id === 'baraques') { toggleTiroir('baraques'); return; }
      if (b.id === 'rassemblement') { toggleTiroir('rassemblement'); return; }
      if (b.id === 'forgeron') { toggleTiroir('forgeron'); return; }
      if (b.id === 'senat') { ouvrirModal('senat', 'Sénat', 'fa-university', b.img); return; }
      ouvrirModal(b.id, b.nom, b.icon, b.img);
    };
    const icon = b.img ? `<img src="${b.img}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : `<i class="fas ${b.icon}"></i>`;
    el.innerHTML = `<div class="marker-icon">${icon}<div class="marker-level">${niv}</div></div><div class="marker-ribbon">${b.nom}</div>`;
    canvas.appendChild(el);
  });
}

const ICONES_TERRITOIRE = {
  'Forêt': { emoji: '🌲', classe: 'foret' },
  'Montagne': { emoji: '⛰️', classe: 'montagne' },
  'Mine': { emoji: '💎', classe: 'montagne' },
  'Champ': { emoji: '🌾', classe: 'marecage' },
  'Marécage': { emoji: '🐊', classe: 'marecage' }
};

function rendreMondeCanvas() {
  canvas.className = 'terrain-world';
  canvas.innerHTML = '';
  MARQUEURS_MONDE.forEach(m => {
    if (m.type === 'res') {
      const info = _territoiresPossedes[m.id];
      const deco = ICONES_TERRITOIRE[m.nomtype] || { emoji: '🗺️', classe: 'foret' };
      const el = document.createElement('div');
      el.className = 'territoire-marker';
      el.style.left = m.x + 'px';
      el.style.top = m.y + 'px';
      const statutClasse = info?.proprietaireId === monId ? 'possede-moi' : (info?.proprietaireId ? 'possede-autre' : '');
      el.onclick = () => ouvrirProfilTerritoire(m.id);
      el.innerHTML = `<div class="territoire-icone ${deco.classe} ${statutClasse}">${deco.emoji}</div><div class="territoire-label">${m.nomtype} ${info?.proprietaireId ? (info.proprietaireId === monId ? '(toi)' : '(' + info.proprietairePseudo + ')') : ''}</div>`;
      canvas.appendChild(el);
      return;
    }
    const el = document.createElement('div');
    el.className = 'wmarker';
    el.style.left = m.x + 'px';
    el.style.top = m.y + 'px';
    el.onclick = () => {
      if (m.type === 'mine-city') { allerVue('city'); afficherToast('🏛️ Entrée dans ta ville'); return; }
      if (m.type === 'monster') { ouvrirAttaque({ type: 'pnj', nom: 'le monstre niv.' + m.badge, force: m.badge * 60 }); return; }
      if (m.type === 'camp') { ouvrirAttaque({ type: 'pnj', nom: 'le campement niv.' + m.badge, force: m.badge * 50 }); return; }
      if (m.type === 'grande-ville') { ouvrirAttaque({ type: 'pnj', nom: m.nom, force: m.badge * 80, grandeVille: true }); return; }
    };
    if (m.type === 'mine-city') {
      el.innerHTML = `<i class="fas ${m.icon} wmarker-icon mine-city"></i><div class="wmarker-label">${m.nom}</div>`;
    } else if (m.type === 'grande-ville') {
      el.innerHTML = `<div class="wmarker-badge monster" style="background:#7c3aed;">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:var(--gold);"></i><div class="wmarker-label">🌟 ${m.nom}</div>`;
    } else {
      el.innerHTML = `<div class="wmarker-badge monster">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:#f87171;"></i>`;
    }
    canvas.appendChild(el);
  });

  // Joueurs
  _autresJoueurs.forEach(j => {
    const pos = positionJoueur(j.id);
    const el = document.createElement('div');
    el.className = 'royaume-marker';
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.onclick = () => ouvrirProfilVille(j.id);
    el.innerHTML = `<div class="royaume-3d"><div class="royaume-toit"></div><div class="royaume-tourelle gauche"></div><div class="royaume-tourelle droite"></div><div class="royaume-mur"></div><div class="royaume-ombre"></div></div><div class="royaume-label">${j.pseudo}</div><div class="royaume-puissance">⚡${calculerPuissanceDe(j)}</div>`;
    canvas.appendChild(el);
  });
}

let panX = 0, panY = 0, dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
function clampPan() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const cw = vueActuelle === 'city' ? 1700 : 2200;
  const ch = vueActuelle === 'city' ? 2400 : 2800;
  const minX = Math.min(0, vw - cw), minY = Math.min(0, vh - ch);
  panX = Math.max(minX, Math.min(0, panX));
  panY = Math.max(minY, Math.min(0, panY));
}
function appliquerPan() { canvas.style.transform = `translate(${panX}px, ${panY}px)`; }
viewport.addEventListener('pointerdown', e => { dragging = true; viewport.classList.add('grabbing'); startX = e.clientX; startY = e.clientY; startPanX = panX; startPanY = panY; viewport.setPointerCapture(e.pointerId); });
viewport.addEventListener('pointermove', e => { if (!dragging) return; panX = startPanX + (e.clientX - startX); panY = startPanY + (e.clientY - startY); clampPan(); appliquerPan(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => viewport.addEventListener(evt, () => { dragging = false; viewport.classList.remove('grabbing'); }));

function allerVue(vue) {
  vueActuelle = vue;
  document.getElementById('nav-ville-label').innerText = vue === 'city' ? 'Ville' : 'Monde';
  document.getElementById('hudCityName').innerText = vue === 'city' ? monProfil.nomVille : 'Le Monde';
  if (vue === 'city') rendreVilleCanvas(); else rendreMondeCanvas();
  recentrerCarte();
}
window.toggleVue = function() {
  allerVue(vueActuelle === 'city' ? 'world' : 'city');
  afficherToast(vueActuelle === 'city' ? "🏛️ Retour à ta ville" : "🌍 Carte du monde");
};
function recentrerCarte() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  if (vw === 0 || vh === 0) { setTimeout(recentrerCarte, 100); return; }
  if (vueActuelle === 'city') {
    const capital = BATIMENTS_VILLE.find(b => b.capital) || BATIMENTS_VILLE[0];
    panX = -(capital.x - vw / 2); panY = -(capital.y - vh / 2);
  } else {
    const monVillage = MARQUEURS_MONDE.find(m => m.type === 'mine-city');
    panX = -((monVillage ? monVillage.x : 900) - vw / 2);
    panY = -((monVillage ? monVillage.y : 900) - vh / 2);
  }
  clampPan(); appliquerPan();
}

// ==================== TIROIRS & MODALES ====================
let tiroirOuvert = null;
window.toggleTiroir = function(nom) {
  if (nom === 'build') { afficherToast("Touche un bâtiment sur la carte pour l'améliorer 👆"); return; }
  if (tiroirOuvert === nom) { fermerTiroir(); return; }
  document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open', 'slide-in'));
  const drawer = document.getElementById('drawer-' + nom);
  if (!drawer) return;
  drawer.classList.add('open');
  requestAnimationFrame(() => drawer.classList.add('slide-in'));
  document.getElementById('drawer-backdrop').style.display = 'block';
  tiroirOuvert = nom;
  if (nom === 'baraques') creerListeTroupes();
  if (nom === 'recruter') { afficherMesHeros(); afficherRecrutementHeros(); }
  if (nom === 'rassemblement') creerRassemblement();
  if (nom === 'forgeron') afficherForgeEquipement();
  if (nom === 'alliance') afficherAlliance();
  if (nom === 'articles') { afficherArticles(); afficherBoutiqueEquipement(); afficherQuetes(); }
  if (nom === 'research') afficherRecherche();
  if (nom === 'courrier') rendreCourrier();
  if (nom === 'march') document.getElementById('marchList').innerHTML = `<p class="hint">Aucune armée en marche pour l'instant.</p>`;
};
window.fermerTiroir = function() {
  document.querySelectorAll('.drawer.open').forEach(d => { d.classList.remove('slide-in'); setTimeout(() => d.classList.remove('open'), 280); });
  document.getElementById('drawer-backdrop').style.display = 'none';
  tiroirOuvert = null;
};

function creerListeTroupes() {
  const box = document.getElementById('troupesList');
  let html = '';
  for (const [key, def] of Object.entries(DEFS_TROUPES)) {
    html += `<div class="list-row"><i class="fas ${def.icon}"></i><div class="info"><h4>${def.nom} <span style="color:#6ee7b7">(${monProfil.troupes[key]||0})</span></h4><span>Pop ${def.population} · 🌾${def.cout.nourriture} 🪵${def.cout.bois} ⛓️${def.cout.fer}</span></div><button onclick="entrainer('${key}')">Entraîner</button></div>`;
  }
  box.innerHTML = html;
}
window.entrainer = async function(type) {
  const def = DEFS_TROUPES[type];
  const r = monProfil.ressources;
  if (monProfil.populationInactive < def.population) { afficherToast("⛔ Population inactive insuffisante."); return; }
  if (r.nourriture < def.cout.nourriture || r.bois < def.cout.bois || r.fer < def.cout.fer) { afficherToast("⛔ Ressources insuffisantes."); return; }
  r.nourriture -= def.cout.nourriture; r.bois -= def.cout.bois; r.fer -= def.cout.fer;
  monProfil.troupes[type] = (monProfil.troupes[type] || 0) + 1;
  mettreAJourPopulation();
  await sauvegarder({ ressources: r, troupes: monProfil.troupes });
  majHUD(); creerListeTroupes();
  afficherToast(`⚔️ 1 ${def.nom} entraîné !`);
};

function afficherMesHeros() {
  const box = document.getElementById('mesHerosListe');
  if (!box) return;
  const heros = monProfil.heros || [];
  if (heros.length === 0) { box.innerHTML = `<p class="hint">Aucun héros. Recrute-en un ci-dessous !</p>`; return; }
  box.innerHTML = heros.map((h, i) => `<div class="item-card"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}${monProfil.meneurIndex === i ? ' <span style="color:var(--gold);">(Meneur)</span>' : ''}</h4><span>Att ${h.attaque} / Déf ${h.defense} — ${h.competence?.desc || ''}</span></div><button onclick="afficherPanelHeros(${i})" class="btn-sm" style="background:var(--gold);color:#0a061d;">Équiper</button>${monProfil.meneurIndex === i ? `<button onclick="retirerMeneur()" class="btn-sm">Retirer</button>` : `<button onclick="definirMeneur(${i})" class="btn-sm">Nommer meneur</button>`}</div>`).join('');
}
function afficherRecrutementHeros() {
  const box = document.getElementById('recrutementHerosListe');
  if (!box) return;
  box.innerHTML = HEROS_RECRUTABLES.map((h, i) => `<div class="item-card"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}</h4><span>Att ${h.attaque} / Déf ${h.defense}</span></div><button onclick="recruterHeros(${i})" class="btn-sm" style="background:var(--gold);color:#0a061d;">${h.prix}🪙</button></div>`).join('');
}
window.recruterHeros = async function(index) {
  const h = HEROS_RECRUTABLES[index];
  if (monProfil.or < h.prix) { afficherToast("⛔ Pas assez d'or."); return; }
  monProfil.or -= h.prix;
  monProfil.heros = [...(monProfil.heros || []), { ...h }];
  await sauvegarder({ or: monProfil.or, heros: monProfil.heros });
  majHUD();
  afficherMesHeros();
  afficherToast(`${h.icon} ${h.nom} rejoint tes rangs !`);
};
window.definirMeneur = async function(index) {
  monProfil.meneurIndex = index;
  await sauvegarder({ meneurIndex: index });
  afficherMesHeros(); majHUD();
};
window.retirerMeneur = async function() {
  monProfil.meneurIndex = null;
  await sauvegarder({ meneurIndex: null });
  afficherMesHeros(); majHUD();
};

function creerRassemblement() {
  const box = document.getElementById('rassemblementList');
  let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
  for (const [key, def] of Object.entries(DEFS_TROUPES)) {
    html += `<div style="text-align:center;background:rgba(0,0,0,0.3);border:1px solid #3a2d63;border-radius:10px;padding:8px;"><i class="fas ${def.icon}" style="color:var(--gold);font-size:18px;"></i><div style="font-size:11px;margin-top:4px;">${def.nom}</div><div style="font-size:13px;font-weight:bold;color:#6ee7b7;">${monProfil.troupes[key]||0}</div></div>`;
  }
  html += '</div><button onclick="lancerRassemblement()" style="background:var(--gold);color:#0a061d;border:none;padding:12px;border-radius:10px;font-weight:bold;width:100%;cursor:pointer;">🚩 Lancer le rassemblement</button>';
  box.innerHTML = html;
}
window.lancerRassemblement = function() {
  const total = Object.values(monProfil.troupes).reduce((a, b) => a + b, 0);
  if (total === 0) { afficherToast('⛔ Entraîne des troupes à la Caserne avant de rassembler.'); return; }
  afficherToast(`🚩 Rassemblement lancé avec ${total} unités !`);
  fermerTiroir();
};

// ==================== ALLIANCE ====================
window.creerAlliance = async function() {
  const nom = prompt("Nom de ta nouvelle alliance :");
  if (!nom) return;
  const snap = await getDoc(doc(db, COL_ALLIANCES, nom));
  if (snap.exists()) { afficherToast("⛔ Cette alliance existe déjà."); return; }
  await setDoc(doc(db, COL_ALLIANCES, nom), { nom, createur: monProfil.pseudo, membres: [monId] });
  monProfil.allianceId = nom;
  await sauvegarder({ allianceId: nom });
  afficherAlliance();
};
window.rejoindreAllianceExistante = async function(nom) {
  await updateDoc(doc(db, COL_ALLIANCES, nom), { membres: arrayUnion(monId) });
  monProfil.allianceId = nom;
  await sauvegarder({ allianceId: nom });
  afficherAlliance();
};
window.quitterAlliance = async function() {
  if (!monProfil.allianceId) return;
  await updateDoc(doc(db, COL_ALLIANCES, monProfil.allianceId), { membres: arrayRemove(monId) });
  monProfil.allianceId = null;
  await sauvegarder({ allianceId: null });
  afficherAlliance();
};
async function afficherAlliance() {
  const box = document.getElementById('allianceContenu');
  if (!box) return;
  if (monProfil.allianceId) {
    const snap = await getDoc(doc(db, COL_ALLIANCES, monProfil.allianceId));
    if (!snap.exists()) { monProfil.allianceId = null; await sauvegarder({ allianceId: null }); afficherAlliance(); return; }
    const a = snap.data();
    box.innerHTML = `<h4>${a.nom} — ${(a.membres||[]).length} membre(s)</h4><button class="btn-purple" onclick="quitterAlliance()">🚪 Quitter</button>`;
  } else {
    const snap = await getDocs(collection(db, COL_ALLIANCES));
    let listeHtml = "";
    snap.forEach(d => { listeHtml += `<div class="item-card"><div class="info"><h4>${d.data().nom}</h4></div><button onclick="rejoindreAllianceExistante('${d.id}')" class="btn-sm">Rejoindre</button></div>`; });
    box.innerHTML = `<button class="btn-gold" onclick="creerAlliance()">🆕 Fonder une alliance</button>${listeHtml || '<p>Aucune alliance</p>'}`;
  }
}

// ==================== COURRIER ====================
let _courrierRecus = {}, _courrierEnvoyes = {};
function demarrerCourrier() {
  onSnapshot(query(collection(db, COL_COURRIER), where("destinataireId", "==", monId)), (snap) => {
    _courrierRecus = {}; snap.forEach(d => _courrierRecus[d.id] = { id: d.id, ...d.data() });
    rendreCourrier();
  });
  onSnapshot(query(collection(db, COL_COURRIER), where("expediteurId", "==", monId)), (snap) => {
    _courrierEnvoyes = {}; snap.forEach(d => _courrierEnvoyes[d.id] = { id: d.id, ...d.data() });
    rendreCourrier();
  });
}
function rendreCourrier() {
  const box = document.getElementById('courrierListe');
  const tous = [...Object.values(_courrierRecus), ...Object.values(_courrierEnvoyes)];
  tous.sort((a, b) => (a.date?.toMillis?.() || 0) - (b.date?.toMillis?.() || 0));
  if (box) box.innerHTML = tous.map(m => `<div class="mail-row"><b>${m.expediteurId === monId ? 'Toi → ' + (m.destinatairePseudo||'?') : m.expediteurPseudo + ' → toi'} :</b> ${m.texte}</div>`).join('') || `<p class="hint">Aucun message.</p>`;
  const nonLus = Object.values(_courrierRecus).filter(m => !m.lu).length;
  const badge = document.getElementById('badgeCourrier');
  if (badge) { badge.style.display = nonLus > 0 ? 'flex' : 'none'; badge.innerText = nonLus; }
}
window.envoyerCourrier = async function() {
  const destId = document.getElementById('destinataireCourrier').value;
  const input = document.getElementById('courrierInput');
  if (!destId || !input.value.trim()) return;
  const destPseudo = _autresJoueurs.find(j => j.id === destId)?.pseudo || "?";
  await addDoc(collection(db, COL_COURRIER), { expediteurId: monId, expediteurPseudo: monProfil.pseudo, destinataireId: destId, destinatairePseudo: destPseudo, texte: input.value.trim(), date: serverTimestamp(), lu: false });
  input.value = "";
};

// ==================== ARTICLES ====================
const ARTICLES = [
  { id: "bouclier7j", nom: "🛡️ Bouclier 7 jours", desc: "Protège ta ville contre les attaques.", prix: 300 },
  { id: "boostProd", nom: "⚡ Boost production x2 (24h)", desc: "Double ta production automatique.", prix: 250 },
  { id: "sacRessources", nom: "📦 Sac de ressources", desc: "+200🪵 +200🪨 +100⛓️ immédiatement.", prix: 150 },
  { id: "renommer", nom: "✏️ Renommer ta ville", desc: "Change le nom affiché de ta capitale.", prix: 100 }
];
function afficherArticles() {
  const box = document.getElementById('articlesListe');
  if (!box) return;
  box.innerHTML = ARTICLES.map(a => `<div class="item-card"><div class="info"><h4>${a.nom}</h4><span>${a.desc}</span></div><button onclick="acheterArticle('${a.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">${a.prix}🪙</button></div>`).join('');
}
window.acheterArticle = async function(id) {
  const article = ARTICLES.find(a => a.id === id);
  if (monProfil.or < article.prix) { afficherToast("⛔ Pas assez d'or."); return; }
  monProfil.or -= article.prix;
  if (id === "bouclier7j") monProfil.village = { ...(monProfil.village||{}), bouclierFin: Date.now() + 7*86400000 };
  if (id === "boostProd") monProfil.boostProductionFin = Date.now() + 86400000;
  if (id === "sacRessources") { monProfil.ressources.bois += 200; monProfil.ressources.pierre += 200; monProfil.ressources.fer += 100; }
  if (id === "renommer") { const n = prompt("Nouveau nom de ta ville :", monProfil.nomVille || "Lyon"); if (n) monProfil.nomVille = n; else monProfil.or += article.prix; }
  await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, boostProductionFin: monProfil.boostProductionFin, nomVille: monProfil.nomVille, village: monProfil.village });
  majHUD();
  afficherArticles();
};

// ==================== QUÊTES ====================
const QUETES = [
  { id: "q1", nom: "Premiers pas", desc: "Améliore un bâtiment au niveau 2.", objectif: "batiment", cible: 1, recompense: { or: 100, bois: 50 } },
  { id: "q2", nom: "Chasseur débutant", desc: "Vaincs 3 monstres sur la carte.", objectif: "monstres", cible: 3, recompense: { or: 150, pierre: 80 } },
  { id: "q3", nom: "Bûcheron en herbe", desc: "Collecte 200 de bois via la production.", objectif: "bois", cible: 200, recompense: { or: 200, fer: 30 } },
  { id: "q4", nom: "Recruteur", desc: "Recrute ton premier héros.", objectif: "heros", cible: 1, recompense: { or: 300, hero: "Scribe" } },
  { id: "q5", nom: "Conquérant", desc: "Capture un territoire sur la carte.", objectif: "territoire", cible: 1, recompense: { or: 500, prestige: 20 } }
];
function initialiserQuetesActives() {
  if (Object.keys(monProfil.quetes.actives).length === 0) {
    QUETES.forEach(q => {
      if (!monProfil.quetes.terminees.includes(q.id)) {
        monProfil.quetes.actives[q.id] = 0;
      }
    });
  }
}
function verifierProgressionQuetes() {
  let changement = false;
  for (const quete of QUETES) {
    if (monProfil.quetes.actives[quete.id] !== undefined) {
      let avancement = 0;
      switch (quete.objectif) {
        case "batiment":
          avancement = Object.values(monProfil.batiments).reduce((s, n) => Math.max(s, n), 0) - 1;
          break;
        case "monstres":
          avancement = monProfil.quetes.actives[quete.id] || 0;
          break;
        case "bois":
          avancement = monProfil.ressources.bois;
          break;
        case "heros":
          avancement = monProfil.heros.length;
          break;
        case "territoire":
          avancement = Object.values(_territoiresPossedes).filter(t => t.proprietaireId === monId).length;
          break;
      }
      if (avancement >= quete.cible && avancement !== monProfil.quetes.actives[quete.id]) {
        monProfil.quetes.actives[quete.id] = avancement;
        terminerQuete(quete.id);
        changement = true;
      }
    }
  }
  if (changement) sauvegarder({ quetes: monProfil.quetes, inventaireQuetes: monProfil.inventaireQuetes });
}
async function terminerQuete(id) {
  const quete = QUETES.find(q => q.id === id);
  if (!quete || monProfil.quetes.terminees.includes(id)) return;
  monProfil.quetes.terminees.push(id);
  delete monProfil.quetes.actives[id];
  if (quete.recompense.or) monProfil.or += quete.recompense.or;
  if (quete.recompense.bois) monProfil.ressources.bois += quete.recompense.bois;
  if (quete.recompense.pierre) monProfil.ressources.pierre += quete.recompense.pierre;
  if (quete.recompense.fer) monProfil.ressources.fer += quete.recompense.fer;
  if (quete.recompense.prestige) monProfil.prestige += quete.recompense.prestige;
  if (quete.recompense.hero) {
    const h = HEROS_RECRUTABLES.find(x => x.nom === quete.recompense.hero);
    if (h) monProfil.heros.push({ ...h });
  }
  afficherToast(`✅ Quête terminée : ${quete.nom} !`);
  ajouterAuJournal(`✅ ${monProfil.pseudo} a terminé la quête "${quete.nom}".`);
  majHUD();
  afficherQuetes();
}
function afficherQuetes() {
  const box = document.getElementById('quetesListe');
  if (!box) return;
  initialiserQuetesActives();
  let html = "";
  for (const q of QUETES) {
    const statut = monProfil.quetes.terminees.includes(q.id) ? "✅ Terminée" : (monProfil.quetes.actives[q.id] !== undefined ? `En cours (${monProfil.quetes.actives[q.id]}/${q.cible})` : "Non débutée");
    html += `<div class="strategie-row"><div class="info"><h4>${q.nom} <span style="color:#6ee7b7;">${statut}</span></h4><span>${q.desc}</span></div></div>`;
  }
  box.innerHTML = html;
}

// ==================== SÉNAT ====================
function afficherSenat() {
  mettreAJourPopulation();
  const modal = document.getElementById('build-modal');
  let html = `<h3>🏛️ Sénat</h3>`;
  html += `<p>Population max : ${monProfil.populationMax}</p>`;
  html += `<p>Active (production) : ${monProfil.populationActive}</p>`;
  html += `<p>Militaire : ${monProfil.populationMilitaire}</p>`;
  html += `<p>Inactive : ${monProfil.populationInactive}</p>`;
  html += `<p>Taux production : N ${calculerTauxProduction().nourriture.toFixed(1)}/h, B ${calculerTauxProduction().bois.toFixed(1)}/h, P ${calculerTauxProduction().pierre.toFixed(1)}/h, F ${calculerTauxProduction().fer.toFixed(1)}/h</p>`;
  html += `<p>Moral : ${monProfil.moral} / 100</p>`;
  html += `<p>Impôts : ${monProfil.tauxImpots}% <button onclick="changerImpots(1)" class="btn-sm">+</button> <button onclick="changerImpots(-1)" class="btn-sm">-</button></p>`;
  html += `<h4>Héros fonctionnaire</h4>`;
  if (monProfil.heros.length > 0) {
    monProfil.heros.forEach((h, i) => {
      const actif = monProfil.herosFonctionnaireIndex === i;
      html += `<button onclick="assignerFonctionnaire(${i})" class="btn-sm" style="${actif ? 'background:var(--gold);color:#0a061d;' : ''}">${h.icon} ${h.nom} ${actif ? '✔' : ''}</button> `;
    });
  } else {
    html += `<p>Aucun héros disponible.</p>`;
  }
  html += `<button class="close-btn" onclick="fermerModal()">Fermer</button>`;
  modal.innerHTML = html;
  document.getElementById('build-modal-backdrop').style.display = 'flex';
}
window.changerImpots = async function(delta) {
  monProfil.tauxImpots = Math.max(0, Math.min(50, monProfil.tauxImpots + delta));
  await sauvegarder({ tauxImpots: monProfil.tauxImpots });
  afficherSenat();
};
window.assignerFonctionnaire = async function(index) {
  monProfil.herosFonctionnaireIndex = index;
  await sauvegarder({ herosFonctionnaireIndex: index });
  afficherSenat();
};

// ==================== MODAL CONSTRUCTION ====================
let cibleActuelle = null;
const COUTS_AMELIORATION = (niv) => ({ or: (niv+1)*80, bois: (niv+1)*20, pierre: (niv+1)*15 });
window.ouvrirModal = function(id, nom, icon, img) {
  if (id === 'senat') {
    afficherSenat();
    return;
  }
  cibleActuelle = id;
  const niv = monProfil.batiments[id] || 1;
  const cout = COUTS_AMELIORATION(niv);
  const modal = document.getElementById('build-modal');
  const visuel = img ? `<img src="${img}" style="width:84px;height:84px;object-fit:cover;border-radius:12px;border:2px solid var(--gold);margin:0 auto 8px;display:block;">` : `<i class="fas ${icon} modal-icon"></i>`;
  modal.innerHTML = `${visuel}<h3>${nom}</h3><div class="modal-level">Niveau ${niv}</div><div class="modal-cost"><span>🪙 ${cout.or}</span><span>🪵 ${cout.bois}</span><span>🪨 ${cout.pierre}</span></div><button onclick="ameliorer()">Améliorer</button><button class="close-btn" onclick="fermerModal()">Fermer</button>`;
  document.getElementById('build-modal-backdrop').style.display = 'flex';
};
window.fermerModal = function() { document.getElementById('build-modal-backdrop').style.display = 'none'; cibleActuelle = null; };
window.ameliorer = async function() {
  if (!cibleActuelle) return;
  const niv = monProfil.batiments[cibleActuelle] || 1;
  const cout = COUTS_AMELIORATION(niv);
  const r = monProfil.ressources;
  if (monProfil.or < cout.or) { afficherToast(`⛔ Il faut ${cout.or}🪙.`); return; }
  if (r.bois < cout.bois) { afficherToast(`⛔ Il faut ${cout.bois}🪵.`); return; }
  if (r.pierre < cout.pierre) { afficherToast(`⛔ Il faut ${cout.pierre}🪨.`); return; }
  monProfil.or -= cout.or; r.bois -= cout.bois; r.pierre -= cout.pierre;
  monProfil.batiments[cibleActuelle] = niv + 1;
  await sauvegarder({ or: monProfil.or, ressources: r, batiments: monProfil.batiments });
  mettreAJourPopulation();
  majHUD(); rendreVilleCanvas(); fermerModal();
  afficherGainFlottant(`🏗️ Niveau ${monProfil.batiments[cibleActuelle]} !`);
  afficherToast(`🏗️ Niveau ${monProfil.batiments[cibleActuelle]} atteint !`);
  verifierProgressionQuetes();
};

// ==================== MODALS DYNAMIQUES ====================
function creerModalsDynamiques() {
  if (!document.getElementById('hero-equip-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'hero-equip-backdrop';
    backdrop.style.cssText = 'position:absolute;inset:0;z-index:75;display:none;background:rgba(0,0,0,0.55);align-items:flex-end;justify-content:center;';
    backdrop.onclick = function(e) { if (e.target === this) fermerHeroPanel(); };
    const modal = document.createElement('div');
    modal.id = 'hero-equip-modal';
    modal.style.cssText = 'width:100%;max-width:480px;background:linear-gradient(180deg,#1a1440,#0a061d);border-top:2px solid var(--gold);border-radius:18px 18px 0 0;padding:20px;text-align:center;';
    backdrop.appendChild(modal);
    document.getElementById('main-container').appendChild(backdrop);
  }
  if (!document.getElementById('hero-attaque-backdrop')) {
    const backdrop = document.createElement('div');
    backdrop.id = 'hero-attaque-backdrop';
    backdrop.style.cssText = 'position:absolute;inset:0;z-index:75;display:none;background:rgba(0,0,0,0.55);align-items:flex-end;justify-content:center;';
    backdrop.onclick = function(e) { if (e.target === this) fermerSelectionHeroAttaque(); };
    const modal = document.createElement('div');
    modal.id = 'hero-attaque-modal';
    modal.style.cssText = 'width:100%;max-width:480px;background:linear-gradient(180deg,#1a1440,#0a061d);border-top:2px solid var(--gold);border-radius:18px 18px 0 0;padding:20px;text-align:center;';
    backdrop.appendChild(modal);
    document.getElementById('main-container').appendChild(backdrop);
  }
}

// ==================== ENTRER DANS LE JEU ====================
let _autresJoueurs = [];
async function chargerAutresJoueurs() {
  const snap = await getDocs(collection(db, COL));
  _autresJoueurs = [];
  snap.forEach(d => { if (d.id !== monId) _autresJoueurs.push({ id: d.id, ...d.data() }); });
}
function positionJoueur(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
  return { x: 200 + (h % 1800), y: 200 + Math.floor(h / 1800) % 2400 };
}

async function entrerDansLeJeu() {
  if (!monProfil.ressources) monProfil.ressources = { nourriture:800, bois:600, pierre:400, fer:200 };
  if (!monProfil.batiments) monProfil.batiments = batimentsParDefaut();
  if (!monProfil.troupes) monProfil.troupes = { fantassins:0, archers:0, cavaliers:0, cavaliersBlindes:0, balistes:0, trebuchets:0, piquiers:0, mages:0, golems:0, chevaliersNoirs:0, assassins:0, pretres:0 };
  if (!monProfil.equipement) monProfil.equipement = { epee:0, bouclier:0, armure:0, arc:0, heaume:0 };
  if (monProfil.dernierCalcul === undefined) monProfil.dernierCalcul = Date.now();
  if (!monProfil.nomVille) monProfil.nomVille = "Lyon";
  if (monProfil.allianceId === undefined) monProfil.allianceId = null;
  if (!monProfil.strategies) monProfil.strategies = { mecontentement: 0, brusque: 0 };
  if (!monProfil.heros) monProfil.heros = [];
  if (monProfil.meneurIndex === undefined) monProfil.meneurIndex = null;
  if (!monProfil.inventaireEquipement) monProfil.inventaireEquipement = [];
  if (!monProfil.recherches) monProfil.recherches = {};
  if (monProfil.prestige === undefined) monProfil.prestige = 0;
  if (!monProfil.quetes) monProfil.quetes = { actives: {}, terminees: [] };
  if (!monProfil.inventaireQuetes) monProfil.inventaireQuetes = [];
  if (monProfil.moral === undefined) monProfil.moral = 80;
  if (monProfil.tauxImpots === undefined) monProfil.tauxImpots = 10;
  if (monProfil.herosFonctionnaireIndex === undefined) monProfil.herosFonctionnaireIndex = null;
  if (monProfil.heroAttaqueIndex === undefined) monProfil.heroAttaqueIndex = null;

  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('game-ui').style.display = 'flex';
  document.getElementById('hudCityName').innerText = monProfil.nomVille;
  creerModalsDynamiques();
  mettreAJourPopulation();
  await calculerProductionAutomatique();
  majHUD();
  rendreVilleCanvas();
  demarrerChat();
  demarrerJournal();
  await chargerAutresJoueurs();
  await chargerTerritoires();
  await calculerProductionTerritoires();
  demarrerCourrier();
  demarrerParticules();
  initialiserQuetesActives();
  verifierProgressionQuetes();
  lancerProductionEnDirect();
  document.getElementById('bgMusic').play().catch(() => {});
  setTimeout(recentrerCarte, 150);
  document.getElementById('loading-overlay').classList.remove('show');
  afficherToast(`👑 Bienvenue, ${monProfil.pseudo} !`);
}

function demarrerParticules() {
  const zone = document.getElementById('particules-container');
  if (!zone) return;
  setInterval(() => {
    const p = document.createElement('div');
    p.className = 'particule';
    p.style.left = Math.random() * 100 + '%';
    p.style.bottom = '0px';
    p.style.animationDuration = (4 + Math.random() * 4) + 's';
    zone.appendChild(p);
    setTimeout(() => p.remove(), 8000);
  }, 700);
}

window.basculerMusique = function() {
  const audio = document.getElementById('bgMusic');
  const icone = document.getElementById('musicIcon');
  if (audio.paused) { audio.play().catch(() => {}); icone.className = 'fas fa-volume-up'; }
  else { audio.pause(); icone.className = 'fas fa-volume-mute'; }
};

// ==================== RESTAURATION DE SESSION ====================
const savedId = localStorage.getItem('lyon_id');
if (savedId) {
  document.getElementById('codeInput').value = savedId;
  seConnecter();
             }
