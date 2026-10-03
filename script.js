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
];
