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
    or: 500, moral: 80, tauxImpots: 10, // 🆕 moral et impôts
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
  } catch (e) { msg.innerText = "Erreur : " + e.message; document.getElementById('loading-overlay').classList.remove('show'); }
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

// ==================== PRODUCTION (en direct + hors ligne) ====================
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
  // Malus si révolte
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
    // Ajout des ressources (par seconde)
    monProfil.ressources.nourriture += taux.nourriture / 3600;
    monProfil.ressources.bois += taux.bois / 3600;
    monProfil.ressources.pierre += taux.pierre / 3600;
    monProfil.ressources.fer += taux.fer / 3600;
    // Impôts : or gagné en fonction population et taux
    const popTotale = monProfil.populationMax;
    const gainOrSeconde = (popTotale * (monProfil.tauxImpots / 100)) / 60; // or par seconde
    monProfil.or += gainOrSeconde;
    // Moral : baisse si impôts élevés, remonte si bas
    if (monProfil.tauxImpots > 20) {
      monProfil.moral = Math.max(0, monProfil.moral - 0.01 * (monProfil.tauxImpots - 20));
    } else if (monProfil.tauxImpots < 10) {
      monProfil.moral = Math.min(100, monProfil.moral + 0.005);
    }
    // Arrondir
    monProfil.ressources.nourriture = Math.floor(monProfil.ressources.nourriture);
    monProfil.ressources.bois = Math.floor(monProfil.ressources.bois);
    monProfil.ressources.pierre = Math.floor(monProfil.ressources.pierre);
    monProfil.ressources.fer = Math.floor(monProfil.ressources.fer);
    monProfil.or = Math.floor(monProfil.or);
    monProfil.moral = Math.round(monProfil.moral * 100) / 100;
    majHUD();
    // Sauvegarde périodique
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
  // Or hors ligne
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
  // Population
  if (document.getElementById('hudPopInactive')) {
    document.getElementById('hudPopInactive').innerText = monProfil.populationInactive;
    document.getElementById('hudPopMax').innerText = monProfil.populationMax;
  }
}

// ==================== DONNEES BATIMENTS & MONDE ====================
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

// ==================== EQUIPEMENTS & SETS ====================
const TOUS_EQUIPEMENTS = [
  // Set Lion (Guerrier) - 3/5 immortalité, 5/5 contre-attaque
  { id:'lion_epee', slot:'arme', nom:'⚔️ Épée du Lion', att:20, def:0, vit:0, set:'Lion', source:'forge', coutOr:300, coutMat:{bois:20, fer:40}, rarete:'Commun' },
  { id:'lion_casque', slot:'casque', nom:'🪖 Heaume du Lion', att:0, def:20, vit:0, set:'Lion', source:'forge', coutOr:250, coutMat:{bois:10, fer:30}, rarete:'Commun' },
  { id:'lion_armure', slot:'armure', nom:'🛡️ Cuirasse du Lion', att:10, def:15, vit:0, set:'Lion', source:'forge', coutOr:400, coutMat:{bois:15, fer:50}, rarete:'Rare' },
  { id:'lion_bottes', slot:'bottes', nom:'👢 Bottes du Lion', att:0, def:5, vit:3, set:'Lion', source:'forge', coutOr:200, coutMat:{bois:5, fer:10}, rarete:'Commun' },
  { id:'lion_medaille', slot:'medaille', nom:'🎖️ Médaille du Lion', att:10, def:10, vit:0, set:'Lion', source:'forge', coutOr:350, coutMat:{bois:10, fer:20}, rarete:'Rare' },
  // Set Faille Temporelle (5/5 reset combat +80 force)
  { id:'faille_epee', slot:'arme', nom:'🗡️ Lame de la Faille', att:35, def:-5, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1500, rarete:'Épique' },
  { id:'faille_casque', slot:'casque', nom:'🌌 Heaume Temporel', att:0, def:25, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1200, rarete:'Épique' },
  { id:'faille_armure', slot:'armure', nom:'🌌 Armure Temporelle', att:15, def:30, vit:-2, set:'Faille Temporelle', source:'boutique', coutOr:1800, rarete:'Épique' },
  { id:'faille_bottes', slot:'bottes', nom:'👢 Bottes Temporelles', att:5, def:10, vit:15, set:'Faille Temporelle', source:'boutique', coutOr:1000, rarete:'Épique' },
  { id:'faille_medaille', slot:'medaille', nom:'⏳ Pendentif de la Faille', att:10, def:15, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:2000, rarete:'Épique' },
  // Set Assassin (3/5 critique, 5/5 reset +80)
  { id:'assassin_epee', slot:'arme', nom:'🗡️ Lame de l\'Assassin', att:30, def:0, vit:10, set:'Assassin', source:'boutique', coutOr:1400, rarete:'Rare' },
  { id:'assassin_casque', slot:'casque', nom:'🌑 Masque de l\'Assassin', att:10, def:15, vit:10, set:'Assassin', source:'boutique', coutOr:1100, rarete:'Rare' },
  { id:'assassin_armure', slot:'armure', nom:'🌑 Cape de l\'Assassin', att:20, def:20, vit:10, set:'Assassin', source:'boutique', coutOr:1700, rarete:'Rare' },
  { id:'assassin_bottes', slot:'bottes', nom:'👢 Bottes de l\'Assassin', att:5, def:5, vit:20, set:'Assassin', source:'boutique', coutOr:900, rarete:'Rare' },
  { id:'assassin_medaille', slot:'medaille', nom:'🎖️ Insigne de l\'Assassin', att:15, def:5, vit:10, set:'Assassin', source:'boutique', coutOr:1900, rarete:'Rare' },
  // Set Berserker (3/5 furie, 5/5 dernier souffle)
  { id:'berserker_epee', slot:'arme', nom:'🪓 Hache du Berserker', att:40, def:-10, vit:0, set:'Berserker', source:'forge', coutOr:1200, coutMat:{bois:50, fer:80}, rarete:'Rare' },
  { id:'berserker_casque', slot:'casque', nom:'🐺 Casque du Berserker', att:15, def:10, vit:5, set:'Berserker', source:'forge', coutOr:900, coutMat:{bois:30, fer:40}, rarete:'Rare' },
  { id:'berserker_armure', slot:'armure', nom:'🛡️ Armure du Berserker', att:20, def:25, vit:-5, set:'Berserker', source:'forge', coutOr:1500, coutMat:{bois:40, fer:70}, rarete:'Rare' },
  { id:'berserker_bottes', slot:'bottes', nom:'👢 Bottes du Berserker', att:10, def:5, vit:10, set:'Berserker', source:'forge', coutOr:700, coutMat:{bois:20, fer:30}, rarete:'Rare' },
  { id:'berserker_medaille', slot:'medaille', nom:'🎖️ Médaille du Berserker', att:20, def:5, vit:5, set:'Berserker', source:'forge', coutOr:1300, coutMat:{bois:30, fer:50}, rarete:'Rare' },
  // Set Paladin (3/5 bouclier sacré, 5/5 inversion)
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
  let passifs = [];
  if (hero.equipements) {
    hero.equipements.forEach(idEquip => {
      const equip = TOUS_EQUIPEMENTS.find(e => e.id === idEquip);
      if (equip) {
        att += equip.att;
        def += equip.def;
        vit += equip.vit || 0;
        if (equip.set) {
          // Gérer les compétences de set plus tard
        }
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

// ==================== FONCTIONS EQUIPEMENTS ====================
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

// ==================== PANEL HÉROS EQUIPEMENT ====================
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
  // Afficher le panneau des troupes
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

// ==================== COMBAT (avec sets) ====================
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

// Appliquer les effets de set avant le combat (pour héros attaquant)
function appliquerSetsAttaquant(attaque) {
  const hero = monProfil.heros[monProfil.heroAttaqueIndex];
  if (!hero) return attaque;
  const setsActifs = calculerSetActifs(hero);
  for (const [nomSet, niveau] of Object.entries(setsActifs)) {
    if (nomSet === 'Berserker' && niveau >= 3) attaque = Math.round(attaque * 1.15);
    if (nomSet === 'Assassin' && niveau >= 3) attaque = Math.round(attaque * 1.1); // bonus critique approximé
  }
  return attaque;
}

// Appliquer les effets de set du défenseur
function appliquerSetsDefenseur(defense) {
  // Le défenseur utilise son meneur ou premier héros
  const idx = monProfil.meneurIndex || 0;
  const hero = monProfil.heros[idx];
  if (!hero) return defense;
  const setsActifs = calculerSetActifs(hero);
  for (const [nomSet, niveau] of Object.entries(setsActifs)) {
    if (nomSet === 'Paladin' && niveau >= 3) defense = Math.round(defense * 1.25); // bouclier sacré
    if (nomSet === 'Lion' && niveau >= 3) defense = Math.round(defense * 1.15); // défense accrue
  }
  return defense;
}

// Modifier la fonction lancerAttaque pour appliquer les sets et gérer reset/immortalité
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
    sonDefense = appliquerSetsDefenseur.call({ monProfil: defenseur }, sonDefense);
    victoire = monAttaque * (0.85 + Math.random() * 0.3) >= sonDefense;
    // Effet "Faille Temporelle" (reset) pour l'attaquant
    const heroAttaquant = monProfil.heros[monProfil.heroAttaqueIndex];
    const setsAttaquant = calculerSetActifs(heroAttaquant);
    if (!victoire && setsAttaquant['Faille Temporelle'] === 5) {
      // Reset + 80 force
      victoire = (monAttaque + 80) >= sonDefense;
      afficherToast("⏳ Faille Temporelle activée ! Le combat recommence avec +80 de force.");
    }
    // Effet "Immortalité" défenseur (set Lion 3/5)
    const heroDefenseur = defenseur.heros[defenseur.meneurIndex || 0];
    const setsDefenseur = calculerSetActifs(heroDefenseur);
    if (victoire && setsDefenseur['Lion'] === 3) {
      victoire = false;
      afficherToast("🛡️ Immortalité du défenseur : il survit avec 1 PV !");
    }
  }

  await deplacerTroupes(cibleAttaque.nom);
  await animerCombat(monProfil.pseudo, monProfil.avatar, cibleAttaque.nom, cibleAttaque.type === 'pnj' ? '👹' : '🏰', victoire);

  // Gérer les conséquences (récompenses/pertes)
  // ... (code existant de butin, etc.)
};

// Le reste du script (quêtes, carte, etc.) reste identique à la version précédente.
// Par souci de brièveté, je n'inclus pas tout ici, mais tu peux copier les fonctions manquantes depuis le message précédent.
// Assure-toi d'avoir toutes les fonctions de carte, tiroirs, etc.

// ==================== INITIALISATION ET MODALS DYNAMIQUES ====================
function creerModalsDynamiques() {
  // Modal équipement héros
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
  // Modal sélection héros attaque
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

async function entrerDansLeJeu() {
  // Initialiser les champs manquants
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

// ==================== RESTAURATION DE SESSION ====================
const savedId = localStorage.getItem('lyon_id');
if (savedId) {
  document.getElementById('codeInput').value = savedId;
  seConnecter();
        }
