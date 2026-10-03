import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyCHw1y_HTgPvtFrn18QOR5y7mvMo53p01A", authDomain: "univers-des-otakus-90640.firebaseapp.com", projectId: "univers-des-otakus-90640", storageBucket: "univers-des-otakus-90640.firebasestorage.app", messagingSenderId: "55096557900", appId: "1:55096557900:web:280115592b1dc051564fe9" };
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const COL = "lyonMembres", COL_CHAT = "lyonMessages", COL_JOURNAL = "lyonJournal", COL_ALLIANCES = "lyonAlliances", COL_COURRIER = "lyonCourrier", COL_TERRITOIRES = "lyonTerritoires", COL_PNJ = "lyonPNJ";
const CODE_COMMUN = "LYON2026";
let monId = "", monProfil = null;
let canvas, viewport, _autresJoueurs = [];

function batimentsParDefaut() { return { senat:1,maison1:1,maison2:1,maison3:1,maison4:1,villa:1,baraques:1,taverne:1,forgeron:1,stationrelais:1,mirador:1,atelier:1,rassemblement:1,ferme1:1,scierie1:1,carriere1:1,mine1:1,ferme2:1,ferme3:1,carriere2:1,ferme4:1 }; }
function profilParDefaut(pseudo, codeRecup) { return { pseudo, avatar: "👑", codeRecuperation: codeRecup, banni: false, or: 500, moral: 80, tauxImpots: 10, allianceId: null, nomVille: "Lyon", prestige: 0, strategies: { mecontentement: 0, brusque: 0, contreOffensive: 0, faillite: 0 }, contreOffensifFin: null, malusProductionFin: null, heros: [], meneurIndex: null, herosFonctionnaireIndex: null, heroAttaqueIndex: null, inventaireEquipement: [], recherches: {}, ressources: { nourriture: 800, bois: 600, pierre: 400, fer: 200 }, batiments: batimentsParDefaut(), troupes: { fantassins:0,archers:0,cavaliers:0,cavaliersBlindes:0,balistes:0,trebuchets:0,piquiers:0,mages:0,golems:0,chevaliersNoirs:0,assassins:0,pretres:0 }, equipement: { epee:0, bouclier:0, armure:0, arc:0, heaume:0 }, dernierCalcul: Date.now(), quetes: { actives: {}, terminees: [] }, tutorielVu: false, monstresVaincus: [], constructionsEnCours: [], entrainementsEnCours: [] }; }

window.ouvrirEcran = function(id) { document.querySelectorAll('#login-screen .auth-overlay').forEach(el => el.style.display = 'none'); document.getElementById(id).style.display = 'block'; };
window.seConnecter = async function() { const code = document.getElementById('codeInput').value.trim(); const msg = document.getElementById('messageConnexion'); if (!code) { msg.innerText = "Entre ton code."; return; } document.getElementById('loading-overlay').classList.add('show'); try { const snap = await getDoc(doc(db, COL, code)); if (snap.exists() && !snap.data().banni) { monId = code; monProfil = snap.data(); localStorage.setItem('lyon_id', code); entrerDansLeJeu(); } else { msg.innerText = snap.exists() ? "Compte banni." : "Code invalide."; document.getElementById('loading-overlay').classList.remove('show'); } } catch (e) { msg.innerText = "Erreur : " + e.message; document.getElementById('loading-overlay').classList.remove('show'); } };
window.validerInscription = async function() { const codeSaisi = document.getElementById('codeInscriptionInput').value.trim(); const pseudo = document.getElementById('pseudoInscriptionInput').value.trim(); const msg = document.getElementById('messageInscription'); if (codeSaisi !== CODE_COMMUN) { msg.innerText = "Code invalide."; return; } if (!pseudo) { msg.innerText = "Choisis un nom."; return; } const deja = await getDocs(query(collection(db, COL), where("pseudo","==",pseudo))); if (!deja.empty) { msg.innerText = "Ce nom est pris."; return; } const id = "LY" + Date.now(); const codeRecup = String(Math.floor(100000 + Math.random() * 900000)); const data = profilParDefaut(pseudo, codeRecup); await setDoc(doc(db, COL, id), data); monId = id; monProfil = data; localStorage.setItem('lyon_id', id); document.getElementById('codeRecupAffiche').innerText = codeRecup; document.getElementById('idAffiche').innerText = id; ouvrirEcran('coderecup-overlay'); };
window.fermerCodeRecup = function() { entrerDansLeJeu(); };
window.recupererCompte = async function() { const code = document.getElementById('codeRecuperationInput').value.trim(); const msg = document.getElementById('messageRecuperation'); const snap = await getDocs(query(collection(db, COL), where("codeRecuperation","==",code))); if (snap.empty) { msg.innerText = "Code introuvable."; return; } const d = snap.docs[0]; monId = d.id; monProfil = d.data(); localStorage.setItem('lyon_id', d.id); entrerDansLeJeu(); };
async function sauvegarder(champs) { await updateDoc(doc(db, COL, monId), champs); }

function calculerPopulationMax() { const b = monProfil.batiments; let pop = 0; ['maison1','maison2','maison3','maison4'].forEach(m => pop += (b[m]||0)*10); pop += (b['villa']||0)*20; return pop; }
function calculerPopulationActiveProduction() { const b = monProfil.batiments; let pop = 0; ['ferme1','ferme2','ferme3','ferme4'].forEach(f => pop += (b[f]||0)*2); pop += (b['scierie1']||0)*3; pop += (b['carriere1']||0)*3; pop += (b['carriere2']||0)*3; pop += (b['mine1']||0)*4; return pop; }
function calculerPopulationMilitaire() { let pop = 0; for (const [t,n] of Object.entries(monProfil.troupes || {})) { const d = DEFS_TROUPES[t]; if (d) pop += (n||0)*d.population; } return pop; }
function mettreAJourPopulation() { monProfil.populationMax = calculerPopulationMax(); monProfil.populationActive = calculerPopulationActiveProduction(); monProfil.populationMilitaire = calculerPopulationMilitaire(); monProfil.populationInactive = Math.max(0, monProfil.populationMax - monProfil.populationActive - monProfil.populationMilitaire); }

let dernierSauvegarde = Date.now(), intervalleProduction = null;
function calculerTauxProduction() { const b = monProfil.batiments; let tN=0,tB=0,tP=0,tF=0; ['ferme1','ferme2','ferme3','ferme4'].forEach(f => tN += (b[f]||0)*10); tB += (b['scierie1']||0)*12; tP += (b['carriere1']||0)*10; tP += (b['carriere2']||0)*10; tF += (b['mine1']||0)*8; const idx = monProfil.herosFonctionnaireIndex; if (idx !== null && idx !== undefined && monProfil.heros[idx]) { const bonus = 1 + monProfil.heros[idx].etoiles * 0.1; tN*=bonus; tB*=bonus; tP*=bonus; tF*=bonus; } if (bonusTechnologie(monProfil,'agriculture1')) tN *= 1.2; if (monProfil.boostProductionFin > Date.now()) { tN*=2; tB*=2; tP*=2; tF*=2; } if (monProfil.malusProductionFin > Date.now()) { tN*=0.5; tB*=0.5; tP*=0.5; tF*=0.5; } if (monProfil.moral < 30) { tN*=0.5; tB*=0.5; tP*=0.5; tF*=0.5; } return { nourriture: tN, bois: tB, pierre: tP, fer: tF }; }

function lancerProductionEnDirect() { if (intervalleProduction) clearInterval(intervalleProduction); intervalleProduction = setInterval(() => { if (!monProfil) return; const t = calculerTauxProduction(); monProfil.ressources.nourriture += t.nourriture/3600; monProfil.ressources.bois += t.bois/3600; monProfil.ressources.pierre += t.pierre/3600; monProfil.ressources.fer += t.fer/3600; monProfil.or += (monProfil.populationMax * (monProfil.tauxImpots/100))/60; if (monProfil.tauxImpots > 20) monProfil.moral = Math.max(0, monProfil.moral - 0.01*(monProfil.tauxImpots-20)); else if (monProfil.tauxImpots < 10) monProfil.moral = Math.min(100, monProfil.moral + 0.005); monProfil.ressources.nourriture = Math.floor(monProfil.ressources.nourriture); monProfil.ressources.bois = Math.floor(monProfil.ressources.bois); monProfil.ressources.pierre = Math.floor(monProfil.ressources.pierre); monProfil.ressources.fer = Math.floor(monProfil.ressources.fer); monProfil.or = Math.floor(monProfil.or); monProfil.moral = Math.round(monProfil.moral*100)/100; majHUD(); verifierConstructions(); verifierEntrainements(); if (Date.now() - dernierSauvegarde > 30000) { dernierSauvegarde = Date.now(); sauvegarder({ ressources: monProfil.ressources, or: monProfil.or, moral: monProfil.moral }); } }, 1000); }

async function calculerProductionAutomatique() { const p = monProfil; const h = Math.min(48, (Date.now() - (p.dernierCalcul||Date.now()))/3600000); if (h < 0.02) return; let t = calculerTauxProduction(); let gN = Math.round(t.nourriture*h), gB = Math.round(t.bois*h), gP = Math.round(t.pierre*h), gF = Math.round(t.fer*h); if (p.boostProductionFin > Date.now()) { gN*=2; gB*=2; gP*=2; gF*=2; } p.ressources.nourriture += gN; p.ressources.bois += gB; p.ressources.pierre += gP; p.ressources.fer += gF; p.or += Math.round(calculerPopulationMax()*(p.tauxImpots/100)*h); p.dernierCalcul = Date.now(); await sauvegarder({ ressources: p.ressources, or: p.or, dernierCalcul: p.dernierCalcul }); if (gN||gB||gP||gF) afficherToast(`⏳ +${gN}🌾 +${gB}🪵 +${gP}🪨 +${gF}⛓️`); }

function majHUD() { document.getElementById('avatarBox').innerText = monProfil.avatar||"👑"; document.getElementById('pnameAffiche').innerText = monProfil.pseudo; document.getElementById('puissanceAffiche').innerText = calculerPuissance(); document.getElementById('prestigeAffiche').innerText = monProfil.prestige||0; document.getElementById('hudNourriture').innerText = Math.floor(monProfil.ressources.nourriture); document.getElementById('hudBois').innerText = Math.floor(monProfil.ressources.bois); document.getElementById('hudPierre').innerText = Math.floor(monProfil.ressources.pierre); document.getElementById('hudFer').innerText = Math.floor(monProfil.ressources.fer); document.getElementById('hudOr').innerText = Math.floor(monProfil.or); document.getElementById('hudPopInactive').innerText = Math.floor(monProfil.populationInactive||0); document.getElementById('hudPopMax').innerText = Math.floor(monProfil.populationMax||0); document.getElementById('hudMoral').innerText = Math.round(monProfil.moral||0); }

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
  { type:'grande-ville', nom:'Citadelle Oubliée', icon:'fa-chess-rook', badge:25, x:1500,y:400, heroCapture: 'seigneur_ciel' },
  { type:'grande-ville', nom:'Cité des Abysses', icon:'fa-water', badge:30, x:300,y:2200, heroCapture: 'dragon_airain' },
  { type:'pnj-ville', nom:'Sissi', categorie:'petite', icon:'fa-house', badge:8, x:800,y:1200, heroCapture:'chevalier_sissi', force:200 },
  { type:'pnj-ville', nom:'Ciel', categorie:'grande', icon:'fa-city', badge:30, x:1500,y:2000, heroCapture:'seigneur_ciel', force:800 },
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
];// ==================== HÉROS (noms variés) ====================
const POOLS_NOMS = {
  scribe: ["Elyas","Malachar","Orin","Vaelys","Théodred","Kalek","Sylas","Draven","Ulric","Yoren"],
  milicien: ["Bran","Kael","Rurik","Aeden","Gorm","Torvald","Halvard","Fenrir","Sigurd","Bjorn"],
  chevalier: ["Roland","Gareth","Alaric","Baldwin","Lucius","Cassian","Aldric","Ewan","Tristan","Osric"],
  archer: ["Lyra","Selene","Kaeda","Faelen","Nyra","Alwyn","Rion","Sylva","Aeryn","Thalia"],
  mage: ["Morvane","Zephyros","Orlaine","Kaelith","Vesper","Aznar","Eryndor","Nyx","Aldrath","Mirel"],
  paladin: ["Aurel","Cedric","Dorian","Elias","Ferrand","Godric","Hugo","Ivar","Léon","Mathis"],
  assassin: ["Vex","Kaine","Silas","Rook","Nyx","Viren","Ashram","Kryll","Zane","Sable"],
  pretresse: ["Mira","Lyanna","Seraphine","Isolde","Ysolde","Aveline","Noira","Elowen","Branna","Cassia"]
};
function nomAleatoire(pool) { const arr = POOLS_NOMS[pool] || POOLS_NOMS.milicien; return arr[Math.floor(Math.random()*arr.length)]; }

const HEROS_RECRUTABLES = [
  { type:"scribe",   nom:nomAleatoire("scribe"),   icon:"📜", etoiles:1, attaque:5,  defense:5,  prix:100,  competence:{type:"butin",valeur:0.1,desc:"+10% butin"}, equipements:[] },
  { type:"milicien", nom:nomAleatoire("milicien"), icon:"⚔️", etoiles:1, attaque:10, defense:8,  prix:150,  competence:{type:"aucune",desc:"Aucune compétence spéciale"}, equipements:[] },
  { type:"chevalier",nom:nomAleatoire("chevalier"),icon:"🛡️", etoiles:2, attaque:25, defense:20, prix:400,  competence:{type:"immunite",valeur:0.15,desc:"15% de chance d'ignorer une attaque"}, equipements:[] },
  { type:"archer",   nom:nomAleatoire("archer"),   icon:"🏹", etoiles:2, attaque:30, defense:10, prix:380,  competence:{type:"vitesse",valeur:0.3,desc:"Déplacements 30% plus rapides"}, equipements:[] },
  { type:"mage",     nom:nomAleatoire("mage"),     icon:"🔮", etoiles:3, attaque:50, defense:15, prix:900,  competence:{type:"critique",valeur:0.2,desc:"20% de chance d'attaque critique (+50% dégâts)"}, equipements:[] },
  { type:"paladin",  nom:nomAleatoire("paladin"),  icon:"⚜️", etoiles:3, attaque:35, defense:45, prix:1000, competence:{type:"immunite",valeur:0.25,desc:"25% de chance d'ignorer une attaque"}, equipements:[] },
  { type:"assassin", nom:nomAleatoire("assassin"), icon:"🗡️", etoiles:4, attaque:90, defense:10, prix:2200, competence:{type:"critique",valeur:0.35,desc:"35% de chance d'attaque critique (+50% dégâts)"}, equipements:[] },
  { type:"pretresse",nom:nomAleatoire("pretresse"),icon:"🌙", etoiles:4, attaque:20, defense:70, prix:2100, competence:{type:"butin",valeur:0.25,desc:"+25% butin"}, equipements:[] }
];

const HEROS_LEGENDAIRES = [
  { nom:"Baalzebuth, le Dragon d'Airain",   icon:"🐉", etoiles:5, attaque:200, defense:120, competence:{type:"critique",valeur:0.4,desc:"40% de chance d'attaque critique (+50% dégâts)"}, equipements:[] },
  { nom:"Ozymandias, Seigneur des Abysses", icon:"🌊", etoiles:5, attaque:150, defense:180, competence:{type:"immunite",valeur:0.35,desc:"35% de chance d'ignorer une attaque"}, equipements:[] },
  { nom:"Ikaros, le Phénix Immortel",       icon:"🔥", etoiles:5, attaque:175, defense:150, competence:{type:"vitesse",valeur:0.5,desc:"Déplacements 50% plus rapides + 20% butin"}, equipements:[] },
  { nom:"Nécros, le Roi Déchu",             icon:"☠️", etoiles:5, attaque:220, defense:100, competence:{type:"critique",valeur:0.45,desc:"45% de chance d'attaque critique (+60% dégâts)"}, equipements:[] },
  { nom:"Séraphine, l'Ange Noir",           icon:"🖤", etoiles:5, attaque:160, defense:190, competence:{type:"immunite",valeur:0.4,desc:"40% de chance d'ignorer une attaque"}, equipements:[] }
];

const HEROS_PNJ = {
  chevalier_sissi:{nom:"Chevalier de Sissi",icon:"🛡️",etoiles:3,attaque:45,defense:50,competence:{type:"immunite",valeur:0.2,desc:"20% de chance d'ignorer une attaque"}},
  seigneur_ciel:{nom:"Seigneur de Ciel",icon:"👑",etoiles:5,attaque:200,defense:150,competence:{type:"critique",valeur:0.35,desc:"35% de chance d'attaque critique"}},
  dragon_airain:{nom:"Dragon d'Airain",icon:"🐉",etoiles:5,attaque:200,defense:120,competence:{type:"critique",valeur:0.4,desc:"40% de chance d'attaque critique"}}
};

function afficherMesHeros() {
  const box = document.getElementById('mesHerosListe'); if (!box) return;
  const heros = monProfil.heros || [];
  if (heros.length === 0) { box.innerHTML = `<p class="hint">Aucun héros. Recrute-en un ci-dessous !</p>`; return; }
  box.innerHTML = heros.map((h,i) => { const s = calculerStatsHeroAvecEquipements(h); return `<div class="item-card"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}${monProfil.meneurIndex === i ? ' <span style="color:var(--gold);">(Meneur)</span>' : ''}</h4><span>Att ${s.attaque} / Déf ${s.defense} — ${h.competence?.desc || ''}</span></div><div style="display:flex;gap:4px;flex-wrap:wrap;">${monProfil.meneurIndex === i ? `<button onclick="retirerMeneur()" class="btn-sm">Retirer</button>` : `<button onclick="definirMeneur(${i})" class="btn-sm">Nommer meneur</button>`}<button onclick="afficherPanelHeros(${i})" class="btn-sm" style="background:rgba(255,255,255,0.15);color:var(--gold);">Équiper</button></div></div>`; }).join('');
}
function afficherRecrutementHeros() { const box = document.getElementById('recrutementHerosListe'); if (!box) return; box.innerHTML = HEROS_RECRUTABLES.map((h,i) => `<div class="item-card"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}</h4><span>Att ${h.attaque} / Déf ${h.defense} — ${h.competence?.desc || ''}</span></div><button onclick="recruterHeros(${i})" class="btn-sm">${h.prix}🪙</button></div>`).join(''); }
window.recruterHeros = async function(index) { const h = HEROS_RECRUTABLES[index]; if (monProfil.or < h.prix) { afficherToast("⛔ Pas assez d'or."); return; } monProfil.or -= h.prix; monProfil.heros = [...(monProfil.heros || []), { ...h, equipements: [] }]; await sauvegarder({ or: monProfil.or, heros: monProfil.heros }); majHUD(); afficherToast(`${h.icon} ${h.nom} rejoint tes rangs !`); afficherMesHeros(); verifierProgressionQuetes(); };
window.definirMeneur = async function(index) { monProfil.meneurIndex = index; await sauvegarder({ meneurIndex: index }); afficherMesHeros(); majHUD(); };
window.retirerMeneur = async function() { monProfil.meneurIndex = null; await sauvegarder({ meneurIndex: null }); afficherMesHeros(); majHUD(); };

// ==================== TROUPES ====================
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

function creerListeTroupes() { const box = document.getElementById('troupesList'); let html = ''; for (const [k,d] of Object.entries(DEFS_TROUPES)) html += `<div class="list-row"><i class="fas ${d.icon}"></i><div class="info"><h4>${d.nom} <span style="color:#6ee7b7">(${monProfil.troupes[k]||0})</span></h4><span>Pop ${d.population} · 🌾${d.cout.nourriture} 🪵${d.cout.bois} ⛓️${d.cout.fer}</span></div><button onclick="entrainer('${k}')">Entraîner</button></div>`; box.innerHTML = html; }
window.entrainer = async function(type) { const d = DEFS_TROUPES[type]; const r = monProfil.ressources; mettreAJourPopulation(); if (monProfil.populationInactive < d.population) { afficherToast("⛔ Population inactive insuffisante."); return; } if (r.nourriture < d.cout.nourriture || r.bois < d.cout.bois || r.fer < d.cout.fer) { let m = ''; if (r.nourriture < d.cout.nourriture) m += `🌾 ${Math.ceil(d.cout.nourriture-r.nourriture)} `; if (r.bois < d.cout.bois) m += `🪵 ${Math.ceil(d.cout.bois-r.bois)} `; if (r.fer < d.cout.fer) m += `⛓️ ${Math.ceil(d.cout.fer-r.fer)}`; afficherToast(`⛔ Manque : ${m}`); return; } r.nourriture -= d.cout.nourriture; r.bois -= d.cout.bois; r.fer -= d.cout.fer; const fin = Date.now() + d.population*10*1000; monProfil.entrainementsEnCours.push({ type, finTimestamp: fin }); await sauvegarder({ ressources: r, entrainementsEnCours: monProfil.entrainementsEnCours }); majHUD(); creerListeTroupes(); afficherToast(`⚔️ ${d.nom} en entraînement (${d.population*10}s)`); };
function verifierEntrainements() { if (!monProfil.entrainementsEnCours?.length) return; const now = Date.now(); let change = false; const restants = []; for (const e of monProfil.entrainementsEnCours) { if (e.finTimestamp <= now) { monProfil.troupes[e.type] = (monProfil.troupes[e.type]||0)+1; change = true; afficherToast(`✅ ${DEFS_TROUPES[e.type].nom} prêt !`); envoyerNotification("⚔️ Entraînement terminé", `${DEFS_TROUPES[e.type].nom} rejoint ton armée.`); } else restants.push(e); } if (change) { monProfil.entrainementsEnCours = restants; sauvegarder({ troupes: monProfil.troupes, entrainementsEnCours: monProfil.entrainementsEnCours }); mettreAJourPopulation(); majHUD(); creerListeTroupes(); } }
function creerRassemblement() { const box = document.getElementById('rassemblementList'); let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">'; for (const [k,d] of Object.entries(DEFS_TROUPES)) html += `<div style="text-align:center;background:rgba(0,0,0,0.3);border:1px solid #3a2d63;border-radius:10px;padding:8px;"><i class="fas ${d.icon}" style="color:var(--gold);font-size:16px;"></i><div style="font-size:10px;margin-top:4px;">${d.nom}</div><div style="font-size:12px;font-weight:bold;color:#6ee7b7;">${monProfil.troupes[k]||0}</div></div>`; html += `</div><p class="hint">Force : ${forceAttaque(monProfil)} attaque / ${forceDefense(monProfil)} défense.</p>`; box.innerHTML = html; }

// ==================== CONSTRUCTION ====================
function verifierConstructions() { if (!monProfil.constructionsEnCours?.length) return; const now = Date.now(); let change = false; const restants = []; for (const c of monProfil.constructionsEnCours) { if (c.finTimestamp <= now) { monProfil.batiments[c.batId] = (monProfil.batiments[c.batId]||1)+1; change = true; afficherToast(`✅ ${c.batId} niveau ${monProfil.batiments[c.batId]} !`); envoyerNotification("🏗️ Construction terminée", `${c.batId} est niveau ${monProfil.batiments[c.batId]}.`); } else restants.push(c); } if (change) { monProfil.constructionsEnCours = restants; sauvegarder({ batiments: monProfil.batiments, constructionsEnCours: monProfil.constructionsEnCours }); mettreAJourPopulation(); majHUD(); rendreVilleCanvas(); verifierProgressionQuetes(); } }
let cibleActuelle = null;
const COUTS_AMELIORATION = (niv) => ({ or: (niv+1)*80, bois: (niv+1)*20, pierre: (niv+1)*15 });
window.ouvrirModal = function(id, nom, icon, img) { cibleActuelle = id; const niv = monProfil.batiments[id]||1; const c = COUTS_AMELIORATION(niv); const modal = document.getElementById('build-modal'); const visuel = img ? `<img src="${img}" style="width:84px;height:84px;object-fit:cover;border-radius:12px;border:2px solid var(--gold);margin:0 auto 8px;display:block;">` : `<i class="fas ${icon} modal-icon"></i>`; modal.innerHTML = `${visuel}<h3>${nom}</h3><div class="modal-level">Niveau ${niv}</div><div class="modal-cost"><span>🪙 ${c.or}</span><span>🪵 ${c.bois}</span><span>🪨 ${c.pierre}</span></div><button onclick="ameliorer()">Améliorer</button><button class="close-btn" onclick="fermerModal()">Fermer</button>`; document.getElementById('build-modal-backdrop').style.display = 'flex'; };
window.fermerModal = function() { document.getElementById('build-modal-backdrop').style.display = 'none'; cibleActuelle = null; };
window.ameliorer = async function() { if (!cibleActuelle) return; const batId = cibleActuelle; if (monProfil.constructionsEnCours.some(c => c.batId === batId)) { afficherToast("⏳ Déjà en construction."); return; } const niv = monProfil.batiments[batId]||1; const c = COUTS_AMELIORATION(niv); const r = monProfil.ressources; if (monProfil.or < c.or) { afficherToast(`⛔ Il faut ${c.or}🪙.`); return; } if (r.bois < c.bois) { afficherToast(`⛔ Il faut ${c.bois}🪵.`); return; } if (r.pierre < c.pierre) { afficherToast(`⛔ Il faut ${c.pierre}🪨.`); return; } monProfil.or -= c.or; r.bois -= c.bois; r.pierre -= c.pierre; const fin = Date.now() + 30*niv*1000; monProfil.constructionsEnCours.push({ batId, finTimestamp: fin }); await sauvegarder({ or: monProfil.or, ressources: r, constructionsEnCours: monProfil.constructionsEnCours }); majHUD(); fermerModal(); afficherToast(`🏗️ ${batId} (${30*niv}s)`); };

// ==================== ÉQUIPEMENTS ====================
const TOUS_EQUIPEMENTS = [
  { id:'lion_epee', slot:'arme', nom:'⚔️ Épée du Lion', att:20, def:0, vit:0, set:'Lion', source:'forge', coutOr:300, coutMat:{bois:20,fer:40}, rarete:'Commun' },
  { id:'lion_casque', slot:'casque', nom:'🪖 Heaume du Lion', att:0, def:20, vit:0, set:'Lion', source:'forge', coutOr:250, coutMat:{bois:10,fer:30}, rarete:'Commun' },
  { id:'lion_armure', slot:'armure', nom:'🛡️ Cuirasse du Lion', att:10, def:15, vit:0, set:'Lion', source:'forge', coutOr:400, coutMat:{bois:15,fer:50}, rarete:'Rare' },
  { id:'lion_bottes', slot:'bottes', nom:'👢 Bottes du Lion', att:0, def:5, vit:3, set:'Lion', source:'forge', coutOr:200, coutMat:{bois:5,fer:10}, rarete:'Commun' },
  { id:'lion_medaille', slot:'medaille', nom:'🎖️ Médaille du Lion', att:10, def:10, vit:0, set:'Lion', source:'forge', coutOr:350, coutMat:{bois:10,fer:20}, rarete:'Rare' },
  { id:'faille_epee', slot:'arme', nom:'🗡️ Lame de la Faille', att:35, def:-5, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1500, rarete:'Épique' },
  { id:'faille_casque', slot:'casque', nom:'🌌 Heaume Temporel', att:0, def:25, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:1200, rarete:'Épique' },
  { id:'faille_armure', slot:'armure', nom:'🌌 Armure Temporelle', att:15, def:30, vit:-2, set:'Faille Temporelle', source:'boutique', coutOr:1800, rarete:'Épique' },
  { id:'faille_bottes', slot:'bottes', nom:'👢 Bottes Temporelles', att:5, def:10, vit:15, set:'Faille Temporelle', source:'boutique', coutOr:1000, rarete:'Épique' },
  { id:'faille_medaille', slot:'medaille', nom:'⏳ Pendentif de la Faille', att:10, def:15, vit:5, set:'Faille Temporelle', source:'boutique', coutOr:2000, rarete:'Épique' },
  { id:'assassin_epee', slot:'arme', nom:"🗡️ Lame de l'Assassin", att:30, def:0, vit:10, set:'Assassin', source:'boutique', coutOr:1400, rarete:'Rare' },
  { id:'assassin_casque', slot:'casque', nom:"🌑 Masque de l'Assassin", att:10, def:15, vit:10, set:'Assassin', source:'boutique', coutOr:1100, rarete:'Rare' },
  { id:'assassin_armure', slot:'armure', nom:"🌑 Cape de l'Assassin", att:20, def:20, vit:10, set:'Assassin', source:'boutique', coutOr:1700, rarete:'Rare' },
  { id:'assassin_bottes', slot:'bottes', nom:"👢 Bottes de l'Assassin", att:5, def:5, vit:20, set:'Assassin', source:'boutique', coutOr:900, rarete:'Rare' },
  { id:'assassin_medaille', slot:'medaille', nom:"🎖️ Insigne de l'Assassin", att:15, def:5, vit:10, set:'Assassin', source:'boutique', coutOr:1900, rarete:'Rare' },
  { id:'berserker_epee', slot:'arme', nom:'🪓 Hache du Berserker', att:40, def:-10, vit:0, set:'Berserker', source:'forge', coutOr:1200, coutMat:{bois:50,fer:80}, rarete:'Rare' },
  { id:'berserker_casque', slot:'casque', nom:'🐺 Casque du Berserker', att:15, def:10, vit:5, set:'Berserker', source:'forge', coutOr:900, coutMat:{bois:30,fer:40}, rarete:'Rare' },
  { id:'berserker_armure', slot:'armure', nom:'🛡️ Armure du Berserker', att:20, def:25, vit:-5, set:'Berserker', source:'forge', coutOr:1500, coutMat:{bois:40,fer:70}, rarete:'Rare' },
  { id:'berserker_bottes', slot:'bottes', nom:'👢 Bottes du Berserker', att:10, def:5, vit:10, set:'Berserker', source:'forge', coutOr:700, coutMat:{bois:20,fer:30}, rarete:'Rare' },
  { id:'berserker_medaille', slot:'medaille', nom:'🎖️ Médaille du Berserker', att:20, def:5, vit:5, set:'Berserker', source:'forge', coutOr:1300, coutMat:{bois:30,fer:50}, rarete:'Rare' },
  { id:'paladin_epee', slot:'arme', nom:'⚔️ Épée du Paladin', att:25, def:10, vit:0, set:'Paladin', source:'boutique', coutOr:1600, rarete:'Épique' },
  { id:'paladin_casque', slot:'casque', nom:'👑 Heaume du Paladin', att:5, def:30, vit:0, set:'Paladin', source:'boutique', coutOr:1400, rarete:'Épique' },
  { id:'paladin_armure', slot:'armure', nom:'✨ Armure Sacrée', att:10, def:40, vit:-3, set:'Paladin', source:'boutique', coutOr:2000, rarete:'Épique' },
  { id:'paladin_bottes', slot:'bottes', nom:'👢 Bottes du Paladin', att:0, def:15, vit:5, set:'Paladin', source:'boutique', coutOr:1000, rarete:'Épique' },
  { id:'paladin_medaille', slot:'medaille', nom:'📿 Amulette du Paladin', att:10, def:20, vit:0, set:'Paladin', source:'boutique', coutOr:1800, rarete:'Épique' }
];

function calculerStatsHeroAvecEquipements(hero) { let att = hero.attaque||0, def = hero.defense||0, vit = 0; if (hero.equipements) hero.equipements.forEach(id => { const e = TOUS_EQUIPEMENTS.find(x => x.id === id); if (e) { att += e.att; def += e.def; vit += e.vit||0; } }); return { attaque: att, defense: def, vitesse: vit }; }
function calculerSetActifs(hero) { if (!hero || !hero.equipements) return {}; const sets = {}; hero.equipements.forEach(id => { const e = TOUS_EQUIPEMENTS.find(x => x.id === id); if (e && e.set) { if (!sets[e.set]) sets[e.set] = []; sets[e.set].push(id); } }); const r = {}; for (const [n,p] of Object.entries(sets)) { if (p.length >= 5) r[n]=5; else if (p.length >= 3) r[n]=3; } return r; }
function obtenirEffetsSet(setNom, niveau) { const ef = { 'Lion':{3:{nom:"Immortalité",desc:"Survit avec 1 PV pendant 2 rounds."},5:{nom:"Contre-attaque",desc:"Riposte avec 50% de ta force."}}, 'Faille Temporelle':{3:{nom:"Distorsion",desc:"+10% vitesse."},5:{nom:"Reset Temporel",desc:"Si tu perds, recommence avec +80 force."}}, 'Assassin':{3:{nom:"Frappe chirurgicale",desc:"+20% coup critique."},5:{nom:"Résurrection tactique",desc:"Recommence avec +80 force."}}, 'Berserker':{3:{nom:"Furie",desc:"+15% attaque, +10% vitesse."},5:{nom:"Dernier souffle",desc:"Immortel 2 rounds sous 20% PV."}}, 'Paladin':{3:{nom:"Bouclier sacré",desc:"Ignore 25% des dégâts."},5:{nom:"Inversion",desc:"Échange attaquant/défenseur 2 rounds."}} }; return ef[setNom]?.[niveau] || null; }

function afficherBoutiqueEquipement() { const box = document.getElementById('equipementBoutiqueListe'); if (!box) return; const poss = monProfil.inventaireEquipement||[]; box.innerHTML = TOUS_EQUIPEMENTS.filter(e => e.source === 'boutique').map(e => { const p = poss.includes(e.id); const btn = p ? '<span style="color:#6ee7b7;">✅ Possédé</span>' : `<button onclick="acheterEquipement('${e.id}')" class="btn-sm">${e.coutOr}🪙</button>`; return `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — Set ${e.set}</span></div>${btn}</div>`; }).join(''); }
window.acheterEquipement = async function(id) { const e = TOUS_EQUIPEMENTS.find(x => x.id === id); if (!e || e.source !== 'boutique') return; if (monProfil.or < e.coutOr) { afficherToast("⛔ Pas assez d'or."); return; } monProfil.or -= e.coutOr; monProfil.inventaireEquipement = [...(monProfil.inventaireEquipement||[]), id]; await sauvegarder({ or: monProfil.or, inventaireEquipement: monProfil.inventaireEquipement }); majHUD(); afficherBoutiqueEquipement(); afficherToast(`${e.nom} acheté !`); };
function afficherForgeEquipement() { const box = document.getElementById('equipementList'); if (!box) return; const poss = monProfil.inventaireEquipement||[]; box.innerHTML = TOUS_EQUIPEMENTS.filter(e => e.source === 'forge').map(e => { const p = poss.includes(e.id); const txt = Object.entries(e.coutMat).map(([k,v]) => `${v}${k==='bois'?'🪵':'⛓️'}`).join(' '); const btn = p ? '<span style="color:#6ee7b7;">✅ Possédé</span>' : `<button onclick="forgerEquipement('${e.id}')" class="btn-sm">${e.coutOr}🪙 + ${txt}</button>`; return `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — Set ${e.set}</span></div>${btn}</div>`; }).join(''); }
window.forgerEquipement = async function(id) { const e = TOUS_EQUIPEMENTS.find(x => x.id === id); if (!e || e.source !== 'forge') return; if (monProfil.or < e.coutOr) { afficherToast("⛔ Pas assez d'or."); return; } for (const [m,q] of Object.entries(e.coutMat)) if ((monProfil.ressources[m]||0) < q) { afficherToast(`⛔ Manque ${m}.`); return; } monProfil.or -= e.coutOr; Object.entries(e.coutMat).forEach(([m,q]) => monProfil.ressources[m] -= q); monProfil.inventaireEquipement = [...(monProfil.inventaireEquipement||[]), id]; await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, inventaireEquipement: monProfil.inventaireEquipement }); majHUD(); afficherForgeEquipement(); afficherToast(`${e.nom} forgé !`); };

window.afficherPanelHeros = function(heroIndex) { const h = monProfil.heros[heroIndex]; if (!h) return; const s = calculerStatsHeroAvecEquipements(h); const sets = calculerSetActifs(h); let html = `<h3>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}</h3><p style="font-size:13px;">Attaque : ${s.attaque} | Défense : ${s.defense} | Vitesse : ${s.vitesse}</p><h4 style="color:var(--gold);margin-top:10px;">Sets actifs</h4>`; if (!Object.keys(sets).length) html += `<p class="hint">Aucun set complet.</p>`; else for (const [n,l] of Object.entries(sets)) { const e = obtenirEffetsSet(n,l); if (e) html += `<p style="font-size:12px;color:#6ee7b7;"><b>${n} (${l}/5)</b> : ${e.nom} — ${e.desc}</p>`; } html += `<h4 style="color:var(--gold);margin-top:10px;">Équipements</h4><div style="max-height:220px;overflow-y:auto;">`; const inv = monProfil.inventaireEquipement||[]; const dispo = TOUS_EQUIPEMENTS.filter(e => inv.includes(e.id)); if (!dispo.length) html += `<p class="hint">Aucun équipement possédé.</p>`; dispo.forEach(e => { const eq = h.equipements && h.equipements.includes(e.id); const btn = eq ? `<button onclick="desequiperHero(${heroIndex},'${e.id}')" class="btn-sm">Retirer</button>` : `<button onclick="equiperHero(${heroIndex},'${e.id}')" class="btn-sm">Équiper</button>`; html += `<div class="strategie-row"><div class="info"><h4>${e.nom}</h4><span>Att +${e.att} / Déf +${e.def} / Vit +${e.vit||0} — ${e.set}</span></div>${btn}</div>`; }); html += `</div><button onclick="fermerHeroPanel()" class="close-btn">Fermer</button>`; document.getElementById('hero-equip-modal').innerHTML = html; document.getElementById('hero-equip-backdrop').style.display = 'flex'; };
window.equiperHero = async function(i, id) { const h = monProfil.heros[i]; if (!h.equipements) h.equipements = []; if (!h.equipements.includes(id)) { h.equipements.push(id); await sauvegarder({ heros: monProfil.heros }); afficherPanelHeros(i); majHUD(); } };
window.desequiperHero = async function(i, id) { const h = monProfil.heros[i]; if (h.equipements) { h.equipements = h.equipements.filter(x => x !== id); await sauvegarder({ heros: monProfil.heros }); afficherPanelHeros(i); majHUD(); } };
window.fermerHeroPanel = function() { document.getElementById('hero-equip-backdrop').style.display = 'none'; };

// ==================== ATTAQUE ====================
let cibleAttaque = null;
window.ouvrirAttaque = function(cible) { cibleAttaque = cible; if (!monProfil.heros?.length) { afficherToast("Recrute un héros avant d'attaquer."); return; } const modal = document.getElementById('hero-attaque-modal'); let html = `<h3>Choisis le héros qui mène l'attaque</h3>`; monProfil.heros.forEach((h,i) => { const s = calculerStatsHeroAvecEquipements(h); html += `<div class="strategie-row"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}</h4><span>Att ${s.attaque} / Déf ${s.defense}</span></div><button onclick="selectionnerHeroAttaque(${i})" class="btn-sm">Choisir</button></div>`; }); html += `<button onclick="fermerSelectionHeroAttaque()" class="close-btn">Annuler</button>`; modal.innerHTML = html; document.getElementById('hero-attaque-backdrop').style.display = 'flex'; };
window.selectionnerHeroAttaque = function(index) { monProfil.heroAttaqueIndex = index; document.getElementById('hero-attaque-backdrop').style.display = 'none'; const dep = MARQUEURS_MONDE.find(m => m.type === 'mine-city') || { x:900, y:1020 }; let arr = { x: cibleAttaque.x, y: cibleAttaque.y }; if (!arr.x || !arr.y) { if (cibleAttaque.type === 'joueur') arr = positionJoueur(cibleAttaque.id); } const dist = Math.round(Math.hypot(arr.x-dep.x, arr.y-dep.y)); const dur = Math.max(1, Math.round(dist/100)); const box = document.getElementById('attaqueTroupes'); let html = `<div style="background:rgba(0,0,0,0.3);border-radius:10px;padding:8px;margin-bottom:12px;"><p style="color:var(--gold);font-weight:bold;">📍 Distance : ${dist} cases</p><p class="hint">⏱️ Durée : ${dur}s</p></div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">`; for (const [k,d] of Object.entries(DEFS_TROUPES)) html += `<div style="text-align:center;background:rgba(0,0,0,0.3);border:1px solid #3a2d63;border-radius:10px;padding:8px;"><i class="fas ${d.icon}" style="color:var(--gold);font-size:18px;"></i><div style="font-size:11px;margin-top:4px;">${d.nom}</div><div style="font-size:13px;font-weight:bold;color:#6ee7b7;">${monProfil.troupes[k]||0}</div></div>`; html += `</div><p class="hint">Force d'attaque : ${forceAttaque(monProfil)}</p>`; box.innerHTML = html; document.getElementById('attaqueTitle').innerText = `⚔️ Attaquer ${cibleAttaque.nom}`; toggleTiroir('attaque'); };
window.fermerSelectionHeroAttaque = function() { document.getElementById('hero-attaque-backdrop').style.display = 'none'; };

function bonusMeneur(profil) { const idx = profil.heroAttaqueIndex !== undefined && profil.heroAttaqueIndex !== null ? profil.heroAttaqueIndex : profil.meneurIndex; if (idx !== null && idx !== undefined && profil.heros?.[idx]) { const s = calculerStatsHeroAvecEquipements(profil.heros[idx]); return { attaque: s.attaque, defense: s.defense }; } return { attaque: 0, defense: 0 }; }
function bonusButin(profil) { const idx = profil.heroAttaqueIndex !== undefined && profil.heroAttaqueIndex !== null ? profil.heroAttaqueIndex : profil.meneurIndex; const h = profil.heros?.[idx]; return (h?.competence?.type === 'butin') ? (1 + h.competence.valeur) : 1; }
function forceAttaque(profil) { const base = Object.entries(profil.troupes||{}).reduce((s,[k,n]) => s + n*(DEFS_TROUPES[k]?.attaque||0), 0); const b = bonusTechnologie(profil, 'forge1') ? 1.15 : 1; return Math.round((base + bonusMeneur(profil).attaque) * b); }
function forceDefense(profil) { const base = Object.entries(profil.troupes||{}).reduce((s,[k,n]) => s + n*(DEFS_TROUPES[k]?.defense||0), 0); const nm = profil.batiments?.mirador||0; const b = bonusTechnologie(profil, 'fortif1') ? 1.15 : 1; return Math.round((base + nm*10 + bonusMeneur(profil).defense) * b); }
function appliquerSetsAttaquant(attaque) { const h = monProfil.heros?.[monProfil.heroAttaqueIndex]; const sets = calculerSetActifs(h); for (const [n,l] of Object.entries(sets)) { if (n === 'Berserker' && l >= 3) attaque = Math.round(attaque*1.15); if (n === 'Assassin' && l >= 3) attaque = Math.round(attaque*1.1); } return attaque; }
function appliquerSetsDefenseur(profil, defense) { if (!profil.heros?.length) return defense; const h = profil.heros[profil.meneurIndex||0]; if (!h) return defense; const sets = calculerSetActifs(h); for (const [n,l] of Object.entries(sets)) { if (n === 'Paladin' && l >= 3) defense = Math.round(defense*1.25); if (n === 'Lion' && l >= 3) defense = Math.round(defense*1.15); } return defense; }

// ==================== COMBAT TOUR PAR TOUR ====================
function simulerCombat(forceAtt, forceDef, heroAtt, heroDef) {
  let pvAtt = 100, pvDef = 100, round = 0;
  const log = [];
  const setsAtt = calculerSetActifs(heroAtt), setsDef = calculerSetActifs(heroDef);
  let immortDef = (setsDef['Lion'] >= 3);
  let critAtt = (setsAtt['Assassin'] >= 3 || setsAtt['Berserker'] >= 3);
  let bouclierDef = (setsDef['Paladin'] >= 3);
  let resetFaille = (setsAtt['Faille Temporelle'] === 5);
  let resetUsed = false;
  while (pvAtt > 0 && pvDef > 0 && round < 20) {
    round++;
    let dmgAtt = Math.max(5, Math.round(forceAtt * 0.15 * (0.85 + Math.random()*0.3)));
    if (critAtt && Math.random() < 0.25) { dmgAtt = Math.round(dmgAtt*1.5); log.push(`⚡ Coup critique !`); }
    if (bouclierDef) dmgAtt = Math.round(dmgAtt*0.75);
    pvDef = Math.max(0, pvDef - dmgAtt);
    log.push(`Round ${round} : ${heroAtt?.nom||"attaquant"} inflige ${dmgAtt}.`);
    if (pvDef > 0) {
      let dmgDef = Math.max(5, Math.round(forceDef * 0.15 * (0.85 + Math.random()*0.3)));
      pvAtt = Math.max(0, pvAtt - dmgDef);
      log.push(`Round ${round} : ${heroDef?.nom||"défenseur"} inflige ${dmgDef}.`);
    }
    if (pvDef <= 0 && immortDef) { pvDef = 1; immortDef = false; log.push(`🛡️ Immortalité !`); }
    if (pvAtt <= 0 && resetFaille && !resetUsed) { pvAtt = 30; pvDef = Math.max(0, pvDef-20); resetUsed = true; log.push(`⏳ Faille Temporelle ! +80 force.`); }
  }
  return { victoire: pvDef <= 0 && pvAtt > 0, log };
}

function deplacerTroupes(cible) {
  return new Promise(resolve => {
    const dep = MARQUEURS_MONDE.find(m => m.type === 'mine-city') || { x:900, y:1020 };
    let arr = { x: cible.x, y: cible.y };
    if (!arr.x || !arr.y) { if (cible.type === 'joueur') arr = positionJoueur(cible.id); else arr = { x: dep.x+200, y: dep.y+200 }; }
    const hero = monProfil.heros?.[monProfil.heroAttaqueIndex];
    const rapide = hero?.competence?.type === 'vitesse';
    const c = document.getElementById('map-canvas');
    const icone = document.createElement('div');
    icone.style.cssText = `position:absolute;left:${dep.x}px;top:${dep.y}px;width:36px;height:36px;background:rgba(0,0,0,0.7);border:2px solid var(--gold);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;z-index:80;`;
    icone.innerText = '🐎'; c.appendChild(icone);
    const dist = Math.hypot(arr.x-dep.x, arr.y-dep.y);
    let dur = Math.max(900, Math.min(3500, dist*1.6));
    if (rapide) dur *= 0.7;
    const debut = Date.now();
    function anim() {
      const p = Math.min(1, (Date.now()-debut)/dur);
      icone.style.left = (dep.x + (arr.x-dep.x)*p) + 'px';
      icone.style.top = (dep.y + (arr.y-dep.y)*p) + 'px';
      if (p < 1) requestAnimationFrame(anim);
      else { icone.remove(); resolve(); }
    }
    anim();
  });
}

let _combatResolve = null;
function animerCombat(nomMoi, avMoi, nomAdv, avAdv, victoire) {
  return new Promise(resolve => {
    _combatResolve = resolve;
    const b = document.getElementById('combat-anime-backdrop');
    if (!b) { resolve(); return; }
    document.getElementById('combatAvatarMoi').innerText = avMoi || '⚔️';
    document.getElementById('combatAvatarAdv').innerText = avAdv || '👹';
    document.getElementById('combatNomMoi').innerText = nomMoi;
    document.getElementById('combatNomAdv').innerText = nomAdv;
    const bm = document.getElementById('combatPvMoi'), ba = document.getElementById('combatPvAdv');
    const log = document.getElementById('combatLogAnime');
    bm.style.width = '100%'; ba.style.width = '100%'; log.innerText = "⚔️ Combat...";
    b.style.display = 'flex';
    let pvM = 100, pvA = 100, r = 0;
    const int = setInterval(() => {
      r++;
      const dM = victoire ? (8+Math.random()*8) : (16+Math.random()*10);
      const dA = victoire ? (16+Math.random()*10) : (8+Math.random()*8);
      pvA = Math.max(r >= 6 && victoire ? 0 : 4, pvA - dM);
      pvM = Math.max(r >= 6 && !victoire ? 0 : 4, pvM - dA);
      bm.style.width = pvM + '%'; ba.style.width = pvA + '%';
      log.innerText += `\nRound ${r} : -${Math.round(dM)} / -${Math.round(dA)}`;
      log.scrollTop = log.scrollHeight;
      if (r >= 6 || pvM <= 4 || pvA <= 4) {
        clearInterval(int);
        log.innerText += victoire ? "\n\n🏆 Victoire !" : "\n\n💀 Défaite...";
        setTimeout(() => { b.style.display = 'none'; if (_combatResolve) { _combatResolve(); _combatResolve = null; } }, 900);
      }
    }, 650);
  });
}
window.passerCombat = function() { document.getElementById('combat-anime-backdrop').style.display = 'none'; if (_combatResolve) { _combatResolve(); _combatResolve = null; } };

function afficherToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.innerText = msg; t.style.display = 'block'; clearTimeout(t._timer); t._timer = setTimeout(() => t.style.display = 'none', 2600); }
function afficherButin(o, b, p, f, objs) { const m = document.getElementById('build-modal'); let h = `<h3>🏆 Victoire !</h3><p>🪙 +${o}</p>`; if (b) h += `<p>🪵 +${b}</p>`; if (p) h += `<p>🪨 +${p}</p>`; if (f) h += `<p>⛓️ +${f}</p>`; if (objs?.length) h += `<p>🎒 ${objs.join(', ')}</p>`; h += `<button class="close-btn" onclick="fermerModal()">Fermer</button>`; m.innerHTML = h; document.getElementById('build-modal-backdrop').style.display = 'flex'; }

window.lancerAttaque = async function() {
  const total = Object.values(monProfil.troupes).reduce((a,b) => a+b, 0);
  if (total === 0) { afficherToast("⛔ Entraîne des troupes."); return; }
  let monAtt = forceAttaque(monProfil);
  monAtt = appliquerSetsAttaquant(monAtt);
  let note = "";
  if ((monProfil.strategies?.brusque||0) > 0) { monProfil.strategies.brusque -= 1; monAtt = Math.round(monAtt*1.2); note += " ⚡ Attaque Brusque !"; await sauvegarder({ strategies: monProfil.strategies }); }
  let victoire, defenseur = null;
  if (cibleAttaque.type === 'pnj' || cibleAttaque.type === 'pnj-ville') { victoire = monAtt >= cibleAttaque.force; }
  else {
    const snap = await getDoc(doc(db, COL, cibleAttaque.id));
    if (!snap.exists()) { afficherToast("Joueur inexistant."); return; }
    defenseur = snap.data();
    if (defenseur.village?.bouclierFin > Date.now()) { afficherToast("🛡️ Bouclier actif."); return; }
    let sonDef = forceDefense(defenseur);
    sonDef = appliquerSetsDefenseur(defenseur, sonDef);
    if (defenseur.contreOffensifFin > Date.now()) { monAtt = Math.round(monAtt*0.8); note += " 🛡️ Contre-Offensive adverse !"; }
    const heroAtt = monProfil.heros?.[monProfil.heroAttaqueIndex] || null;
    const heroDef = defenseur.heros?.[defenseur.meneurIndex||0] || null;
    const res = simulerCombat(monAtt, sonDef, heroAtt, heroDef);
    victoire = res.victoire;
  }
  await deplacerTroupes(cibleAttaque);
  await animerCombat(monProfil.pseudo, monProfil.avatar, cibleAttaque.nom, cibleAttaque.type === 'joueur' ? '🏰' : '👹', victoire);
  if (victoire) {
    if (cibleAttaque.type === 'pnj' || cibleAttaque.type === 'pnj-ville') {
      const mb = bonusButin(monProfil) * (bonusTechnologie(monProfil, 'commerce1') ? 1.1 : 1);
      const bO = Math.round((20 + Math.floor(cibleAttaque.force*0.2)) * mb);
      const bB = Math.floor(cibleAttaque.force*0.3), bP = Math.floor(cibleAttaque.force*0.25), bF = Math.floor(cibleAttaque.force*0.15);
      monProfil.or += bO; monProfil.ressources.bois += bB; monProfil.ressources.pierre += bP; monProfil.ressources.fer += bF;
      let capMsg = null;
      if (cibleAttaque.type === 'pnj-ville' && cibleAttaque.heroCapture && HEROS_PNJ[cibleAttaque.heroCapture]) {
        const ch = cibleAttaque.categorie === 'petite' ? 0.6 : 0.35;
        if (Math.random() < ch) { const h = HEROS_PNJ[cibleAttaque.heroCapture]; monProfil.heros.push({ ...h, equipements: [] }); await sauvegarder({ heros: monProfil.heros }); capMsg = `🌟 ${h.icon} ${h.nom} capturé !`; }
      }
      if (cibleAttaque.type === 'pnj' && cibleAttaque.nom.includes('monstre')) { monProfil.monstresVaincus.push(cibleAttaque.nom); await sauvegarder({ monstresVaincus: monProfil.monstresVaincus }); rendreMondeCanvas(); }
      await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources });
      afficherButin(bO, bB, bP, bF, capMsg ? [capMsg] : []);
      ajouterAuJournal(`⚔️ ${monProfil.pseudo} a vaincu ${cibleAttaque.nom}.${note}`);
    } else {
      if ((defenseur.strategies?.faillite||0) > 0) { defenseur.strategies.faillite -= 1; await updateDoc(doc(db, COL, cibleAttaque.id), { strategies: defenseur.strategies }); afficherToast(`⏳ Faillite Temporelle adverse !`); majHUD(); fermerTiroir(); return; }
      const bO = Math.min(defenseur.or||0, Math.round(((defenseur.or||0)*0.15 + 20) * bonusButin(monProfil)));
      const bB = Math.min(defenseur.ressources.bois, Math.round(defenseur.ressources.bois*0.15));
      const bP = Math.min(defenseur.ressources.pierre, Math.round(defenseur.ressources.pierre*0.15));
      defenseur.or -= bO; defenseur.ressources.bois -= bB; defenseur.ressources.pierre -= bP;
      defenseur.prestige = Math.max(0, (defenseur.prestige||0)-8);
      reduireTroupes(defenseur.troupes, 0.1);
      await updateDoc(doc(db, COL, cibleAttaque.id), { or: defenseur.or, ressources: defenseur.ressources, troupes: defenseur.troupes, prestige: defenseur.prestige });
      monProfil.or += bO; monProfil.ressources.bois += bB; monProfil.ressources.pierre += bP;
      monProfil.prestige = (monProfil.prestige||0)+15;
      await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, prestige: monProfil.prestige });
      afficherToast(`🏆 Victoire ! +${bO}🪙${note}`);
      ajouterAuJournal(`⚔️ ${monProfil.pseudo} a battu ${cibleAttaque.nom}.`);
    }
    verifierProgressionQuetes();
  } else {
    if (defenseur === null) { reduireTroupes(monProfil.troupes, 0.15); await sauvegarder({ troupes: monProfil.troupes }); afficherToast(`💀 Défaite contre ${cibleAttaque.nom}.`); }
    else { monProfil.prestige = Math.max(0, (monProfil.prestige||0)-5); reduireTroupes(monProfil.troupes, 0.2); await sauvegarder({ troupes: monProfil.troupes, prestige: monProfil.prestige }); afficherToast(`💀 Défaite face à ${cibleAttaque.nom}.`); }
  }
  majHUD(); fermerTiroir();
};
function reduireTroupes(t, r) { let p = 0; Object.keys(t).forEach(k => { const x = Math.floor((t[k]||0)*r); t[k] = Math.max(0, (t[k]||0)-x); p += x; }); return p; }

// ==================== RECHERCHE ====================
const TECHNOLOGIES = [
  { id:"forge1", nom:"🔥 Forge Améliorée", desc:"+15% attaque.", prix:800, materiaux:{bois:200,pierre:100} },
  { id:"fortif1", nom:"🧱 Fortifications", desc:"+15% défense.", prix:800, materiaux:{pierre:200,fer:100} },
  { id:"agriculture1", nom:"🌾 Agronomie", desc:"+20% nourriture.", prix:500, materiaux:{bois:100} },
  { id:"commerce1", nom:"💰 Routes Commerciales", desc:"+10% or.", prix:900, materiaux:{fer:150} }
];
function bonusTechnologie(p, id) { return (p.recherches||{})[id] ? true : false; }
function afficherRecherche() { const box = document.getElementById('rechercheListe'); if (!box) return; box.innerHTML = TECHNOLOGIES.map(t => { const p = bonusTechnologie(monProfil, t.id); const c = Object.entries(t.materiaux).map(([k,v]) => `${v}${k==='bois'?'🪵':k==='pierre'?'🪨':'⛓️'}`).join(' '); return `<div class="item-card"><div class="info"><h4>${t.nom}</h4><span>${t.desc} — ${t.prix}🪙 + ${c}</span></div>${p ? '<span style="color:#6ee7b7;">✅</span>' : `<button onclick="rechercherTech('${t.id}')" class="btn-sm">Rechercher</button>`}</div>`; }).join(''); }
window.rechercherTech = async function(id) { const t = TECHNOLOGIES.find(x => x.id === id); if (monProfil.or < t.prix) { afficherToast("⛔ Pas assez d'or."); return; } for (const [m,q] of Object.entries(t.materiaux)) if (monProfil.ressources[m] < q) { afficherToast(`⛔ Manque ${m}.`); return; } monProfil.or -= t.prix; Object.entries(t.materiaux).forEach(([m,q]) => monProfil.ressources[m] -= q); monProfil.recherches = { ...(monProfil.recherches||{}), [id]: true }; await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, recherches: monProfil.recherches }); majHUD(); afficherToast(`🧪 ${t.nom} !`); afficherRecherche(); };

// ==================== STRATÉGIES ====================
const NOMS_STRATEGIES = {
  mecontentement: { nom:"🌱 Graine de Mécontentement", desc:"-50% production ennemie 6h." },
  brusque: { nom:"⚡ Attaque Brusque", desc:"+20% force prochaine attaque." },
  contreOffensive: { nom:"🛡️ Contre-Offensive", desc:"-20% attaquant 12h." },
  faillite: { nom:"⏳ Faillite Temporelle", desc:"Annule ta prochaine défaite." }
};
function afficherMesStrategies() { const box = document.getElementById('mesStrategiesListe'); if (!box) return; const s = monProfil.strategies||{}; const a = Object.entries(NOMS_STRATEGIES).filter(([k]) => (s[k]||0) > 0); if (!a.length) { box.innerHTML = `<p class="hint">Aucune stratégie en stock.</p>`; return; } box.innerHTML = a.map(([k,info]) => { const b = k === 'contreOffensive' ? `<button onclick="activerContreOffensive()" class="btn-sm">Activer</button>` : ''; return `<div class="strategie-row"><div class="info"><h4>${info.nom} (${s[k]})</h4><span>${info.desc}</span></div>${b}</div>`; }).join(''); if (monProfil.contreOffensifFin > Date.now()) box.innerHTML += `<p style="color:#6ee7b7;font-size:11px;margin-top:6px;">🛡️ Contre-Offensive active.</p>`; }
window.activerContreOffensive = async function() { if ((monProfil.strategies?.contreOffensive||0) < 1) return; monProfil.strategies.contreOffensive -= 1; monProfil.contreOffensifFin = Date.now() + 12*3600000; await sauvegarder({ strategies: monProfil.strategies, contreOffensifFin: monProfil.contreOffensifFin }); afficherToast("🛡️ Contre-Offensive activée !"); afficherMesStrategies(); };
window.utiliserMecontentement = async function(idCible, pseudo) { if ((monProfil.strategies?.mecontentement||0) < 1) return; monProfil.strategies.mecontentement -= 1; await sauvegarder({ strategies: monProfil.strategies }); await updateDoc(doc(db, COL, idCible), { malusProductionFin: Date.now() + 6*3600000 }); afficherToast(`🌱 Semé chez ${pseudo} !`); fermerProfilVille(); };
window.ouvrirListeStrategies = function(idCible, pseudo) { const s = monProfil.strategies||{}; const modal = document.getElementById('profil-ville-modal'); let h = `<h3 style="color:var(--gold);">🎴 Stratégies</h3>`; const a = Object.entries(NOMS_STRATEGIES).filter(([k]) => (s[k]||0) > 0); if (!a.length) h += `<p class="hint">Aucune stratégie.</p>`; else a.forEach(([k,info]) => { let b = `<span style="font-size:10px;color:#9ca3af;">Auto</span>`; if (k === 'mecontentement') b = `<button onclick="utiliserMecontentement('${idCible}','${pseudo}')" class="btn-sm">Utiliser</button>`; if (k === 'contreOffensive') b = `<button onclick="activerContreOffensive(); ouvrirProfilVille('${idCible}');" class="btn-sm">Activer</button>`; h += `<div class="strategie-row"><div class="info"><h4>${info.nom} (${s[k]})</h4><span>${info.desc}</span></div>${b}</div>`; }); h += `<button class="close-btn" onclick="ouvrirProfilVille('${idCible}')">← Retour</button>`; modal.innerHTML = h; };// ==================== CARTE ====================
let vueActuelle = 'city';
canvas = document.getElementById('map-canvas');
viewport = document.getElementById('map-viewport');

function rendreVilleCanvas() {
  canvas.className = 'terrain-city'; canvas.innerHTML = '';
  BATIMENTS_VILLE.forEach(b => {
    const niv = monProfil.batiments[b.id] || 1;
    const el = document.createElement('div');
    el.className = 'marker' + (b.capital ? ' capital' : '');
    el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
    el.onclick = () => {
      if (b.id === 'baraques') { toggleTiroir('baraques'); return; }
      if (b.id === 'rassemblement') { toggleTiroir('rassemblement'); return; }
      if (b.id === 'forgeron') { toggleTiroir('artisanat'); return; }
      if (b.id === 'senat') { afficherSenat(); return; }
      ouvrirModal(b.id, b.nom, b.icon, b.img);
    };
    const icon = b.img ? `<img src="${b.img}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">` : `<i class="fas ${b.icon}"></i>`;
    el.innerHTML = `<div class="marker-icon">${icon}<div class="marker-level">${niv}</div></div><div class="marker-ribbon">${b.nom}</div>`;
    canvas.appendChild(el);
  });
}

const ICONES_TERRITOIRE = { 'Forêt':{emoji:'🌲',classe:'foret'}, 'Montagne':{emoji:'⛰️',classe:'montagne'}, 'Mine':{emoji:'💎',classe:'montagne'}, 'Champ':{emoji:'🌾',classe:'marecage'}, 'Marécage':{emoji:'🐊',classe:'marecage'} };

function rendreMondeCanvas() {
  canvas.className = 'terrain-world'; canvas.innerHTML = '';
  MARQUEURS_MONDE.forEach(m => {
    if (m.type === 'res') {
      const info = _territoiresPossedes[m.id];
      const deco = ICONES_TERRITOIRE[m.nomtype] || { emoji:'🗺️', classe:'foret' };
      const el = document.createElement('div');
      el.className = 'territoire-marker'; el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
      const st = info?.proprietaireId === monId ? 'possede-moi' : (info?.proprietaireId ? 'possede-autre' : '');
      el.onclick = () => ouvrirProfilTerritoire(m.id);
      el.innerHTML = `<div class="territoire-icone ${deco.classe} ${st}">${deco.emoji}</div><div class="territoire-label">${m.nomtype} ${info?.proprietaireId ? (info.proprietaireId === monId ? '(toi)' : '(' + info.proprietairePseudo + ')') : ''}</div>`;
      canvas.appendChild(el); return;
    }
    if (m.type === 'monster') {
      const nm = 'le monstre niv.' + m.badge;
      if ((monProfil.monstresVaincus || []).includes(nm)) {
        const el = document.createElement('div'); el.className = 'wmarker';
        el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
        el.innerHTML = `<i class="fas fa-box-open wmarker-icon" style="color:#6ee7b7;"></i><div class="wmarker-label">Collecte</div>`;
        el.onclick = () => { monProfil.ressources.bois += 50; monProfil.ressources.pierre += 30; afficherToast('💎 +50🪵 +30🪨'); sauvegarder({ ressources: monProfil.ressources }); majHUD(); };
        canvas.appendChild(el); return;
      }
    }
    const el = document.createElement('div'); el.className = 'wmarker';
    el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
    el.onclick = () => {
      if (m.type === 'mine-city') { allerVue('city'); return; }
      if (m.type === 'monster') { ouvrirAttaque({ type:'pnj', nom:'le monstre niv.'+m.badge, force:m.badge*60, x:m.x, y:m.y }); return; }
      if (m.type === 'camp') { ouvrirAttaque({ type:'pnj', nom:'le campement niv.'+m.badge, force:m.badge*50, x:m.x, y:m.y }); return; }
      if (m.type === 'grande-ville') { ouvrirAttaque({ type:'pnj', nom:m.nom, force:m.badge*80, grandeVille:true, x:m.x, y:m.y }); return; }
      if (m.type === 'pnj-ville') { ouvrirAttaque({ type:'pnj-ville', nom:m.nom, force:m.force, x:m.x, y:m.y, heroCapture:m.heroCapture, categorie:m.categorie }); return; }
    };
    if (m.type === 'mine-city') el.innerHTML = `<i class="fas ${m.icon} wmarker-icon mine-city"></i><div class="wmarker-label">${m.nom}</div>`;
    else if (m.type === 'grande-ville' || m.type === 'pnj-ville') el.innerHTML = `<div class="wmarker-badge monster" style="background:#7c3aed;">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:var(--gold);"></i><div class="wmarker-label">${m.nom}</div>`;
    else el.innerHTML = `<div class="wmarker-badge monster">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:#f87171;"></i>`;
    canvas.appendChild(el);
  });
  _autresJoueurs.forEach(j => {
    const pos = positionJoueur(j.id);
    const puiss = calculerPuissanceDe(j);
    const tier = puiss >= 1500 ? 'tier-or' : puiss >= 500 ? 'tier-argent' : '';
    const ech = (0.8 + (pos.y/2800)*0.45).toFixed(2);
    const el = document.createElement('div');
    el.className = `royaume-marker ${tier}`;
    el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
    el.style.transform = `translate(-50%,-100%) scale(${ech})`;
    el.onclick = () => ouvrirProfilVille(j.id);
    el.innerHTML = `<div class="royaume-3d"><div class="royaume-toit"></div><div class="royaume-tourelle gauche"></div><div class="royaume-tourelle droite"></div><div class="royaume-mur"></div><div class="royaume-ombre"></div></div><div class="royaume-label">${j.pseudo}</div><div class="royaume-puissance">⚡${puiss}</div>`;
    canvas.appendChild(el);
  });
}

let panX = 0, panY = 0, dragging = false, startX = 0, startY = 0, startPanX = 0, startPanY = 0;
function clampPan() { const vw = viewport.clientWidth, vh = viewport.clientHeight; const cw = vueActuelle === 'city' ? 1700 : 2200; const ch = vueActuelle === 'city' ? 2400 : 2800; panX = Math.max(Math.min(0, vw-cw), Math.min(0, panX)); panY = Math.max(Math.min(0, vh-ch), Math.min(0, panY)); }
function appliquerPan() { canvas.style.transform = `translate(${panX}px, ${panY}px)`; }
viewport.addEventListener('pointerdown', e => { dragging = true; viewport.classList.add('grabbing'); startX = e.clientX; startY = e.clientY; startPanX = panX; startPanY = panY; viewport.setPointerCapture(e.pointerId); });
viewport.addEventListener('pointermove', e => { if (!dragging) return; panX = startPanX + (e.clientX - startX); panY = startPanY + (e.clientY - startY); clampPan(); appliquerPan(); });
['pointerup','pointercancel','pointerleave'].forEach(ev => viewport.addEventListener(ev, () => { dragging = false; viewport.classList.remove('grabbing'); }));

function allerVue(v) { vueActuelle = v; document.getElementById('nav-ville-label').innerText = v === 'city' ? 'Ville' : 'Monde'; document.getElementById('hudCityName').innerText = v === 'city' ? monProfil.nomVille : 'Le Monde'; if (v === 'city') rendreVilleCanvas(); else rendreMondeCanvas(); recentrerCarte(); }
window.toggleVue = function() { allerVue(vueActuelle === 'city' ? 'world' : 'city'); afficherToast(vueActuelle === 'city' ? "🏛️ Ta ville" : "🌍 Carte du monde"); };
window.recentrerCarte = function() { const vw = viewport.clientWidth, vh = viewport.clientHeight; if (!vw || !vh) { setTimeout(recentrerCarte, 100); return; } if (vueActuelle === 'city') { const c = BATIMENTS_VILLE.find(b => b.capital) || BATIMENTS_VILLE[0]; panX = -(c.x - vw/2); panY = -(c.y - vh/2); } else { const mv = MARQUEURS_MONDE.find(m => m.type === 'mine-city'); panX = -((mv?mv.x:900) - vw/2); panY = -((mv?mv.y:900) - vh/2); } clampPan(); appliquerPan(); };

// ==================== TIROIRS ====================
let tiroirOuvert = null;
window.toggleTiroir = function(nom) {
  if (nom === 'build') { afficherToast("Touche un bâtiment pour l'améliorer 👆"); return; }
  if (tiroirOuvert === nom) { fermerTiroir(); return; }
  document.querySelectorAll('.drawer.open').forEach(d => d.classList.remove('open', 'slide-in'));
  const d = document.getElementById('drawer-' + nom);
  if (!d) return;
  d.classList.add('open'); requestAnimationFrame(() => d.classList.add('slide-in'));
  document.getElementById('drawer-backdrop').style.display = 'block';
  tiroirOuvert = nom;
  if (nom === 'baraques') { mettreAJourPopulation(); creerListeTroupes(); }
  if (nom === 'recruter') { afficherMesHeros(); afficherRecrutementHeros(); }
  if (nom === 'rassemblement') creerRassemblement();
  if (nom === 'artisanat') afficherForgeEquipement();
  if (nom === 'alliance') afficherAlliance();
  if (nom === 'articles') { afficherMesStrategies(); afficherArticles(); afficherBoutiqueEquipement(); afficherQuetes(); }
  if (nom === 'research') afficherRecherche();
  if (nom === 'courrier') rendreCourrier();
  if (nom === 'inventaire') afficherInventaire();
  if (nom === 'classement') afficherClassement();
  if (nom === 'marche') afficherMarche();
  if (nom === 'march') document.getElementById('marchList').innerHTML = `<p class="hint">Aucune armée en marche.</p>`;
};
window.fermerTiroir = function() { document.querySelectorAll('.drawer.open').forEach(d => { d.classList.remove('slide-in'); setTimeout(() => d.classList.remove('open'), 280); }); document.getElementById('drawer-backdrop').style.display = 'none'; tiroirOuvert = null; };

// ==================== ALLIANCE ====================
window.creerAlliance = async function() { const nom = prompt("Nom de l'alliance :"); if (!nom) return; const snap = await getDoc(doc(db, COL_ALLIANCES, nom)); if (snap.exists()) { afficherToast("⛔ Existe déjà."); return; } await setDoc(doc(db, COL_ALLIANCES, nom), { nom, createur: monProfil.pseudo, membres: [monId] }); monProfil.allianceId = nom; await sauvegarder({ allianceId: nom }); afficherAlliance(); };
window.rejoindreAllianceExistante = async function(nom) { await updateDoc(doc(db, COL_ALLIANCES, nom), { membres: arrayUnion(monId) }); monProfil.allianceId = nom; await sauvegarder({ allianceId: nom }); afficherAlliance(); };
window.quitterAlliance = async function() { if (!monProfil.allianceId) return; await updateDoc(doc(db, COL_ALLIANCES, monProfil.allianceId), { membres: arrayRemove(monId) }); monProfil.allianceId = null; await sauvegarder({ allianceId: null }); afficherAlliance(); };
async function afficherAlliance() { const box = document.getElementById('allianceContenu'); if (!box) return; if (monProfil.allianceId) { const snap = await getDoc(doc(db, COL_ALLIANCES, monProfil.allianceId)); if (!snap.exists()) { monProfil.allianceId = null; await sauvegarder({ allianceId: null }); afficherAlliance(); return; } const a = snap.data(); box.innerHTML = `<h4 style="color:var(--gold);">${a.nom} — ${(a.membres||[]).length} membre(s)</h4><button class="btn-purple" onclick="quitterAlliance()">🚪 Quitter</button>`; } else { const snap = await getDocs(collection(db, COL_ALLIANCES)); let h = ""; snap.forEach(d => h += `<div class="item-card"><div class="info"><h4>${d.data().nom}</h4></div><button onclick="rejoindreAllianceExistante('${d.id}')" class="btn-sm">Rejoindre</button></div>`); box.innerHTML = `<button class="btn-gold" onclick="creerAlliance()">🆕 Fonder</button>${h || '<p class="hint">Aucune alliance.</p>'}`; } }

// ==================== COURRIER ====================
let _courrierRecus = {}, _courrierEnvoyes = {};
function demarrerCourrier() {
  onSnapshot(query(collection(db, COL_COURRIER), where("destinataireId","==",monId)), snap => { _courrierRecus = {}; snap.forEach(d => _courrierRecus[d.id] = { id: d.id, ...d.data() }); rendreCourrier(); });
  onSnapshot(query(collection(db, COL_COURRIER), where("expediteurId","==",monId)), snap => { _courrierEnvoyes = {}; snap.forEach(d => _courrierEnvoyes[d.id] = { id: d.id, ...d.data() }); rendreCourrier(); });
}
function rendreCourrier() { const sel = document.getElementById('destinataireCourrier'); if (sel && !sel.options.length) sel.innerHTML = _autresJoueurs.map(j => `<option value="${j.id}">${j.pseudo}</option>`).join(''); const box = document.getElementById('courrierListe'); const t = [...Object.values(_courrierRecus), ...Object.values(_courrierEnvoyes)]; t.sort((a,b) => (a.date?.toMillis?.()||0) - (b.date?.toMillis?.()||0)); if (box) box.innerHTML = t.map(m => `<div class="mail-row"><b>${m.expediteurId === monId ? 'Toi → '+m.destinatairePseudo : m.expediteurPseudo+' → toi'} :</b> ${m.texte}</div>`).join('') || `<p class="hint">Aucun message.</p>`; const nl = Object.values(_courrierRecus).filter(m => !m.lu).length; const b = document.getElementById('badgeCourrier'); if (b) { b.style.display = nl > 0 ? 'flex' : 'none'; b.innerText = nl; } }
window.envoyerCourrier = async function() { const destId = document.getElementById('destinataireCourrier').value; const inp = document.getElementById('courrierInput'); if (!destId || !inp.value.trim()) return; const dp = _autresJoueurs.find(j => j.id === destId)?.pseudo || "?"; await addDoc(collection(db, COL_COURRIER), { expediteurId: monId, expediteurPseudo: monProfil.pseudo, destinataireId: destId, destinatairePseudo: dp, texte: inp.value.trim(), date: serverTimestamp(), lu: false }); inp.value = ""; };

// ==================== ARTICLES ====================
const ARTICLES = [
  { id:"bouclier7j", nom:"🛡️ Bouclier 7 jours", desc:"Protège ta ville.", prix:300 },
  { id:"boostProd", nom:"⚡ Boost prod x2 (24h)", desc:"Double la production.", prix:250 },
  { id:"sacRessources", nom:"📦 Sac de ressources", desc:"+200🪵 +200🪨 +100⛓️.", prix:150 },
  { id:"renommer", nom:"✏️ Renommer ta ville", desc:"Change le nom.", prix:100 },
  { id:"attaquebrusque", nom:"⚡ Attaque Brusque", desc:"+20% force prochaine attaque.", prix:150 },
  { id:"contreoffensive", nom:"🛡️ Contre-Offensive", desc:"-20% attaquant 12h.", prix:180 },
  { id:"faillitetemporelle", nom:"⏳ Faillite Temporelle", desc:"Annule ta prochaine défaite.", prix:220 },
  { id:"grainemecontentement", nom:"🌱 Graine de Mécontentement", desc:"Réduit prod adverse 6h.", prix:200 }
];
function afficherArticles() { const box = document.getElementById('articlesListe'); if (!box) return; box.innerHTML = ARTICLES.map(a => `<div class="item-card"><div class="info"><h4>${a.nom}</h4><span>${a.desc}</span></div><button onclick="acheterArticle('${a.id}')" class="btn-sm">${a.prix}🪙</button></div>`).join(''); }
window.acheterArticle = async function(id) { const a = ARTICLES.find(x => x.id === id); if (monProfil.or < a.prix) { afficherToast("⛔ Pas assez d'or."); return; } monProfil.or -= a.prix; if (id === "bouclier7j") monProfil.village = { ...(monProfil.village||{}), bouclierFin: Date.now() + 7*86400000 }; if (id === "boostProd") monProfil.boostProductionFin = Date.now() + 86400000; if (id === "sacRessources") { monProfil.ressources.bois += 200; monProfil.ressources.pierre += 200; monProfil.ressources.fer += 100; } if (id === "renommer") { const n = prompt("Nouveau nom :", monProfil.nomVille || "Lyon"); if (n) monProfil.nomVille = n; else monProfil.or += a.prix; } if (id === "attaquebrusque") monProfil.strategies.brusque = (monProfil.strategies.brusque||0) + 1; if (id === "contreoffensive") monProfil.strategies.contreOffensive = (monProfil.strategies.contreOffensive||0) + 1; if (id === "faillitetemporelle") monProfil.strategies.faillite = (monProfil.strategies.faillite||0) + 1; if (id === "grainemecontentement") monProfil.strategies.mecontentement = (monProfil.strategies.mecontentement||0) + 1; await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, boostProductionFin: monProfil.boostProductionFin||null, nomVille: monProfil.nomVille, village: monProfil.village||null, strategies: monProfil.strategies }); majHUD(); afficherArticles(); afficherMesStrategies(); };

// ==================== QUÊTES (fixes + procédurales) ====================
const QUETES = [
  { id:"q1", nom:"Premiers pas", desc:"Améliore un bâtiment au niveau 2.", objectif:"batiment", cible:1, recompense:{or:100,bois:50} },
  { id:"q2", nom:"Chasseur débutant", desc:"Vaincs 3 monstres.", objectif:"monstres", cible:3, recompense:{or:150,pierre:80} },
  { id:"q3", nom:"Bûcheron en herbe", desc:"Collecte 200 bois.", objectif:"bois", cible:200, recompense:{or:200,fer:30} },
  { id:"q4", nom:"Recruteur", desc:"Recrute ton premier héros.", objectif:"heros", cible:1, recompense:{or:300,hero:"Scribe"} },
  { id:"q5", nom:"Conquérant", desc:"Capture un territoire.", objectif:"territoire", cible:1, recompense:{or:500,prestige:20} }
];
const QUETES_MODELES = [
  { modele:"Vaincre {n} monstres", objectif:"monstres", cible:()=> 3+Math.floor(Math.random()*5), recompense:()=>({or:200+Math.floor(Math.random()*300),fer:50}) },
  { modele:"Produire {n} bois", objectif:"bois", cible:()=> 300+Math.floor(Math.random()*500), recompense:()=>({or:300,pierre:100}) },
  { modele:"Recruter {n} héros", objectif:"heros", cible:()=> 2, recompense:()=>({or:500,prestige:5}) },
  { modele:"Améliorer un bâtiment au niveau {n}", objectif:"batiment", cible:()=> 3+Math.floor(Math.random()*3), recompense:()=>({or:400,bois:200}) }
];
function genererQueteProcedurale() { const m = QUETES_MODELES[Math.floor(Math.random()*QUETES_MODELES.length)]; const c = m.cible(); return { id:"proc_"+Date.now()+"_"+Math.floor(Math.random()*1000), nom:m.modele.replace("{n}",c), desc:"Quête générée automatiquement.", objectif:m.objectif, cible:c, recompense:m.recompense(), procedural:true }; }
function ajouterQuetesProcedurales() { QUETES.push(genererQueteProcedurale()); QUETES.push(genererQueteProcedurale()); }

function initialiserQuetesActives() { if (!Object.keys(monProfil.quetes.actives).length) { QUETES.forEach(q => { if (!monProfil.quetes.terminees.includes(q.id)) monProfil.quetes.actives[q.id] = 0; }); } }
function verifierProgressionQuetes() {
  let ch = false;
  for (const q of QUETES) {
    if (monProfil.quetes.actives[q.id] === undefined) continue;
    let a = 0;
    switch (q.objectif) {
      case "batiment": a = Object.values(monProfil.batiments).reduce((s,n) => Math.max(s,n), 0) - 1; break;
      case "monstres": a = (monProfil.monstresVaincus||[]).length; break;
      case "bois": a = monProfil.ressources.bois; break;
      case "heros": a = monProfil.heros.length; break;
      case "territoire": a = Object.values(_territoiresPossedes).filter(t => t.proprietaireId === monId).length; break;
    }
    if (a >= q.cible && a !== monProfil.quetes.actives[q.id]) { monProfil.quetes.actives[q.id] = a; terminerQuete(q.id); ch = true; }
  }
  if (ch) sauvegarder({ quetes: monProfil.quetes });
}
async function terminerQuete(id) { const q = QUETES.find(x => x.id === id); if (!q || monProfil.quetes.terminees.includes(id)) return; monProfil.quetes.terminees.push(id); delete monProfil.quetes.actives[id]; if (q.recompense.or) monProfil.or += q.recompense.or; if (q.recompense.bois) monProfil.ressources.bois += q.recompense.bois; if (q.recompense.pierre) monProfil.ressources.pierre += q.recompense.pierre; if (q.recompense.fer) monProfil.ressources.fer += q.recompense.fer; if (q.recompense.prestige) monProfil.prestige += q.recompense.prestige; if (q.recompense.hero) { const h = HEROS_RECRUTABLES.find(x => x.nom === q.recompense.hero); if (h) monProfil.heros.push({ ...h, equipements: [] }); } afficherToast(`✅ ${q.nom} terminée !`); ajouterAuJournal(`✅ ${monProfil.pseudo} a terminé : ${q.nom}`); majHUD(); afficherQuetes(); }
function afficherQuetes() { const box = document.getElementById('quetesListe'); if (!box) return; initialiserQuetesActives(); let h = ""; for (const q of QUETES) { const st = monProfil.quetes.terminees.includes(q.id) ? "✅ Terminée" : (monProfil.quetes.actives[q.id] !== undefined ? `En cours (${monProfil.quetes.actives[q.id]}/${q.cible})` : "Non débutée"); h += `<div class="strategie-row"><div class="info"><h4>${q.nom} <span style="color:#6ee7b7;">${st}</span></h4><span>${q.desc}</span></div></div>`; } box.innerHTML = h; }

// ==================== INVENTAIRE ====================
function afficherInventaire() { const box = document.getElementById('inventaireListe'); if (!box) return; const inv = monProfil.inventaireEquipement||[]; let h = ""; if (!inv.length) h += `<p class="hint">Aucun équipement.</p>`; else { h += `<h4 style="color:var(--gold);">⚔️ Équipements</h4>`; inv.forEach(id => { const e = TOUS_EQUIPEMENTS.find(x => x.id === id); if (!e) return; const p = (monProfil.heros||[]).find(h => h.equipements?.includes(id)); h += `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def} — ${e.set}${p ? ' · '+p.nom : ''}</span></div></div>`; }); } const s = monProfil.strategies||{}; const st = Object.entries(NOMS_STRATEGIES).filter(([k]) => (s[k]||0) > 0); if (st.length) { h += `<h4 style="color:var(--gold);margin:10px 0 6px;">🎴 Stratégies</h4>`; st.forEach(([k,info]) => { h += `<div class="item-card"><div class="info"><h4>${info.nom} (${s[k]})</h4><span>${info.desc}</span></div></div>`; }); } box.innerHTML = h; }

// ==================== SÉNAT ====================
function afficherSenat() { mettreAJourPopulation(); const t = calculerTauxProduction(); const m = document.getElementById('build-modal'); let h = `<h3>🏛️ Sénat</h3><p>Pop. max : ${monProfil.populationMax}</p><p>Active : ${monProfil.populationActive}</p><p>Militaire : ${monProfil.populationMilitaire}</p><p>Inactive : ${monProfil.populationInactive}</p><p style="font-size:12px;color:#9ca3af;">Taux/h : 🌾${t.nourriture.toFixed(1)} 🪵${t.bois.toFixed(1)} 🪨${t.pierre.toFixed(1)} ⛓️${t.fer.toFixed(1)}</p><p>Moral : ${Math.round(monProfil.moral)} / 100</p><p>Impôts : ${monProfil.tauxImpots}% <button onclick="changerImpots(1)" class="btn-sm">+</button> <button onclick="changerImpots(-1)" class="btn-sm">-</button></p><h4 style="margin-top:10px;color:var(--gold);">Héros fonctionnaire</h4>`; if (monProfil.heros.length) monProfil.heros.forEach((hh,i) => { const a = monProfil.herosFonctionnaireIndex === i; h += `<button onclick="assignerFonctionnaire(${i})" class="btn-sm" style="${a?'':'background:rgba(255,255,255,0.15);color:var(--gold);'};margin:3px;">${hh.icon} ${hh.nom} ${a?'✔':''}</button> `; }); else h += `<p class="hint">Aucun héros.</p>`; h += `<button class="close-btn" onclick="fermerModal()">Fermer</button>`; m.innerHTML = h; document.getElementById('build-modal-backdrop').style.display = 'flex'; }
window.changerImpots = async function(d) { monProfil.tauxImpots = Math.max(0, Math.min(50, monProfil.tauxImpots + d)); await sauvegarder({ tauxImpots: monProfil.tauxImpots }); afficherSenat(); };
window.assignerFonctionnaire = async function(i) { monProfil.herosFonctionnaireIndex = i; await sauvegarder({ herosFonctionnaireIndex: i }); afficherSenat(); };

// ==================== CLASSEMENT ====================
async function afficherClassement() { const box = document.getElementById('classementListe'); if (!box) return; box.innerHTML = `<p class="hint">Chargement...</p>`; const snap = await getDocs(collection(db, COL)); let j = []; snap.forEach(d => j.push({ id: d.id, ...d.data() })); j.sort((a,b) => calculerPuissanceDe(b) - calculerPuissanceDe(a)); box.innerHTML = j.slice(0, 30).map((x,i) => { const moi = x.id === monId; const med = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`; return `<div class="item-card" style="${moi?'border-color:var(--gold);':''}"><div class="info"><h4>${med} ${x.pseudo}${moi?' (toi)':''}</h4><span>⚡ ${calculerPuissanceDe(x)} · 🏆 ${x.prestige||0}</span></div></div>`; }).join(''); }

// ==================== MARCHÉ ====================
const PRIX_BASE = { nourriture:2, bois:3, pierre:4, fer:8 };
function prixActuel(r) { const h = Math.floor(Date.now()/3600000); const v = ((h*9301 + 49297) % 233280) / 233280; return Math.round(PRIX_BASE[r] * (0.7 + v*0.6) * 100) / 100; }
function afficherMarche() { const box = document.getElementById('marcheListe'); if (!box) return; let h = ""; for (const [r,base] of Object.entries(PRIX_BASE)) { const p = prixActuel(r); const t = p > base ? "📈" : "📉"; h += `<div class="item-card"><div class="info"><h4>${r.charAt(0).toUpperCase()+r.slice(1)}</h4><span>Prix : ${p}🪙 ${t}</span></div><div style="display:flex;gap:4px;"><button onclick="acheterRessource('${r}')" class="btn-sm">Acheter 10</button><button onclick="vendreRessource('${r}')" class="btn-sm" style="background:rgba(255,255,255,0.15);color:var(--gold);">Vendre 10</button></div></div>`; } box.innerHTML = h; }
window.acheterRessource = async function(r) { const p = prixActuel(r) * 10; if (monProfil.or < p) { afficherToast("⛔ Pas assez d'or."); return; } monProfil.or -= p; monProfil.ressources[r] += 10; await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources }); majHUD(); afficherMarche(); afficherToast(`+10 ${r} pour ${Math.round(p)}🪙`); };
window.vendreRessource = async function(r) { if (monProfil.ressources[r] < 10) { afficherToast("⛔ Pas assez."); return; } const g = Math.round(prixActuel(r) * 10 * 0.8); monProfil.ressources[r] -= 10; monProfil.or += g; await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources }); majHUD(); afficherMarche(); afficherToast(`+${g}🪙 (10 ${r} vendus)`); };

// ==================== PROFIL VILLE & ESPIONNAGE ====================
window.ouvrirProfilVille = async function(id) { const snap = await getDoc(doc(db, COL, id)); if (!snap.exists()) { afficherToast("Ville inexistante."); return; } const c = snap.data(); const pos = positionJoueur(id); const p = calculerPuissanceDe(c); const m = document.getElementById('profil-ville-modal'); m.innerHTML = `<h3 style="color:var(--gold);font-size:20px;">🏰 ${c.nomVille||c.pseudo}</h3><p style="color:#9ca3af;font-size:12px;">Seigneur : ${c.pseudo}</p><div style="display:flex;justify-content:center;gap:18px;margin:14px 0;"><div><div style="color:var(--gold);font-weight:bold;">${p}</div><div style="font-size:10px;">⚡ Puissance</div></div><div><div style="color:var(--gold);font-weight:bold;">${c.prestige||0}</div><div style="font-size:10px;">🏆 Prestige</div></div></div>${c.village?.bouclierFin > Date.now() ? '<p style="color:#6ee7b7;font-size:12px;">🛡️ Protégée.</p>' : ''}<button class="btn-secondary" style="width:100%;margin-bottom:8px;" onclick="espionnerJoueur('${id}')">🕵️ Espionner</button><button class="btn-secondary" style="width:100%;margin-bottom:8px;" onclick="ouvrirListeStrategies('${id}','${c.pseudo}')">🎴 Stratégies</button><button class="btn-gold" onclick="ouvrirAttaque({type:'joueur',id:'${id}',nom:'${c.pseudo}',x:${pos.x},y:${pos.y}}); fermerProfilVille();">⚔️ Attaquer</button><button class="close-btn" onclick="fermerProfilVille()">Fermer</button>`; document.getElementById('profil-ville-backdrop').style.display = 'flex'; };
window.fermerProfilVille = function() { document.getElementById('profil-ville-backdrop').style.display = 'none'; };
window.espionnerJoueur = async function(id) { const snap = await getDoc(doc(db, COL, id)); if (!snap.exists()) return; const c = snap.data(); const nm = c.batiments?.mirador||0; const fe = calculerPuissance(); const fd = forceDefense(c) + nm*20; const ch = Math.max(10, 80 - nm*6); const reussite = Math.random()*100 <= ch; let msg; if (reussite) { msg = `🕵️ Rapport complet sur ${c.pseudo} :\n\nVille : ${c.nomVille||c.pseudo}\nOr : ${c.or}\nBois : ${c.ressources.bois} | Pierre : ${c.ressources.pierre} | Fer : ${c.ressources.fer}\nMoral : ${Math.round(c.moral||0)}\nPuissance : ${calculerPuissanceDe(c)}\nHéros : ${(c.heros||[]).map(h => h.icon+' '+h.nom).join(', ')||'aucun'}`; afficherToast("🕵️ Infiltration réussie !"); } else if (Math.round(fe*0.5) >= Math.round(fd*0.8)) { msg = `🕵️ Rapport partiel sur ${c.pseudo} :\nOr estimé : ${Math.round(c.or/2)}\nPuissance : ${Math.round(calculerPuissanceDe(c)/2)}`; afficherToast("⚔️ Rapport partiel envoyé."); } else { msg = `💀 Tes espions ont été éliminés par ${c.pseudo}.`; afficherToast("💀 Échec."); } await addDoc(collection(db, COL_COURRIER), { expediteurId:"systeme", expediteurPseudo:"🕵️ Espionnage", destinataireId:monId, destinatairePseudo:monProfil.pseudo, texte:msg, date:serverTimestamp(), lu:false }); fermerProfilVille(); };

// ==================== TERRITOIRES ====================
let _territoiresPossedes = {};
async function chargerTerritoires() { const snap = await getDocs(collection(db, COL_TERRITOIRES)); _territoiresPossedes = {}; snap.forEach(d => _territoiresPossedes[d.id] = d.data()); }
async function calculerProductionTerritoires() { const mt = MARQUEURS_MONDE.filter(m => m.type === 'res' && _territoiresPossedes[m.id]?.proprietaireId === monId); if (!mt.length) return; let g = { bois:0, pierre:0, fer:0, nourriture:0 }; for (const t of mt) { const info = _territoiresPossedes[t.id]; const h = Math.min(48, (Date.now() - (info.dernierCalcul||Date.now()))/3600000); const gain = Math.round((3 + t.badge*0.4)*h); g[t.ressourceType] = (g[t.ressourceType]||0) + gain; info.dernierCalcul = Date.now(); await setDoc(doc(db, COL_TERRITOIRES, t.id), info); } monProfil.ressources.bois += g.bois; monProfil.ressources.pierre += g.pierre; monProfil.ressources.fer += g.fer; monProfil.ressources.nourriture += g.nourriture; await sauvegarder({ ressources: monProfil.ressources }); if (g.bois+g.pierre+g.fer+g.nourriture > 0) afficherToast(`🗺️ +${g.bois}🪵 +${g.pierre}🪨 +${g.fer}⛓️ +${g.nourriture}🌾`); }
window.ouvrirProfilTerritoire = function(id) { const t = MARQUEURS_MONDE.find(m => m.id === id); const info = _territoiresPossedes[id]; const m = document.getElementById('profil-territoire-modal'); let h = `<h3>${t.nomtype} (niv.${t.badge})</h3>`; if (!info || !info.proprietaireId) h += `<p class="hint">Gardien (force ${t.badge*70}).</p><button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Attaquer</button>`; else if (info.proprietaireId === monId) h += `<p style="color:#6ee7b7;">🏳️ T'appartient.</p>`; else h += `<p class="hint">Contrôlé par ${info.proprietairePseudo}.</p><button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Conquérir</button>`; h += `<button class="close-btn" onclick="fermerProfilTerritoire()">Fermer</button>`; m.innerHTML = h; document.getElementById('profil-territoire-backdrop').style.display = 'flex'; };
window.fermerProfilTerritoire = function() { document.getElementById('profil-territoire-backdrop').style.display = 'none'; };
window.attaquerTerritoire = async function(id) { const t = MARQUEURS_MONDE.find(m => m.id === id); const info = _territoiresPossedes[id]; const ma = forceAttaque(monProfil); let s; if (!info || !info.proprietaireId) s = t.badge * 70; else { const p = await getDoc(doc(db, COL, info.proprietaireId)); s = forceDefense(p.data()); } const v = ma * (0.85 + Math.random()*0.3) >= s; await deplacerTroupes({ x:t.x, y:t.y }); await animerCombat(monProfil.pseudo, monProfil.avatar, t.nomtype, '🐊', v); if (v) { const ni = { proprietaireId: monId, proprietairePseudo: monProfil.pseudo, dernierCalcul: Date.now() }; await setDoc(doc(db, COL_TERRITOIRES, id), ni); _territoiresPossedes[id] = ni; const g = 20 + t.badge*5; monProfil.ressources[t.ressourceType] += g; await sauvegarder({ ressources: monProfil.ressources }); afficherToast(`🏁 Conquis ! +${g} ${t.ressourceType}`); rendreMondeCanvas(); verifierProgressionQuetes(); } else { reduireTroupes(monProfil.troupes, 0.1); await sauvegarder({ troupes: monProfil.troupes }); afficherToast("💀 Échec."); } fermerProfilTerritoire(); };

// ==================== CHAT ====================
function demarrerChat() { onSnapshot(query(collection(db, COL_CHAT), orderBy("date")), snap => { const box = document.getElementById('chatMessages'); if (!box) return; box.innerHTML = ""; snap.forEach(d => { const m = d.data(); box.innerHTML += `<div class="chat-msg"><b>${m.pseudo} :</b> ${m.texte}</div>`; }); box.scrollTop = box.scrollHeight; }); }
window.envoyerMessageChat = async function() { const i = document.getElementById('chatInput'); if (!i.value.trim()) return; await addDoc(collection(db, COL_CHAT), { pseudo: monProfil.pseudo, texte: i.value.trim(), date: serverTimestamp() }); i.value = ""; };

// ==================== JOURNAL ====================
async function ajouterAuJournal(t) { await addDoc(collection(db, COL_JOURNAL), { texte:t, date:serverTimestamp() }); }
let _dernieresEntreesJournal = [], _indexTicker = 0, _intervalTicker = null;
function demarrerJournal() { onSnapshot(query(collection(db, COL_JOURNAL), orderBy("date","desc")), snap => { const box = document.getElementById('journalMessages'); _dernieresEntreesJournal = []; let h = "", c = 0; snap.forEach(d => { if (c++ >= 40) return; _dernieresEntreesJournal.push(d.data().texte); h += `<div class="chat-msg">📌 ${d.data().texte}</div>`; }); if (box) box.innerHTML = h || `<p class="hint">Aucun événement.</p>`; }); if (_intervalTicker) clearInterval(_intervalTicker); _intervalTicker = setInterval(() => { if (!_dernieresEntreesJournal.length) return; _indexTicker = (_indexTicker + 1) % _dernieresEntreesJournal.length; const t = document.getElementById('hudTicker'); if (t) t.innerText = "📯 " + _dernieresEntreesJournal[_indexTicker]; }, 5000); }

// ==================== PUISSANCE ====================
function calculerPuissanceDe(p) { const nb = Object.values(p.batiments||{}).reduce((s,n) => s+n, 0); const nt = Object.values(p.troupes||{}).reduce((s,n) => s+n, 0); const ne = (p.inventaireEquipement||[]).length; const sh = (p.heros||[]).reduce((s,h) => s + h.etoiles*30, 0); return nb*25 + nt*8 + ne*20 + sh + Math.floor((p.or||0)/10); }
function calculerPuissance() { return calculerPuissanceDe(monProfil); }

// ==================== GAINS FLOTTANTS ====================
function afficherGainFlottant(t) { const z = document.getElementById('gains-flottants'); if (!z) return; const e = document.createElement('div'); e.className = 'gain-flottant'; e.innerText = t; e.style.left = (40 + Math.random()*40) + '%'; z.appendChild(e); setTimeout(() => e.remove(), 1500); }

// ==================== PNJ AUTONOMES ====================
async function creerPNJSiAbsent() { const defauts = [ { id:"sissi", nom:"Sissi", categorie:"petite", or:500, bois:800, pierre:600, fer:200, troupes:15, batiments:3, moral:80, derniereAction: Date.now() }, { id:"ciel", nom:"Ciel", categorie:"grande", or:2000, bois:3000, pierre:2500, fer:1500, troupes:80, batiments:8, moral:90, derniereAction: Date.now() } ]; for (const p of defauts) { const snap = await getDoc(doc(db, COL_PNJ, p.id)); if (!snap.exists()) await setDoc(doc(db, COL_PNJ, p.id), p); } }
async function simulerPNJ() { const snap = await getDocs(collection(db, COL_PNJ)); const now = Date.now(); for (const d of snap.docs) { const pnj = d.data(); const h = Math.min(24, (now - (pnj.derniereAction||now))/3600000); if (h < 0.05) continue; const mult = pnj.categorie === 'grande' ? 60 : 25; pnj.or += Math.round(mult*h*1.0); pnj.bois += Math.round(mult*h*1.2); pnj.pierre += Math.round(mult*h*0.8); pnj.fer += Math.round(mult*h*0.5); if (pnj.or > 800 && Math.random() < 0.4) { pnj.troupes += Math.floor(Math.random()*5)+1; pnj.or -= 400; await ajouterAuJournal(`🏘️ ${pnj.nom} a entraîné de nouvelles troupes.`); } if (pnj.bois > 1500 && pnj.pierre > 1000 && Math.random() < 0.3) { pnj.batiments += 1; pnj.bois -= 1000; pnj.pierre -= 800; await ajouterAuJournal(`🏗️ ${pnj.nom} a amélioré ses défenses.`); } if (pnj.troupes > 30 && Math.random() < 0.15) await ajouterAuJournal(`⚠️ Les éclaireurs de ${pnj.nom} ont été aperçus près de nos frontières.`); pnj.derniereAction = now; await setDoc(doc(db, COL_PNJ, d.id), pnj); } }
function demarrerSimulationPNJ() { creerPNJSiAbsent(); simulerPNJ(); setInterval(simulerPNJ, 5*60*1000); }

// ==================== ÉVÉNEMENTS MONDIAUX ====================
const EVENEMENTS = [
  { nom:"🌧️ Pluie de météorites", desc:"Des météorites riches en fer ! +200 fer.", appliquer: async (p) => { p.ressources.fer += 200; } },
  { nom:"👹 Invasion de monstres", desc:"Des monstres rôdent. Prépare tes défenses.", appliquer: async () => {} },
  { nom:"🐪 Caravane marchande", desc:"500 or contre 300 bois.", appliquer: async (p) => { if (p.ressources.bois >= 300) { p.ressources.bois -= 300; p.or += 500; } } },
  { nom:"🌾 Mauvaise récolte", desc:"Moral -10.", appliquer: async (p) => { p.moral = Math.max(0, p.moral - 10); } },
  { nom:"✨ Bénédiction", desc:"Moral +15.", appliquer: async (p) => { p.moral = Math.min(100, p.moral + 15); } }
];
async function declencherEvenementAleatoire() { const ev = EVENEMENTS[Math.floor(Math.random()*EVENEMENTS.length)]; await ev.appliquer(monProfil); await sauvegarder({ ressources: monProfil.ressources, or: monProfil.or, moral: monProfil.moral }); majHUD(); afficherToast(`${ev.nom} — ${ev.desc}`); await ajouterAuJournal(`${ev.nom} : ${ev.desc}`); }
function demarrerEvenements() { setInterval(() => { if (Math.random() < 0.3) declencherEvenementAleatoire(); }, 3600*1000); }

// ==================== NOTIFICATIONS ====================
async function demanderPermissionNotifications() { if (!("Notification" in window)) return; if (Notification.permission === "default") await Notification.requestPermission(); }
function envoyerNotification(t, m) { if (!("Notification" in window)) return; if (Notification.permission === "granted" && document.hidden) new Notification(t, { body: m, icon: "https://i.postimg.cc/QMc3tBWN/IMG-20260812-WA0041.jpg" }); }

// ==================== TUTORIEL ====================
const ETAPES_TUTORIEL = [
  { titre:"👑 Bienvenue !", texte:"Vous êtes un Réveilleur. Bâtissez une cité puissante et conquérez le monde." },
  { titre:"🌾 Ressources", texte:"Nourriture, bois, pierre et fer sont produits automatiquement par vos bâtiments." },
  { titre:"👥 Population", texte:"Chaque maison augmente la population. Travailleurs = production, soldats = armée." },
  { titre:"🏛️ Sénat & Impôts", texte:"Le Sénat affiche tout. Plus d'impôts = plus d'or, mais moral plus bas." },
  { titre:"⚔️ Troupes", texte:"Entraînez des troupes à la Caserne. 12 types disponibles." },
  { titre:"🎖️ Héros", texte:"Recrutez des héros, nommez un meneur, équipez-les d'objets." },
  { titre:"🛡️ Sets", texte:"Équipez 3 pièces d'un set = 1er effet, 5 pièces = effet ultime." },
  { titre:"⚔️ Combat", texte:"Touchez une cible sur la carte, choisissez un héros, attaquez." },
  { titre:"🤝 Alliances & Quêtes", texte:"Rejoignez une alliance, accomplissez des quêtes, explorez le monde !" }
];
let etapeTutoriel = 0;
function ouvrirTutoriel() { etapeTutoriel = 0; afficherEtapeTutoriel(); document.getElementById('tutoriel-backdrop').style.display = 'flex'; }
function afficherEtapeTutoriel() { const m = document.getElementById('tutoriel-modal'); const e = ETAPES_TUTORIEL[etapeTutoriel]; let h = `<h3 style="color:var(--gold);">${e.titre}</h3><p style="font-size:14px;color:#e5e7eb;margin:12px 0;">${e.texte}</p><div style="display:flex;justify-content:space-between;margin-top:20px;">`; if (etapeTutoriel > 0) h += `<button class="btn-secondary" onclick="etapePrecedente()">← Préc.</button>`; else h += `<span></span>`; if (etapeTutoriel < ETAPES_TUTORIEL.length-1) h += `<button class="btn-gold" onclick="etapeSuivante()">Suivant →</button>`; else h += `<button class="btn-gold" onclick="fermerTutoriel()">Terminer</button>`; h += `</div>`; m.innerHTML = h; }
window.etapeSuivante = function() { if (etapeTutoriel < ETAPES_TUTORIEL.length-1) { etapeTutoriel++; afficherEtapeTutoriel(); } };
window.etapePrecedente = function() { if (etapeTutoriel > 0) { etapeTutoriel--; afficherEtapeTutoriel(); } };
window.fermerTutoriel = function() { document.getElementById('tutoriel-backdrop').style.display = 'none'; if (!monProfil.tutorielVu) { monProfil.tutorielVu = true; sauvegarder({ tutorielVu: true }); } };

// ==================== MODALS DYNAMIQUES ====================
function creerModalsDynamiques() {
  ['hero-equip','hero-attaque','tutoriel'].forEach(prefix => {
    if (document.getElementById(prefix + '-backdrop')) return;
    const b = document.createElement('div'); b.id = prefix + '-backdrop';
    b.style.cssText = 'position:absolute;inset:0;z-index:' + (prefix === 'tutoriel' ? '90' : '75') + ';display:none;background:rgba(0,0,0,0.6);align-items:' + (prefix === 'tutoriel' ? 'center' : 'flex-end') + ';justify-content:center;';
    const m = document.createElement('div'); m.id = prefix + '-modal';
    m.style.cssText = prefix === 'tutoriel' ? 'width:90%;max-width:420px;background:linear-gradient(180deg,#1a1440,#0a061d);border:2px solid var(--gold);border-radius:16px;padding:20px;text-align:center;' : 'width:100%;max-width:480px;background:linear-gradient(180deg,#1a1440,#0a061d);border-top:2px solid var(--gold);border-radius:18px 18px 0 0;padding:20px;text-align:center;max-height:80vh;overflow-y:auto;';
    b.appendChild(m); document.getElementById('main-container').appendChild(b);
  });
}

// ==================== PARTICULES & MUSIQUE ====================
function demarrerParticules() { const z = document.getElementById('particules-container'); if (!z) return; setInterval(() => { const p = document.createElement('div'); p.className = 'particule'; p.style.left = Math.random()*100 + '%'; p.style.bottom = '0px'; p.style.animationDuration = (4 + Math.random()*4) + 's'; z.appendChild(p); setTimeout(() => p.remove(), 8000); }, 700); }
window.basculerMusique = function() { const a = document.getElementById('bgMusic'); const i = document.getElementById('musicIcon'); if (a.paused) { a.play().catch(() => {}); i.className = 'fas fa-volume-up'; } else { a.pause(); i.className = 'fas fa-volume-mute'; } };

// ==================== POSITION & CHARGEMENT JOUEURS ====================
function positionJoueur(id) { let h = 0; for (let i = 0; i < id.length; i++) h = (h*31 + id.charCodeAt(i)) % 100000; return { x: 300 + (h%1600), y: 300 + Math.floor(h/1600)%2200 }; }
async function chargerAutresJoueurs() { const snap = await getDocs(collection(db, COL)); _autresJoueurs = []; snap.forEach(d => { if (d.id !== monId) _autresJoueurs.push({ id: d.id, ...d.data() }); }); }

// ==================== ENTRER DANS LE JEU ====================
async function entrerDansLeJeu() {
  try {
    if (!monProfil.ressources) monProfil.ressources = { nourriture:800, bois:600, pierre:400, fer:200 };
    if (!monProfil.batiments) monProfil.batiments = batimentsParDefaut();
    if (!monProfil.troupes) monProfil.troupes = { fantassins:0,archers:0,cavaliers:0,cavaliersBlindes:0,balistes:0,trebuchets:0,piquiers:0,mages:0,golems:0,chevaliersNoirs:0,assassins:0,pretres:0 };
    if (!monProfil.equipement) monProfil.equipement = { epee:0, bouclier:0, armure:0, arc:0, heaume:0 };
    if (monProfil.dernierCalcul === undefined) monProfil.dernierCalcul = Date.now();
    if (!monProfil.nomVille) monProfil.nomVille = "Lyon";
    if (monProfil.allianceId === undefined) monProfil.allianceId = null;
    if (!monProfil.strategies) monProfil.strategies = { mecontentement:0, brusque:0, contreOffensive:0, faillite:0 };
    if (!monProfil.heros) monProfil.heros = [];
    if (monProfil.meneurIndex === undefined) monProfil.meneurIndex = null;
    if (!monProfil.inventaireEquipement) monProfil.inventaireEquipement = [];
    if (!monProfil.recherches) monProfil.recherches = {};
    if (monProfil.prestige === undefined) monProfil.prestige = 0;
    if (!monProfil.quetes) monProfil.quetes = { actives:{}, terminees:[] };
    if (monProfil.moral === undefined) monProfil.moral = 80;
    if (monProfil.tauxImpots === undefined) monProfil.tauxImpots = 10;
    if (monProfil.herosFonctionnaireIndex === undefined) monProfil.herosFonctionnaireIndex = null;
    if (monProfil.heroAttaqueIndex === undefined) monProfil.heroAttaqueIndex = null;
    if (monProfil.tutorielVu === undefined) monProfil.tutorielVu = false;
    if (!monProfil.monstresVaincus) monProfil.monstresVaincus = [];
    if (!monProfil.constructionsEnCours) monProfil.constructionsEnCours = [];
    if (!monProfil.entrainementsEnCours) monProfil.entrainementsEnCours = [];

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    document.getElementById('hudCityName').innerText = monProfil.nomVille;
    creerModalsDynamiques();
    mettreAJourPopulation();
    majHUD();
    rendreVilleCanvas();
    demarrerChat();
    demarrerJournal();
    document.getElementById('loading-overlay').classList.remove('show');
    afficherToast(`👑 Bienvenue, ${monProfil.pseudo} !`);

    (async () => {
      try {
        await calculerProductionAutomatique();
        await chargerAutresJoueurs();
        await chargerTerritoires();
        await calculerProductionTerritoires();
        demarrerCourrier();
        demarrerParticules();
        ajouterQuetesProcedurales();
        initialiserQuetesActives();
        verifierProgressionQuetes();
        lancerProductionEnDirect();
        demarrerSimulationPNJ();
        demarrerEvenements();
        demanderPermissionNotifications();
        const bg = document.getElementById('bgMusic');
        if (bg) bg.play().catch(() => {});
        setTimeout(recentrerCarte, 150);
        if (!monProfil.tutorielVu) ouvrirTutoriel();
      } catch (e) { console.error('Erreur arrière-plan :', e); }
    })();
  } catch (e) { console.error(e); alert('Erreur : ' + e.message); document.getElementById('loading-overlay').classList.remove('show'); }
}

// ==================== RESTAURATION SESSION ====================
const savedId = localStorage.getItem('lyon_id');
if (savedId) { document.getElementById('codeInput').value = savedId; seConnecter(); }

function afficherToast(msg) { const t = document.getElementById('toast'); if (!t) return; t.innerText = msg; t.style.display = 'block'; clearTimeout(t._timer); t._timer = setTimeout(() => t.style.display = 'none', 2600); }
