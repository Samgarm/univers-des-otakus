import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyCHw1y_HTgPvtFrn18QOR5y7mvMo53p01A", authDomain: "univers-des-otakus-90640.firebaseapp.com", projectId: "univers-des-otakus-90640", storageBucket: "univers-des-otakus-90640.firebasestorage.app", messagingSenderId: "55096557900", appId: "1:55096557900:web:280115592b1dc051564fe9" };
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
// 🆕 Collection dédiée pour ne jamais mélanger avec Otakus/Empire/Légats dans le même projet Firebase
const COL = "lyonMembres";
const COL_CHAT = "lyonMessages";
const COL_JOURNAL = "lyonJournal";
const COL_ALLIANCES = "lyonAlliances";
const COL_COURRIER = "lyonCourrier";
const COL_TERRITOIRES = "lyonTerritoires";
const CODE_COMMUN = "LYON2026";

let monId = "", monProfil = null;

// ==================== DONNÉES PAR DÉFAUT (niveaux de départ, comme la maquette) ====================
function batimentsParDefaut() {
    return { senat:1, maison1:1, maison2:1, senat2:1, ambassade:1, maison3:1, baraques:1, maison4:1, taverne:1, villa:1,
             forgeron:1, stationrelais:1, mirador:1, atelier:1, rassemblement:1,
             ferme1:1, scierie1:1, carriere1:1, mine1:1, ferme2:1, ferme3:1, carriere2:1, ferme4:1 };
}
function profilParDefaut(pseudo, codeRecup) {
    return {
        pseudo, avatar: "👑", codeRecuperation: codeRecup, banni: false, premiereConnexion: true,
        or: 500,
        allianceId: null, nomVille: "Lyon", prestige: 0,
        strategies: { mecontentement: 0, brusque: 0, contreOffensive: 0, faillite: 0 }, contreOffensifFin: null, malusProductionFin: null,
        heros: [], meneurIndex: null, inventaireEquipement: [], recherches: {},
        ressources: { nourriture: 800, bois: 600, pierre: 400, fer: 200 },
        batiments: batimentsParDefaut(),
        troupes: { fantassins:0, archers:0, cavaliers:0, cavaliersBlindes:0, balistes:0, trebuchets:0 },
        equipement: { epee:0, bouclier:0, armure:0, arc:0, heaume:0 },
        dernierCalcul: Date.now()
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
        } else { msg.innerText = snap.exists() ? "Compte banni." : "Code invalide."; document.getElementById('loading-overlay').classList.remove('show'); }
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

// ==================== PRODUCTION AUTOMATIQUE HORS LIGNE (plafond 48h) ====================
async function calculerProductionAutomatique() {
    const p = monProfil;
    const heures = Math.min(48, (Date.now() - (p.dernierCalcul || Date.now())) / 3600000);
    if (heures < 0.02) return;
    const nbFermes = ['ferme1','ferme2','ferme3','ferme4'].reduce((s,k)=>s+(p.batiments[k]||0),0);
    const nbScieries = ['scierie1'].reduce((s,k)=>s+(p.batiments[k]||0),0);
    const nbCarrieres = ['carriere1','carriere2'].reduce((s,k)=>s+(p.batiments[k]||0),0);
    const nbMines = ['mine1'].reduce((s,k)=>s+(p.batiments[k]||0),0);
    // 🆕 Le boost "Articles" double la production ; la Graine de Mécontentement la réduit de moitié
    const boostActif = (p.boostProductionFin && p.boostProductionFin > Date.now());
    const malusActif = (p.malusProductionFin && p.malusProductionFin > Date.now());
    const multiplicateur = (boostActif ? 2 : 1) * (malusActif ? 0.5 : 1);
    const gN = Math.round(nbFermes * 8 * heures * multiplicateur * (bonusTechnologie(p, 'agriculture1') ? 1.2 : 1));
    const gB = Math.round(nbScieries * 8 * heures * multiplicateur);
    const gP = Math.round(nbCarrieres * 8 * heures * multiplicateur);
    const gF = Math.round(nbMines * 5 * heures * multiplicateur);
    p.ressources.nourriture += gN; p.ressources.bois += gB; p.ressources.pierre += gP; p.ressources.fer += gF;
    p.dernierCalcul = Date.now();
    await sauvegarder({ ressources: p.ressources, dernierCalcul: p.dernierCalcul });
    if (gN||gB||gP||gF) afficherToast(`⏳ Pendant ton absence : +${gN}🌾 +${gB}🪵 +${gP}🪨 +${gF}⛓️`);
}

// ==================== HUD ====================
function majHUD() {
    document.getElementById('avatarBox').innerText = monProfil.avatar || "👑";
    document.getElementById('pnameAffiche').innerText = monProfil.pseudo;
    document.getElementById('puissanceAffiche').innerText = calculerPuissance();
    const prestigeEl = document.getElementById('prestigeAffiche');
    if (prestigeEl) prestigeEl.innerText = monProfil.prestige || 0;
    document.getElementById('hudNourriture').innerText = monProfil.ressources.nourriture;
    document.getElementById('hudBois').innerText = monProfil.ressources.bois;
    document.getElementById('hudPierre').innerText = monProfil.ressources.pierre;
    document.getElementById('hudFer').innerText = monProfil.ressources.fer;
    document.getElementById('hudOr').innerText = monProfil.or;
}

// Position des bâtiments dans la vue Ville (coordonnées libres dans le canvas 1700x2400)
const BATIMENTS_VILLE = [
    { id: 'maison1',   nom: 'Maison',     icon: 'fa-house',            x: 140,  y: 180 },
    { id: 'maison2',   nom: 'Maison',     icon: 'fa-house',            x: 420,  y: 260 },
    { id: 'senat',     nom: 'Sénat',      icon: 'fa-university',       img: 'https://i.postimg.cc/9fF1572T/IMG-20260813-WA0003.jpg', x: 1260, y: 220, capital: true },
    { id: 'ambassade', nom: 'Ambassade',  icon: 'fa-building-columns', x: 1610, y: 480 },
    { id: 'maison3',   nom: 'Maison',     icon: 'fa-house',            x: 500,  y: 700 },
    { id: 'baraques',  nom: 'Baraques',   icon: 'fa-chess-rook',       img: 'https://i.postimg.cc/XJzqKGQ7/IMG-20260812-WA0067.jpg', x: 1120, y: 700 },
    { id: 'maison4',   nom: 'Maison',     icon: 'fa-house',            x: 860,  y: 780 },
    { id: 'taverne',   nom: 'Taverne',    icon: 'fa-beer-mug-empty',   img: 'https://i.postimg.cc/LXP1r9JN/IMG-20260813-WA0005.jpg', x: 340,  y: 860 },
    { id: 'villa',     nom: 'Villa',      icon: 'fa-hotel',            img: 'https://i.postimg.cc/0QKYPGBP/IMG-20260813-WA0004.jpg', x: 570,  y: 900 },
    { id: 'forgeron',  nom: 'Forgeron',   icon: 'fa-hammer',           x: 280,  y: 1120 },
    { id: 'stationrelais', nom: 'Station relais', icon: 'fa-flag-checkered', img: 'https://i.postimg.cc/0yHKjMm6/IMG-20260813-WA0006.jpg', x: 780, y: 1120 },
    { id: 'mirador',   nom: 'Mirador',    icon: 'fa-tower-observation',x: 500,  y: 1220 },
    { id: 'atelier',   nom: 'Atelier',    icon: 'fa-toolbox',          x: 1120, y: 1200 },
    { id: 'rassemblement', nom: 'Camp de rassemblement', icon: 'fa-people-group', x: 900, y: 480 },
    { id: 'ferme1',    nom: 'Ferme',      icon: 'fa-wheat-awn',        x: 230,  y: 1500 },
    { id: 'scierie1',  nom: 'Scierie',    icon: 'fa-tree',             x: 460,  y: 1560 },
    { id: 'carriere1', nom: 'Carrière',   icon: 'fa-mountain',         x: 1000, y: 1620 },
    { id: 'mine1',     nom: 'Mine',       icon: 'fa-gem',              x: 1220, y: 1660 },
    { id: 'ferme2',    nom: 'Ferme',      icon: 'fa-wheat-awn',        x: 400,  y: 1880 },
    { id: 'ferme3',    nom: 'Ferme',      icon: 'fa-wheat-awn',        x: 660,  y: 1900 },
    { id: 'carriere2', nom: 'Carrière',   icon: 'fa-mountain',         x: 250,  y: 2020 },
    { id: 'ferme4',    nom: 'Ferme',      icon: 'fa-wheat-awn',        x: 920,  y: 2020 }
];

const MARQUEURS_MONDE = [
    { type: 'mine-city', nom: 'Toi', icon: 'fa-landmark', x: 900, y: 1020 },
    { type: 'grande-ville', nom: 'Citadelle Oubliée', icon: 'fa-chess-rook', badge: 25, x: 1500, y: 400 },
    { type: 'grande-ville', nom: 'Cité des Abysses', icon: 'fa-water', badge: 30, x: 300, y: 2200 },
    { type: 'camp', badge: 4, icon: 'fa-campground', x: 1080, y: 480 },
    { type: 'monster', badge: 15, icon: 'fa-elephant', x: 980, y: 880 },
    { type: 'monster', badge: 13, icon: 'fa-elephant', x: 1180, y: 780 },
    { type: 'monster', badge: 4,  icon: 'fa-horse',    x: 560,  y: 640 },
    { type: 'monster', badge: 3,  icon: 'fa-horse',    x: 700,  y: 1140 },
    { type: 'monster', badge: 5,  icon: 'fa-horse',    x: 1260, y: 1180 },
    { type: 'monster', badge: 18, icon: 'fa-spider',   x: 240,  y: 1520 },
    // 🆕 Terrains conquérables (id stable pour Firestore) : forêts, montagnes, marécages, mines, champs
    { type: 'res', id: 'terr0', nomtype: 'Forêt', ressourceType: 'bois', badge: 9, icon: 'fa-seedling', x: 420, y: 480 },
    { type: 'res', id: 'terr1', nomtype: 'Forêt', ressourceType: 'bois', badge: 8, icon: 'fa-tree', x: 720, y: 500 },
    { type: 'res', id: 'terr2', nomtype: 'Forêt', ressourceType: 'bois', badge: 6, icon: 'fa-tree', x: 640, y: 420 },
    { type: 'res', id: 'terr3', nomtype: 'Montagne', ressourceType: 'pierre', badge: 7, icon: 'fa-mountain', x: 180, y: 900 },
    { type: 'res', id: 'terr4', nomtype: 'Montagne', ressourceType: 'pierre', badge: 11, icon: 'fa-mountain', x: 1400, y: 1500 },
    { type: 'res', id: 'terr5', nomtype: 'Mine', ressourceType: 'fer', badge: 10, icon: 'fa-gem', x: 480, y: 1080 },
    { type: 'res', id: 'terr6', nomtype: 'Champ', ressourceType: 'nourriture', badge: 8, icon: 'fa-wheat-awn', x: 780, y: 1300 },
    { type: 'res', id: 'terr7', nomtype: 'Marécage', ressourceType: 'nourriture', badge: 12, icon: 'fa-water', x: 340, y: 1200 },
    { type: 'res', id: 'terr8', nomtype: 'Marécage', ressourceType: 'fer', badge: 14, icon: 'fa-water', x: 1600, y: 900 }
];

// ==================== 🆕 HÉROS (1★ à 4★ recrutables, 5★ capturables uniquement) ====================
const HEROS_RECRUTABLES = [
    { nom: "Scribe", icon: "📜", etoiles: 1, attaque: 5, defense: 5, prix: 100, competence: { type: "butin", valeur: 0.1, desc: "+10% butin" } },
    { nom: "Milicien", icon: "⚔️", etoiles: 1, attaque: 10, defense: 8, prix: 150, competence: { type: "aucune", desc: "Aucune compétence spéciale" } },
    { nom: "Chevalier", icon: "🛡️", etoiles: 2, attaque: 25, defense: 20, prix: 400, competence: { type: "immunite", valeur: 0.15, desc: "15% de chance d'ignorer une attaque" } },
    { nom: "Archer d'Élite", icon: "🏹", etoiles: 2, attaque: 30, defense: 10, prix: 380, competence: { type: "vitesse", valeur: 0.3, desc: "Déplacements 30% plus rapides" } },
    { nom: "Mage de Guerre", icon: "🔮", etoiles: 3, attaque: 50, defense: 15, prix: 900, competence: { type: "critique", valeur: 0.2, desc: "20% de chance d'attaque critique (+50% dégâts)" } },
    { nom: "Paladin", icon: "⚜️", etoiles: 3, attaque: 35, defense: 45, prix: 1000, competence: { type: "immunite", valeur: 0.25, desc: "25% de chance d'ignorer une attaque" } },
    { nom: "Assassin Royal", icon: "🗡️", etoiles: 4, attaque: 90, defense: 10, prix: 2200, competence: { type: "critique", valeur: 0.35, desc: "35% de chance d'attaque critique (+50% dégâts)" } },
    { nom: "Prêtresse", icon: "🌙", etoiles: 4, attaque: 20, defense: 70, prix: 2100, competence: { type: "butin", valeur: 0.25, desc: "+25% butin" } }
];
const HEROS_LEGENDAIRES = [
    { nom: "Dragon d'Airain", icon: "🐉", etoiles: 5, attaque: 200, defense: 120, competence: { type: "critique", valeur: 0.4, desc: "40% de chance d'attaque critique (+50% dégâts)" } },
    { nom: "Seigneur des Abysses", icon: "🌊", etoiles: 5, attaque: 150, defense: 180, competence: { type: "immunite", valeur: 0.35, desc: "35% de chance d'ignorer une attaque" } },
    { nom: "Phénix Immortel", icon: "🔥", etoiles: 5, attaque: 175, defense: 150, competence: { type: "vitesse", valeur: 0.5, desc: "Déplacements 50% plus rapides + 20% butin" } }
];

// ==================== 🆕 ÉQUIPEMENT (5 emplacements, sets 3/5 et 5/5, compétences spéciales) ====================
const TOUS_EQUIPEMENTS = [
    { id: "epee_fer", slot: "arme", nom: "⚔️ Épée de Fer", att: 15, def: 0, prix: 250, rarete: "Commun", set: "Guerrier" },
    { id: "lance_argent", slot: "arme", nom: "🔱 Lance d'Argent", att: 35, def: 5, prix: 700, rarete: "Rare", set: "Guerrier" },
    { id: "marteau_titan", slot: "arme", nom: "🔨 Marteau du Titan", att: 60, def: 10, prix: 1600, rarete: "Épique", set: "Berserker", passif: { type: "critique", valeur: 0.15, desc: "15% attaque critique" } },
    { id: "lame_ombre", slot: "arme", nom: "🗡️ Lame de l'Ombre", att: 90, def: 15, prix: 3200, rarete: "Légendaire", set: "Assassin", passif: { type: "critique", valeur: 0.25, desc: "25% attaque critique" } },
    { id: "cuir", slot: "armure", nom: "🛡️ Armure de Cuir", att: 0, def: 20, prix: 200, rarete: "Commun", set: "Guerrier" },
    { id: "cotte", slot: "armure", nom: "🛡️ Cotte de Mailles", att: 0, def: 45, prix: 650, rarete: "Rare", set: "Guerrier" },
    { id: "manteau_ombre", slot: "armure", nom: "🌑 Manteau de l'Ombre", att: 10, def: 60, prix: 1500, rarete: "Épique", set: "Assassin", passif: { type: "immunite", valeur: 0.15, desc: "15% ignorer une attaque" } },
    { id: "armure_sacree", slot: "armure", nom: "✨ Armure Sacrée", att: 15, def: 120, prix: 3000, rarete: "Légendaire", set: "Paladin", passif: { type: "immunite", valeur: 0.3, desc: "30% ignorer une attaque" } },
    { id: "heaume_fer", slot: "casque", nom: "🪖 Heaume de Fer", att: 0, def: 25, prix: 300, rarete: "Commun", set: "Guerrier" },
    { id: "casque_loup", slot: "casque", nom: "🐺 Casque du Loup", att: 10, def: 30, prix: 700, rarete: "Rare", set: "Berserker" },
    { id: "diademe_aube", slot: "casque", nom: "👑 Diadème de l'Aube", att: 25, def: 20, prix: 1800, rarete: "Épique", set: "Paladin" },
    { id: "couronne_ombre", slot: "casque", nom: "🌑 Couronne de l'Ombre", att: 40, def: 25, prix: 3000, rarete: "Légendaire", set: "Assassin" },
    { id: "medaille_bronze", slot: "medaille", nom: "🎖️ Médaille de Bronze", att: 5, def: 5, prix: 200, rarete: "Commun", set: "Guerrier" },
    { id: "medaille_valeur", slot: "medaille", nom: "🎖️ Médaille de Valeur", att: 15, def: 15, prix: 700, rarete: "Rare", set: "Berserker" },
    { id: "amulette_anciens", slot: "medaille", nom: "📿 Amulette des Anciens", att: 10, def: 40, prix: 1800, rarete: "Épique", set: "Paladin", passif: { type: "immunite", valeur: 0.2, desc: "20% ignorer une attaque" } },
    { id: "medaille_dragon", slot: "medaille", nom: "🐉 Médaille du Dragon", att: 45, def: 20, prix: 3200, rarete: "Légendaire", set: "Assassin", passif: { type: "critique", valeur: 0.2, desc: "20% attaque critique" } },
    { id: "bottes_cuir", slot: "bottes", nom: "👢 Bottes de Cuir", att: 0, def: 10, prix: 180, rarete: "Commun", set: "Guerrier" },
    { id: "bottes_eclaireur", slot: "bottes", nom: "👢 Bottes d'Éclaireur", att: 10, def: 10, prix: 650, rarete: "Rare", set: "Berserker" },
    { id: "bottes_vent", slot: "bottes", nom: "💨 Bottes du Vent", att: 5, def: 15, prix: 1600, rarete: "Épique", set: "Paladin", passif: { type: "vitesse", valeur: 0.2, desc: "Déplacements 20% plus rapides" } },
    { id: "bottes_ombre", slot: "bottes", nom: "🌑 Bottes de l'Ombre", att: 20, def: 20, prix: 3000, rarete: "Légendaire", set: "Assassin", passif: { type: "vitesse", valeur: 0.35, desc: "Déplacements 35% plus rapides" } }
];
const SLOTS_EQUIPEMENT = ["arme", "armure", "casque", "medaille", "bottes"];
function calculerBonusEquipement(profil) {
    const inv = profil.inventaireEquipement || [];
    const possedes = inv.map(id => TOUS_EQUIPEMENTS.find(e => e.id === id)).filter(Boolean);
    let att = 0, def = 0;
    possedes.forEach(e => { att += e.att; def += e.def; });
    const parSet = {};
    possedes.forEach(e => { if (!parSet[e.set]) parSet[e.set] = new Set(); parSet[e.set].add(e.slot); });
    const setsActifs = Object.entries(parSet).filter(([, slots]) => slots.size >= 3).map(([nom, slots]) => ({ nom, complet: slots.size === 5 }));
    let multiplicateur = 1;
    setsActifs.forEach(s => { multiplicateur += s.complet ? 0.25 : 0.1; });
    const passifs = possedes.filter(e => e.passif && (parSet[e.set]?.size || 0) >= 3).map(e => e.passif);
    return { attaque: Math.round(att * multiplicateur), defense: Math.round(def * multiplicateur), sets: setsActifs, passifs };
}
function afficherBoutiqueEquipement() {
    const box = document.getElementById('equipementBoutiqueListe');
    if (!box) return;
    const possedes = monProfil.inventaireEquipement || [];
    box.innerHTML = SLOTS_EQUIPEMENT.map(slot => {
        const items = TOUS_EQUIPEMENTS.filter(e => e.slot === slot);
        return `<h4 style="color:var(--gold);margin:10px 0 4px;text-transform:capitalize;">${slot}</h4>` + items.map(e => `<div class="item-card"><div class="info"><h4>${e.nom} (${e.rarete})</h4><span>Att +${e.att} / Déf +${e.def}${e.passif ? ' — ' + e.passif.desc : ''} — Set ${e.set}</span></div>${possedes.includes(e.id) ? '<span style="color:#6ee7b7;font-size:11px;">✅ Possédé</span>' : `<button onclick="acheterEquipement('${e.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">${e.prix}🪙</button>`}</div>`).join('');
    }).join('');
    const bonus = calculerBonusEquipement(monProfil);
    const setsTxt = bonus.sets.length ? bonus.sets.map(s => `${s.nom} (${s.complet ? '5/5' : '3/5'})`).join(', ') : 'Aucun';
    const resume = document.getElementById('equipementResume');
    if (resume) resume.innerText = `⚔️ Bonus actuel : +${bonus.attaque} Att / +${bonus.defense} Déf — Sets actifs : ${setsTxt}`;
}
window.acheterEquipement = async function(id) {
    const e = TOUS_EQUIPEMENTS.find(x => x.id === id);
    if (monProfil.or < e.prix) { afficherToast("⛔ Pas assez d'or."); return; }
    monProfil.or -= e.prix;
    monProfil.inventaireEquipement = [...(monProfil.inventaireEquipement || []), id];
    await sauvegarder({ or: monProfil.or, inventaireEquipement: monProfil.inventaireEquipement });
    majHUD();
    afficherGainFlottant(`${e.nom} !`);
    afficherToast(`${e.nom} équipé !`);
    afficherBoutiqueEquipement();
};

function afficherMesHeros() {
    const box = document.getElementById('mesHerosListe');
    if (!box) return;
    const heros = monProfil.heros || [];
    if (heros.length === 0) { box.innerHTML = `<p class="hint">Aucun héros. Recrute-en un ci-dessous !</p>`; return; }
    box.innerHTML = heros.map((h, i) => `<div class="item-card"><div class="info"><h4>${h.icon} ${h.nom} ${"⭐".repeat(h.etoiles)}${monProfil.meneurIndex === i ? ' <span style="color:var(--gold);">(Meneur)</span>' : ''}</h4><span>Att ${h.attaque} / Déf ${h.defense} — ${h.competence?.desc || ''}</span></div>${monProfil.meneurIndex === i ? `<button onclick="retirerMeneur()" class="btn-sm">Retirer</button>` : `<button onclick="definirMeneur(${i})" class="btn-sm" style="background:var(--gold);color:#0a061d;">Nommer meneur</button>`}</div>`).join('');
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
    afficherGainFlottant(`${h.icon} +1 héros !`);
    afficherToast(`${h.icon} ${h.nom} rejoint tes rangs !`);
    afficherMesHeros();
};
window.definirMeneur = async function(index) {
    monProfil.meneurIndex = index;
    await sauvegarder({ meneurIndex: index });
    afficherToast(`🎖️ ${monProfil.heros[index].nom} mène désormais tes campagnes militaires !`);
    afficherMesHeros(); majHUD();
};
window.retirerMeneur = async function() {
    monProfil.meneurIndex = null;
    await sauvegarder({ meneurIndex: null });
    afficherMesHeros(); majHUD();
};
// Bonus du héros meneur : s'ajoute directement à la force d'attaque et de défense
function bonusMeneur(profil) {
    if (profil.meneurIndex === null || profil.meneurIndex === undefined) return { attaque: 0, defense: 0 };
    const h = (profil.heros || [])[profil.meneurIndex];
    return h ? { attaque: h.attaque, defense: h.defense } : { attaque: 0, defense: 0 };
}


    fantassins:      { nom: 'Fantassins',       icon: 'fa-shield',              attaque:6,  defense:9,  cout: { nourriture: 20, bois: 5,  fer: 0  } },
    archers:         { nom: 'Archers',          icon: 'fa-crosshairs',          attaque:10, defense:4,  cout: { nourriture: 25, bois: 15, fer: 5  } },
    cavaliers:       { nom: 'Cavaliers',        icon: 'fa-horse',               attaque:14, defense:7,  cout: { nourriture: 40, bois: 10, fer: 15 } },
    cavaliersBlindes:{ nom: 'Cavaliers blindés',icon: 'fa-chess-knight',        attaque:20, defense:16, cout: { nourriture: 60, bois: 20, fer: 40 } },
    balistes:        { nom: 'Balistes',         icon: 'fa-location-crosshairs', attaque:26, defense:6,  cout: { nourriture: 50, bois: 60, fer: 30 } },
    trebuchets:      { nom: 'Trébuchets',       icon: 'fa-meteor',              attaque:34, defense:5,  cout: { nourriture: 70, bois: 80, fer: 60 } }
};

function creerListeTroupes() {
    const box = document.getElementById('troupesList');
    let html = '';
    for (const [key, def] of Object.entries(DEFS_TROUPES)) {
        html += `<div class="list-row"><i class="fas ${def.icon}"></i><div class="info"><h4>${def.nom} <span style="color:#6ee7b7">(${monProfil.troupes[key]||0})</span></h4><span>🌾${def.cout.nourriture} 🪵${def.cout.bois} ⛓️${def.cout.fer}</span></div><button onclick="entrainer('${key}')">Entraîner</button></div>`;
    }
    box.innerHTML = html;
}
window.entrainer = async function(type) {
    const def = DEFS_TROUPES[type];
    const r = monProfil.ressources;
    if (r.nourriture < def.cout.nourriture || r.bois < def.cout.bois || r.fer < def.cout.fer) { afficherToast("⛔ Ressources insuffisantes."); return; }
    r.nourriture -= def.cout.nourriture; r.bois -= def.cout.bois; r.fer -= def.cout.fer;
    monProfil.troupes[type] = (monProfil.troupes[type] || 0) + 1;
    await sauvegarder({ ressources: r, troupes: monProfil.troupes });
    majHUD(); creerListeTroupes();
    afficherGainFlottant(`⚔️ +1 ${def.nom}`);
    afficherToast(`⚔️ 1 ${def.nom} entraîné !`);
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

const DEFS_EQUIPEMENT = {
    epee:    { nom: 'Épée du Légionnaire', icon: 'fa-khanda',        coutForge: { bois: 20, fer: 40 }, prixOr: 300 },
    bouclier:{ nom: 'Bouclier renforcé',   icon: 'fa-shield-halved', coutForge: { bois: 30, fer: 30 }, prixOr: 250 },
    armure:  { nom: 'Armure lourde',       icon: 'fa-user-shield',   coutForge: { bois: 10, fer: 60 }, prixOr: 400 },
    arc:     { nom: 'Arc long',            icon: 'fa-bullseye',      coutForge: { bois: 45, fer: 15 }, prixOr: 220 },
    heaume:  { nom: 'Heaume doré',         icon: 'fa-helmet-safety', coutForge: { bois: 5,  fer: 35 }, prixOr: 260 }
};
function creerListeEquipement() {
    const box = document.getElementById('equipementList');
    let html = '';
    for (const [key, def] of Object.entries(DEFS_EQUIPEMENT)) {
        html += `<div class="list-row"><i class="fas ${def.icon}"></i><div class="info"><h4>${def.nom} <span style="color:#6ee7b7">(${monProfil.equipement[key]||0})</span></h4><span>Forger : 🪵${def.coutForge.bois} ⛓️${def.coutForge.fer} · Acheter : 🪙${def.prixOr}</span></div><div style="display:flex;flex-direction:column;gap:4px;"><button onclick="forgerEquipement('${key}')">Forger</button><button onclick="acheterEquipement('${key}')" style="background:rgba(255,255,255,0.1);color:var(--gold);border:1px solid var(--gold);">Acheter</button></div></div>`;
    }
    box.innerHTML = html;
}
window.forgerEquipement = async function(type) {
    const def = DEFS_EQUIPEMENT[type]; const r = monProfil.ressources;
    if (r.bois < def.coutForge.bois || r.fer < def.coutForge.fer) { afficherToast("⛔ Matériaux insuffisants."); return; }
    r.bois -= def.coutForge.bois; r.fer -= def.coutForge.fer;
    monProfil.equipement[type] = (monProfil.equipement[type] || 0) + 1;
    await sauvegarder({ ressources: r, equipement: monProfil.equipement });
    majHUD(); creerListeEquipement();
    afficherToast(`🔨 ${def.nom} forgé !`);
};
window.acheterEquipement = async function(type) {
    const def = DEFS_EQUIPEMENT[type];
    if (monProfil.or < def.prixOr) { afficherToast("⛔ Pas assez d'or."); return; }
    monProfil.or -= def.prixOr;
    monProfil.equipement[type] = (monProfil.equipement[type] || 0) + 1;
    await sauvegarder({ or: monProfil.or, equipement: monProfil.equipement });
    majHUD(); creerListeEquipement();
    afficherToast(`💰 ${def.nom} acheté !`);
};

let cibleAttaque = null;
window.ouvrirAttaque = function(cible) {
    cibleAttaque = cible;
    document.getElementById('attaqueTitle').innerText = `⚔️ Attaquer ${cible.nom}`;
    const box = document.getElementById('attaqueTroupes');
    let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">';
    for (const [key, def] of Object.entries(DEFS_TROUPES)) {
        html += `<div style="text-align:center;background:rgba(0,0,0,0.3);border:1px solid #3a2d63;border-radius:10px;padding:8px;"><i class="fas ${def.icon}" style="color:var(--gold);font-size:18px;"></i><div style="font-size:11px;margin-top:4px;">${def.nom}</div><div style="font-size:13px;font-weight:bold;color:#6ee7b7;">${monProfil.troupes[key]||0} dispo</div></div>`;
    }
    html += `</div><p class="hint">Force d'attaque totale : ${forceAttaque(monProfil)}</p>`;
    box.innerHTML = html;
    toggleTiroir('attaque');
};
window.lancerAttaque = async function() {
    const total = Object.values(monProfil.troupes).reduce((a, b) => a + b, 0);
    if (total === 0) { afficherToast("⛔ Entraîne des troupes à la Caserne avant d'attaquer."); return; }
    const monAttaque = forceAttaque(monProfil);

    if (cibleAttaque.type === 'pnj') {
        const victoire = monAttaque >= cibleAttaque.force;
        await deplacerTroupes(cibleAttaque.nom);
        await animerCombat(monProfil.pseudo, monProfil.avatar, cibleAttaque.nom, '👹', victoire);
        if (victoire) {
            const multButin = bonusButin(monProfil) * (bonusTechnologie(monProfil, 'commerce1') ? 1.1 : 1);
            const butinOr = Math.round((20 + Math.floor(cibleAttaque.force * 0.2)) * multButin);
            const butinBois = Math.floor(cibleAttaque.force * 0.3);
            const butinPierre = Math.floor(cibleAttaque.force * 0.25);
            const butinFer = Math.floor(cibleAttaque.force * 0.15);
            monProfil.or += butinOr;
            monProfil.ressources.bois += butinBois; monProfil.ressources.pierre += butinPierre; monProfil.ressources.fer += butinFer;
            await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources });
            majHUD();
            afficherGainFlottant(`🏆 +${butinBois}🪵 +${butinPierre}🪨`);
            afficherToast(`🏆 Victoire contre ${cibleAttaque.nom} ! +${butinOr}🪙 +${butinBois}🪵 +${butinPierre}🪨 +${butinFer}⛓️`);
            ajouterAuJournal(`⚔️ ${monProfil.pseudo} a vaincu ${cibleAttaque.nom} et récupéré des matériaux !`);
            // 🆕 Capture d'un héros 5 étoiles en vainquant une grande ville PNJ (chance ~35%)
            if (cibleAttaque.grandeVille && Math.random() < 0.35) {
                const heroCapture = HEROS_LEGENDAIRES[Math.floor(Math.random() * HEROS_LEGENDAIRES.length)];
                monProfil.heros = [...(monProfil.heros || []), { ...heroCapture }];
                await sauvegarder({ heros: monProfil.heros });
                afficherToast(`🌟 Tu as capturé ${heroCapture.icon} ${heroCapture.nom} (5★) !`);
                ajouterAuJournal(`🌟 ${monProfil.pseudo} a capturé le légendaire ${heroCapture.nom} à ${cibleAttaque.nom} !`);
            } else if (cibleAttaque.grandeVille) {
                afficherToast(`Cette fois, aucun héros légendaire n'a été trouvé... retente ta chance !`);
            }
        } else {
            const pertes = reduireTroupes(monProfil.troupes, 0.15);
            await sauvegarder({ troupes: monProfil.troupes });
            majHUD();
            afficherToast(`💀 Défaite contre ${cibleAttaque.nom}... ${pertes} troupes perdues.`);
            ajouterAuJournal(`💀 ${monProfil.pseudo} a été repoussé par ${cibleAttaque.nom}.`);
        }
        fermerTiroir();
        return;
    }

    // Combat réel contre un joueur : on relit son profil à jour au moment de l'attaque
    const snap = await getDoc(doc(db, COL, cibleAttaque.id));
    if (!snap.exists()) { afficherToast("Ce joueur n'existe plus."); fermerTiroir(); return; }
    const defenseur = snap.data();
    if (defenseur.village?.bouclierFin > Date.now()) { afficherToast("🛡️ Cette ville est protégée par un bouclier, impossible de l'attaquer."); fermerTiroir(); return; }

    let monAttaqueFinale = monAttaque;
    let noteStrategie = "";
    // 🆕 Attaque Brusque : consommée automatiquement si disponible, +20% de force
    if ((monProfil.strategies?.brusque || 0) > 0) {
        monProfil.strategies.brusque -= 1;
        monAttaqueFinale = Math.round(monAttaqueFinale * 1.2);
        noteStrategie += " ⚡ Attaque Brusque utilisée (+20%) !";
        await sauvegarder({ strategies: monProfil.strategies });
    }
    // 🆕 Contre-Offensive du défenseur : réduit la force de l'attaquant de 20% si active
    if (defenseur.contreOffensifFin > Date.now()) {
        monAttaqueFinale = Math.round(monAttaqueFinale * 0.8);
        noteStrategie += " 🛡️ Le défenseur avait une Contre-Offensive active (-20% à ton attaque) !";
    }
    const sonDefense = forceDefense(defenseur);
    const victoire = monAttaqueFinale * (0.85 + Math.random() * 0.3) >= sonDefense;
    await deplacerTroupes(defenseur.pseudo);
    await animerCombat(monProfil.pseudo, monProfil.avatar, defenseur.pseudo, defenseur.avatar || '🏰', victoire);

    if (victoire) {
        // 🆕 Faillite Temporelle du défenseur : annule entièrement les pertes, comme si l'attaque n'avait jamais eu lieu
        if ((defenseur.strategies?.faillite || 0) > 0) {
            defenseur.strategies.faillite -= 1;
            await updateDoc(doc(db, COL, cibleAttaque.id), { strategies: defenseur.strategies });
            afficherToast(`⏳ ${cibleAttaque.nom} a activé Faillite Temporelle ! Ton attaque n'a eu aucun effet.`);
            ajouterAuJournal(`⏳ ${cibleAttaque.nom} a annulé l'attaque de ${monProfil.pseudo} grâce à une Faillite Temporelle !`);
            fermerTiroir();
            return;
        }
        const multButin = bonusButin(monProfil) * (bonusTechnologie(monProfil, 'commerce1') ? 1.1 : 1);
        const butinOr = Math.min(defenseur.or || 0, Math.round(((defenseur.or || 0) * 0.15 + 20) * multButin));
        const butinBois = Math.min(defenseur.ressources.bois, Math.round(defenseur.ressources.bois * 0.15));
        const butinPierre = Math.min(defenseur.ressources.pierre, Math.round(defenseur.ressources.pierre * 0.15));
        defenseur.or -= butinOr; defenseur.ressources.bois -= butinBois; defenseur.ressources.pierre -= butinPierre;
        defenseur.prestige = Math.max(0, (defenseur.prestige || 0) - 8);
        reduireTroupes(defenseur.troupes, 0.1);
        await updateDoc(doc(db, COL, cibleAttaque.id), { or: defenseur.or, ressources: defenseur.ressources, troupes: defenseur.troupes, prestige: defenseur.prestige });

        monProfil.or += butinOr; monProfil.ressources.bois += butinBois; monProfil.ressources.pierre += butinPierre;
        monProfil.prestige = (monProfil.prestige || 0) + 15;
        await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, prestige: monProfil.prestige });
        majHUD();
        afficherGainFlottant(`🏆 +${butinOr}🪙`);
        afficherToast(`🏆 Victoire contre ${cibleAttaque.nom} ! +${butinOr}🪙 +${butinBois}🪵 +${butinPierre}🪨${noteStrategie}`);
        ajouterAuJournal(`⚔️ ${monProfil.pseudo} a attaqué ${cibleAttaque.nom} et remporté la bataille !`);
    } else {
        monProfil.prestige = Math.max(0, (monProfil.prestige || 0) - 5);
        const pertes = reduireTroupes(monProfil.troupes, 0.2);
        await sauvegarder({ troupes: monProfil.troupes, prestige: monProfil.prestige });
        majHUD();
        afficherToast(`💀 Défaite face aux défenses de ${cibleAttaque.nom}... ${pertes} troupes perdues.${noteStrategie}`);
        ajouterAuJournal(`💀 ${monProfil.pseudo} a échoué à prendre ${cibleAttaque.nom}.`);
    }
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

// ==================== 🆕 RECHERCHE (technologies permanentes) ====================
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

// ==================== 🆕 DÉPLACEMENT DES TROUPES (animation avant le combat) ====================
function deplacerTroupes(nomCible) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('deplacement-troupes-backdrop');
        const texte = document.getElementById('deplacementTexte');
        const icone = document.getElementById('deplacementIcone');
        const vitesseHero = (monProfil.heros || [])[monProfil.meneurIndex]?.competence;
        const rapide = vitesseHero && vitesseHero.type === 'vitesse';
        texte.innerText = `🐎 Tes troupes se dirigent vers ${nomCible}...${rapide ? ' (renforcées par la vitesse du meneur)' : ''}`;
        overlay.style.display = 'flex';
        icone.style.animation = 'none'; void icone.offsetWidth; icone.style.animation = `marcheTroupes ${rapide ? 1.1 : 1.8}s linear forwards`;
        setTimeout(() => { overlay.style.display = 'none'; resolve(); }, rapide ? 1150 : 1850);
    });
}


// Le vainqueur est déjà déterminé par le calcul de force (fait avant l'appel) — l'animation ne fait que le mettre en scène,
// avec quelques rounds visuels où les barres de vie descendent, avant de révéler le résultat.
let _combatAnimeResolve = null;
function animerCombat(nomMoi, avatarMoi, nomAdv, avatarAdv, victoire) {
    return new Promise((resolve) => {
        _combatAnimeResolve = resolve;
        document.getElementById('combatAvatarMoi').innerText = avatarMoi || '⚔️';
        document.getElementById('combatAvatarAdv').innerText = avatarAdv || '👹';
        document.getElementById('combatNomMoi').innerText = nomMoi;
        document.getElementById('combatNomAdv').innerText = nomAdv;
        const barMoi = document.getElementById('combatPvMoi'), barAdv = document.getElementById('combatPvAdv');
        const log = document.getElementById('combatLogAnime');
        barMoi.style.width = '100%'; barAdv.style.width = '100%';
        log.innerText = "⚔️ Le combat commence...";
        document.getElementById('combat-anime-backdrop').style.display = 'flex';

        let pvMoi = 100, pvAdv = 100, round = 0;
        const totalRounds = 5;
        const interval = setInterval(() => {
            round++;
            // Le camp destiné à perdre encaisse plus de dégâts, mais chaque round reste incertain visuellement
            const degatsMoi = victoire ? (8 + Math.random() * 10) : (18 + Math.random() * 12);
            const degatsAdv = victoire ? (18 + Math.random() * 12) : (8 + Math.random() * 10);
            pvAdv = Math.max(round === totalRounds && victoire ? 0 : 5, pvAdv - degatsMoi);
            pvMoi = Math.max(round === totalRounds && !victoire ? 0 : 5, pvMoi - degatsAdv);
            barMoi.style.width = pvMoi + '%'; barAdv.style.width = pvAdv + '%';
            log.innerText += `\nRound ${round} : tu infliges ${Math.round(degatsMoi)}, tu subis ${Math.round(degatsAdv)}.`;
            log.scrollTop = log.scrollHeight;
            if (round >= totalRounds) {
                clearInterval(interval);
                log.innerText += victoire ? "\n\n🏆 Victoire !" : "\n\n💀 Défaite...";
                setTimeout(() => terminerCombatAnime(), 900);
            }
        }, 700);
    });
}
function terminerCombatAnime() {
    document.getElementById('combat-anime-backdrop').style.display = 'none';
    if (_combatAnimeResolve) { _combatAnimeResolve(); _combatAnimeResolve = null; }
}
window.passerCombat = function() { terminerCombatAnime(); };

function afficherToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg; t.style.display = 'block';
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.style.display = 'none', 2400);
}

// ==================== 🆕 JOURNAL DU MONDE (événements automatiques, partagés) ====================
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

// ==================== 🆕 PROFIL D'UNE VILLE ADVERSE (puissance, prestige, espionnage, attaque) ====================
window.ouvrirProfilVille = async function(id) {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) { afficherToast("Cette ville n'existe plus."); return; }
    const cible = snap.data();
    const puissance = calculerPuissanceDe(cible);
    const modal = document.getElementById('profil-ville-modal');
    modal.innerHTML = `
        <h3 style="color:var(--gold);font-size:20px;">🏰 ${cible.nomVille || cible.pseudo}</h3>
        <p style="color:#9ca3af;font-size:12px;margin-bottom:14px;">Seigneur : ${cible.pseudo}</p>
        <div style="display:flex;justify-content:center;gap:18px;margin-bottom:16px;">
            <div><div style="color:var(--gold);font-weight:bold;font-size:16px;">${puissance}</div><div style="font-size:10px;color:#9ca3af;">⚡ Puissance</div></div>
            <div><div style="color:var(--gold);font-weight:bold;font-size:16px;">${cible.prestige || 0}</div><div style="font-size:10px;color:#9ca3af;">🏆 Prestige</div></div>
        </div>
        ${cible.village?.bouclierFin > Date.now() ? '<p style="color:#6ee7b7;font-size:12px;margin-bottom:10px;">🛡️ Cette ville est protégée par un bouclier.</p>' : ''}
        <button class="btn-secondary" style="width:100%;margin-bottom:8px;" onclick="espionnerJoueur('${id}')">🕵️ Espionner</button>
        <button class="btn-secondary" style="width:100%;margin-bottom:8px;" onclick="ouvrirListeStrategies('${id}','${cible.pseudo}')">🎴 Utiliser une stratégie</button>
        <button class="btn-gold" onclick="ouvrirAttaque({type:'joueur', id:'${id}', nom:'${cible.pseudo}'}); fermerProfilVille();">⚔️ Attaquer</button>
        <button class="close-btn" onclick="fermerProfilVille()" style="background:transparent;color:#9ca3af;margin-top:8px;padding:6px;">Fermer</button>
    `;
    document.getElementById('profil-ville-backdrop').style.display = 'flex';
};
window.ouvrirListeStrategies = function(idCible, pseudoCible) {
    const s = monProfil.strategies || {};
    const modal = document.getElementById('profil-ville-modal');
    let html = `<h3 style="color:var(--gold);font-size:18px;margin-bottom:12px;">🎴 Tes stratégies</h3>`;
    const actives = Object.entries(NOMS_STRATEGIES).filter(([k]) => (s[k] || 0) > 0);
    if (actives.length === 0) {
        html += `<p class="hint">Tu n'as aucune stratégie en stock. Achète-en dans Articles.</p>`;
    } else {
        actives.forEach(([k, info]) => {
            let bouton = `<span style="font-size:10px;color:#9ca3af;">Automatique</span>`;
            if (k === 'mecontentement') bouton = `<button onclick="utiliserMecontentement('${idCible}','${pseudoCible}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">Utiliser</button>`;
            if (k === 'contreOffensive') bouton = `<button onclick="activerContreOffensive(); fermerProfilVille();" class="btn-sm" style="background:var(--gold);color:#0a061d;">Activer</button>`;
            html += `<div class="strategie-row"><div class="info"><h4>${info.nom} <span style="color:#6ee7b7;">(${s[k]})</span></h4><span>${info.desc}</span></div>${bouton}</div>`;
        });
    }
    html += `<button class="close-btn" onclick="ouvrirProfilVille('${idCible}')" style="background:transparent;color:#9ca3af;margin-top:10px;padding:6px;">← Retour</button>`;
    modal.innerHTML = html;
};
window.fermerProfilVille = function() { document.getElementById('profil-ville-backdrop').style.display = 'none'; };

window.espionnerJoueur = async function(id) {
    const snap = await getDoc(doc(db, COL, id));
    if (!snap.exists()) return;
    const cible = snap.data();
    // 🆕 Le mirador de la ville cible compte comme défense anti-espionnage : plus il est haut, plus l'espionnage a de chances d'échouer
    const niveauMirador = cible.batiments?.mirador || 0;
    const chanceReussite = Math.max(20, 80 - niveauMirador * 6);
    if (Math.random() * 100 <= chanceReussite) {
        const forceTotale = forceAttaque(cible), defenseTotale = forceDefense(cible);
        alert(`🕵️ Rapport d'espionnage sur ${cible.pseudo} :\n\n⚔️ Force d'attaque : ${forceTotale}\n🛡️ Force de défense : ${defenseTotale}\n💰 Or : ${cible.or}\n🪵 Bois : ${cible.ressources.bois} · 🪨 Pierre : ${cible.ressources.pierre} · ⛓️ Fer : ${cible.ressources.fer}`);
        ajouterAuJournal(`🕵️ ${monProfil.pseudo} a espionné ${cible.pseudo} avec succès.`);
    } else {
        afficherToast("🕵️ Ton espion a été repéré ! L'espionnage a échoué.");
        ajouterAuJournal(`🕵️ L'espion de ${monProfil.pseudo} a été démasqué par le mirador de ${cible.pseudo} !`);
    }
    fermerProfilVille();
};

// ==================== 🆕 STRATÉGIES (parchemins à usage unique) ====================
window.utiliserMecontentement = async function(idCible, pseudoCible) {
    if ((monProfil.strategies?.mecontentement || 0) < 1) return;
    monProfil.strategies.mecontentement -= 1;
    await sauvegarder({ strategies: monProfil.strategies });
    await updateDoc(doc(db, COL, idCible), { malusProductionFin: Date.now() + 6 * 3600000 });
    afficherToast(`🌱 Graine de Mécontentement semée chez ${pseudoCible} ! Production réduite 6h.`);
    ajouterAuJournal(`🌱 ${monProfil.pseudo} a semé le mécontentement chez ${pseudoCible} !`);
    fermerProfilVille();
};

// ==================== 🆕 COMBAT RÉEL ENTRE JOUEURS ====================
// Bonus de butin du héros meneur (compétence "butin")
function bonusButin(profil) {
    const h = (profil.heros || [])[profil.meneurIndex];
    return (h?.competence?.type === 'butin') ? (1 + h.competence.valeur) : 1;
}

function forceAttaque(profil) {
    const base = Object.entries(profil.troupes || {}).reduce((s, [k, n]) => s + n * (DEFS_TROUPES[k]?.attaque || 0), 0);
    const bonusTech = bonusTechnologie(profil, 'forge1') ? 1.15 : 1;
    return Math.round((base + bonusMeneur(profil).attaque + calculerBonusEquipement(profil).attaque) * bonusTech);
}
function forceDefense(profil) {
    const base = Object.entries(profil.troupes || {}).reduce((s, [k, n]) => s + n * (DEFS_TROUPES[k]?.defense || 0), 0);
    const niveauMirador = profil.batiments?.mirador || 0;
    const bonusTech = bonusTechnologie(profil, 'fortif1') ? 1.15 : 1;
    return Math.round((base + niveauMirador * 10 + bonusMeneur(profil).defense + calculerBonusEquipement(profil).defense) * bonusTech);
}
// Positionne les autres joueurs sur la carte du monde (position stable, dérivée de leur ID)
function positionJoueur(id) {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 100000;
    return { x: 200 + (h % 1800), y: 200 + Math.floor(h / 1800) % 2400 };
}
let _autresJoueurs = [];
async function chargerAutresJoueurs() {
    const snap = await getDocs(collection(db, COL));
    _autresJoueurs = [];
    snap.forEach(d => { if (d.id !== monId) _autresJoueurs.push({ id: d.id, ...d.data() }); });
}

// ==================== 🆕 CHAT MONDIAL (temps réel, partagé avec tout le groupe) ====================
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

// ==================== 🆕 PUISSANCE (score global façon "vrai jeu mobile") ====================
function calculerPuissanceDe(profil) {
    const niveauBatiments = Object.values(profil.batiments || {}).reduce((s, n) => s + n, 0);
    const nbTroupes = Object.values(profil.troupes || {}).reduce((s, n) => s + n, 0);
    const nbEquipement = Object.values(profil.equipement || {}).reduce((s, n) => s + n, 0);
    const scoreHeros = (profil.heros || []).reduce((s, h) => s + h.etoiles * 30, 0);
    return niveauBatiments * 25 + nbTroupes * 8 + nbEquipement * 40 + scoreHeros + Math.floor((profil.or || 0) / 10);
}
function calculerPuissance() { return calculerPuissanceDe(monProfil); }

// ==================== 🆕 GAINS FLOTTANTS (retour visuel façon jeu mobile) ====================
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

function seededRandom(seed) { return function() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

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
        el.style.left = b.x + 'px'; el.style.top = b.y + 'px';
        el.onclick = () => {
            if (b.id === 'baraques') { toggleTiroir('baraques'); return; }
            if (b.id === 'rassemblement') { toggleTiroir('rassemblement'); return; }
            if (b.id === 'forgeron') { toggleTiroir('forgeron'); return; }
            ouvrirModal(b.id, b.nom, b.icon, b.img);
        };
        const contenuIcone = b.img
            ? `<img src="${b.img}" alt="${b.nom}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.outerHTML='<i class=\\'fas ${b.icon}\\'></i>';">`
            : `<i class="fas ${b.icon}"></i>`;
        el.innerHTML = `<div class="marker-icon">${contenuIcone}<div class="marker-level">${niv}</div></div><div class="marker-ribbon">${b.nom}</div>`;
        canvas.appendChild(el);
    });
}

const ICONES_TERRITOIRE = { 'Forêt': { emoji: '🌲', classe: 'foret' }, 'Montagne': { emoji: '⛰️', classe: 'montagne' }, 'Mine': { emoji: '💎', classe: 'montagne' }, 'Champ': { emoji: '🌾', classe: 'marecage' }, 'Marécage': { emoji: '🐊', classe: 'marecage' } };
let _territoiresPossedes = {};
async function chargerTerritoires() {
    const snap = await getDocs(collection(db, COL_TERRITOIRES));
    _territoiresPossedes = {};
    snap.forEach(d => { _territoiresPossedes[d.id] = d.data(); });
}
async function calculerProductionTerritoires() {
    const mesTerritoires = MARQUEURS_MONDE.filter(m => m.type === 'res' && _territoiresPossedes[m.id]?.proprietaireId === monId);
    if (mesTerritoires.length === 0) return;
    let gains = { bois: 0, pierre: 0, fer: 0, nourriture: 0 };
    for (const t of mesTerritoires) {
        const info = _territoiresPossedes[t.id];
        const heures = Math.min(48, (Date.now() - (info.dernierCalcul || Date.now())) / 3600000);
        const gain = Math.round((3 + t.badge * 0.4) * heures);
        gains[t.ressourceType] = (gains[t.ressourceType] || 0) + gain;
        info.dernierCalcul = Date.now();
        await setDoc(doc(db, COL_TERRITOIRES, t.id), info);
    }
    monProfil.ressources.bois += gains.bois; monProfil.ressources.pierre += gains.pierre; monProfil.ressources.fer += gains.fer; monProfil.ressources.nourriture += gains.nourriture;
    await sauvegarder({ ressources: monProfil.ressources });
    const total = gains.bois + gains.pierre + gains.fer + gains.nourriture;
    if (total > 0) afficherToast(`🗺️ Tes territoires ont produit : +${gains.bois}🪵 +${gains.pierre}🪨 +${gains.fer}⛓️ +${gains.nourriture}🌾`);
}
window.ouvrirProfilTerritoire = function(id) {
    const t = MARQUEURS_MONDE.find(m => m.id === id);
    const info = _territoiresPossedes[id];
    const modal = document.getElementById('profil-territoire-modal');
    const deco = ICONES_TERRITOIRE[t.nomtype] || { emoji: '🗺️' };
    let html = `<h3 style="color:var(--gold);font-size:20px;">${deco.emoji} ${t.nomtype} (niv.${t.badge})</h3>`;
    if (!info || !info.proprietaireId) {
        html += `<p style="color:#9ca3af;font-size:12px;margin-bottom:14px;">Gardé par un gardien sauvage (force ${t.badge * 70}). Vaincs-le pour prendre le contrôle et récolter ses ressources en continu.</p>
        <button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Attaquer le Gardien</button>`;
    } else if (info.proprietaireId === monId) {
        html += `<p style="color:#6ee7b7;font-size:12px;margin-bottom:14px;">🏳️ Ce territoire t'appartient et te rapporte des ressources automatiquement.</p>`;
    } else {
        html += `<p style="color:#9ca3af;font-size:12px;margin-bottom:14px;">Contrôlé par <b style="color:#f87171;">${info.proprietairePseudo}</b>. Tu peux l'attaquer pour le lui prendre.</p>
        <button class="btn-gold" onclick="attaquerTerritoire('${id}')">⚔️ Conquérir ce territoire</button>`;
    }
    html += `<button class="close-btn" onclick="fermerProfilTerritoire()" style="background:transparent;color:#9ca3af;margin-top:8px;padding:6px;">Fermer</button>`;
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

    const deco = ICONES_TERRITOIRE[t.nomtype] || { emoji: '🗺️' };
    const victoire = monAttaque * (0.85 + Math.random() * 0.3) >= seuil;
    await deplacerTroupes(t.nomtype);
    await animerCombat(monProfil.pseudo, monProfil.avatar, t.nomtype, deco.emoji, victoire);

    if (victoire) {
        const nouvInfo = { proprietaireId: monId, proprietairePseudo: monProfil.pseudo, dernierCalcul: Date.now() };
        await setDoc(doc(db, COL_TERRITOIRES, id), nouvInfo);
        _territoiresPossedes[id] = nouvInfo;
        const gain = 20 + t.badge * 5;
        monProfil.ressources[t.ressourceType] += gain;
        await sauvegarder({ ressources: monProfil.ressources });
        majHUD();
        afficherGainFlottant(`🏁 +${gain} ${t.ressourceType}`);
        afficherToast(`🏁 ${t.nomtype} conquis ! +${gain} ${t.ressourceType} immédiatement.`);
        ajouterAuJournal(`🏁 ${monProfil.pseudo} a pris le contrôle de ${t.nomtype} (niv.${t.badge}) !`);
        rendreMondeCanvas();
    } else {
        reduireTroupes(monProfil.troupes, 0.1);
        await sauvegarder({ troupes: monProfil.troupes });
        afficherToast(`💀 Le siège de ${t.nomtype} a échoué...`);
        ajouterAuJournal(`💀 ${monProfil.pseudo} a échoué à conquérir ${t.nomtype}.`);
    }
    fermerProfilTerritoire();
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
            el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
            const statutClasse = info?.proprietaireId === monId ? 'possede-moi' : (info?.proprietaireId ? 'possede-autre' : '');
            el.onclick = () => ouvrirProfilTerritoire(m.id);
            el.innerHTML = `<div class="territoire-icone ${deco.classe} ${statutClasse}">${deco.emoji}</div><div class="territoire-label">${m.nomtype} ${info?.proprietaireId ? (info.proprietaireId === monId ? '(toi)' : '(' + info.proprietairePseudo + ')') : ''}</div>`;
            canvas.appendChild(el);
            return;
        }
        const el = document.createElement('div');
        el.className = 'wmarker';
        el.style.left = m.x + 'px'; el.style.top = m.y + 'px';
        el.onclick = () => {
            if (m.type === 'mine-city') { allerVue('city'); afficherToast('🏛️ Entrée dans ta ville'); return; }
            if (m.type === 'monster') { ouvrirAttaque({ type: 'pnj', nom: 'le monstre niv.' + m.badge, force: m.badge * 60 }); return; }
            if (m.type === 'camp') { ouvrirAttaque({ type: 'pnj', nom: 'le campement niv.' + m.badge, force: m.badge * 50 }); return; }
            if (m.type === 'grande-ville') { ouvrirAttaque({ type: 'pnj', nom: m.nom, force: m.badge * 80, grandeVille: true }); return; }
        };
        if (m.type === 'mine-city') {
            el.innerHTML = `<i class="fas ${m.icon} wmarker-icon mine-city"></i><div class="wmarker-label">${m.nom}</div>`;
        } else if (m.type === 'grande-ville') {
            el.innerHTML = `<div class="wmarker-badge monster" style="background:#7c3aed;">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:var(--gold);text-shadow:0 0 8px var(--gold);"></i><div class="wmarker-label">🌟 ${m.nom}</div>`;
        } else {
            const iconColor = '#f87171';
            el.innerHTML = `<div class="wmarker-badge monster">${m.badge}</div><i class="fas ${m.icon} wmarker-icon" style="color:${iconColor}"></i>`;
        }
        canvas.appendChild(el);
    });
    // 🆕 Royaumes des autres joueurs en pseudo-3D isométrique (mur/toit/tourelles + ombre portée + profondeur selon position)
    _autresJoueurs.forEach(j => {
        const pos = positionJoueur(j.id);
        const puissance = calculerPuissanceDe(j);
        const tier = puissance >= 1500 ? 'tier-or' : puissance >= 500 ? 'tier-argent' : '';
        const echelle = (0.8 + (pos.y / 2800) * 0.45).toFixed(2); // plus bas sur la carte = plus proche = plus grand
        const el = document.createElement('div');
        el.className = `royaume-marker ${tier}`;
        el.style.left = pos.x + 'px'; el.style.top = pos.y + 'px';
        el.style.transformOrigin = 'bottom center';
        el.style.transform = `scale(${echelle})`;
        el.onclick = () => ouvrirProfilVille(j.id);
        el.innerHTML = `
            <div class="royaume-3d">
                <div class="royaume-toit"></div>
                <div class="royaume-tourelle gauche"></div>
                <div class="royaume-tourelle droite"></div>
                <div class="royaume-mur"></div>
                <div class="royaume-ombre"></div>
            </div>
            <div class="royaume-label">${j.pseudo}</div>
            <div class="royaume-puissance">⚡${puissance}</div>`;
        canvas.appendChild(el);
    });
}

window.recentrerCarte = function() {
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
};

function allerVue(vue) {
    vueActuelle = vue;
    document.getElementById('nav-ville-label').innerText = vue === 'city' ? 'Ville' : 'Monde';
    document.getElementById('hudCityName').innerText = vue === 'city' ? 'Lyon' : 'Le Monde';
    if (vue === 'city') rendreVilleCanvas(); else rendreMondeCanvas();
    recentrerCarte();
}
window.toggleVue = function() {
    allerVue(vueActuelle === 'city' ? 'world' : 'city');
    afficherToast(vueActuelle === 'city' ? "🏛️ Retour à ta ville" : "🌍 Carte du monde");
};

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

let cibleActuelle = null;
const COUTS_AMELIORATION = (niv) => ({ or: (niv+1)*80, bois: (niv+1)*20, pierre: (niv+1)*15 });
window.ouvrirModal = function(id, nom, icon, img) {
    cibleActuelle = id;
    const niv = monProfil.batiments[id] || 1;
    const cout = COUTS_AMELIORATION(niv);
    const modal = document.getElementById('build-modal');
    const visuel = img
        ? `<img src="${img}" alt="${nom}" style="width:84px;height:84px;object-fit:cover;border-radius:12px;border:2px solid var(--gold);margin:0 auto 8px;display:block;" onerror="this.outerHTML='<i class=\\'fas ${icon} modal-icon\\'></i>';">`
        : `<i class="fas ${icon} modal-icon"></i>`;
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
    majHUD(); rendreVilleCanvas(); fermerModal();
    afficherGainFlottant(`🏗️ Niveau ${monProfil.batiments[cibleActuelle]} !`);
    afficherToast(`🏗️ Niveau ${monProfil.batiments[cibleActuelle]} atteint !`);
    ajouterAuJournal(`🏗️ ${monProfil.pseudo} a amélioré son bâtiment au niveau ${monProfil.batiments[cibleActuelle]} !`);
};

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
    if (nom === 'forgeron') creerListeEquipement();
    if (nom === 'alliance') afficherAlliance();
    if (nom === 'articles') { afficherArticles(); afficherBoutiqueEquipement(); }
    if (nom === 'research') afficherRecherche();
    if (nom === 'courrier') rendreCourrier();
    if (nom === 'march') document.getElementById('marchList').innerHTML = `<p class="hint">Aucune armée en marche pour l'instant.</p>`;
};
window.fermerTiroir = function() {
    document.querySelectorAll('.drawer.open').forEach(d => { d.classList.remove('slide-in'); setTimeout(() => d.classList.remove('open'), 280); });
    document.getElementById('drawer-backdrop').style.display = 'none';
    tiroirOuvert = null;
};

// ==================== 🆕 ALLIANCE ====================
window.creerAlliance = async function() {
    const nom = prompt("Nom de ta nouvelle alliance :");
    if (!nom) return;
    const snap = await getDoc(doc(db, COL_ALLIANCES, nom));
    if (snap.exists()) { afficherToast("⛔ Cette alliance existe déjà."); return; }
    await setDoc(doc(db, COL_ALLIANCES, nom), { nom, createur: monProfil.pseudo, membres: [monId] });
    monProfil.allianceId = nom;
    await sauvegarder({ allianceId: nom });
    afficherToast(`🤝 Alliance "${nom}" fondée !`);
    ajouterAuJournal(`🤝 ${monProfil.pseudo} a fondé l'alliance "${nom}" !`);
    afficherAlliance();
};
window.rejoindreAllianceExistante = async function(nom) {
    await updateDoc(doc(db, COL_ALLIANCES, nom), { membres: arrayUnion(monId) });
    monProfil.allianceId = nom;
    await sauvegarder({ allianceId: nom });
    afficherToast(`🤝 Tu as rejoint "${nom}" !`);
    afficherAlliance();
};
window.quitterAlliance = async function() {
    if (!monProfil.allianceId) return;
    await updateDoc(doc(db, COL_ALLIANCES, monProfil.allianceId), { membres: arrayRemove(monId) });
    monProfil.allianceId = null;
    await sauvegarder({ allianceId: null });
    afficherToast("🚪 Alliance quittée.");
    afficherAlliance();
};
async function afficherAlliance() {
    const box = document.getElementById('allianceContenu');
    if (!box) return;
    if (monProfil.allianceId) {
        const snap = await getDoc(doc(db, COL_ALLIANCES, monProfil.allianceId));
        if (!snap.exists()) { monProfil.allianceId = null; await sauvegarder({ allianceId: null }); afficherAlliance(); return; }
        const a = snap.data();
        const membresIds = a.membres || [];
        let membresHtml = "";
        for (const id of membresIds) {
            const j = id === monId ? monProfil : (_autresJoueurs.find(x => x.id === id) || {});
            membresHtml += `<div class="item-card"><div class="info"><h4>${j.pseudo || id}${id === monId ? " (toi)" : ""}</h4></div></div>`;
        }
        box.innerHTML = `<h4 style="color:var(--gold);margin-bottom:8px;">${a.nom} — ${membresIds.length} membre(s)</h4>${membresHtml}<button class="btn-purple" style="margin-top:10px;" onclick="quitterAlliance()">🚪 Quitter l'alliance</button>`;
    } else {
        const snap = await getDocs(collection(db, COL_ALLIANCES));
        let listeHtml = "";
        snap.forEach(d => { const a = d.data(); listeHtml += `<div class="item-card"><div class="info"><h4>${a.nom}</h4><span>${(a.membres||[]).length} membre(s)</span></div><button onclick="rejoindreAllianceExistante('${d.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">Rejoindre</button></div>`; });
        box.innerHTML = `<button class="btn-gold" onclick="creerAlliance()">🆕 Fonder une alliance</button><p class="hint" style="margin-top:10px;">Alliances existantes :</p>${listeHtml || '<p class="hint">Aucune alliance pour l\'instant.</p>'}`;
    }
}

// ==================== 🆕 COURRIER (messages privés) ====================
let _courrierRecus = {}, _courrierEnvoyes = {};
function demarrerCourrier() {
    const select = document.getElementById('destinataireCourrier');
    if (select) select.innerHTML = _autresJoueurs.map(j => `<option value="${j.id}">${j.pseudo}</option>`).join('');
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

// ==================== 🆕 ARTICLES (boutique) ====================
const ARTICLES = [
    { id: "bouclier7j", nom: "🛡️ Bouclier 7 jours", desc: "Protège ta ville contre les attaques.", prix: 300 },
    { id: "boostProd", nom: "⚡ Boost production x2 (24h)", desc: "Double ta production automatique.", prix: 250 },
    { id: "sacRessources", nom: "📦 Sac de ressources", desc: "+200🪵 +200🪨 +100⛓️ immédiatement.", prix: 150 },
    { id: "renommer", nom: "✏️ Renommer ta ville", desc: "Change le nom affiché de ta capitale.", prix: 100 },
    { id: "attaquebrusque", nom: "⚡ Attaque Brusque", desc: "+20% de force à ta prochaine attaque contre un joueur (auto).", prix: 150 },
    { id: "contreoffensive", nom: "🛡️ Contre-Offensive", desc: "En stock — active-la depuis tes stratégies : -20% à tout attaquant pendant 12h.", prix: 180 },
    { id: "faillitetemporelle", nom: "⏳ Faillite Temporelle", desc: "En stock — annule automatiquement les pertes de ta prochaine défaite subie.", prix: 220 }
];
function afficherArticles() {
    const box = document.getElementById('articlesListe');
    if (!box) return;
    box.innerHTML = ARTICLES.map(a => `<div class="item-card"><div class="info"><h4>${a.nom}</h4><span>${a.desc}</span></div><button onclick="acheterArticle('${a.id}')" class="btn-sm" style="background:var(--gold);color:#0a061d;">${a.prix}🪙</button></div>`).join('');
    afficherMesStrategies();
}
const NOMS_STRATEGIES = {
    mecontentement: { nom: "🌱 Graine de Mécontentement", desc: "S'utilise depuis le profil d'une ville adverse." },
    brusque: { nom: "⚡ Attaque Brusque", desc: "S'active automatiquement à ta prochaine attaque." },
    contreOffensive: { nom: "🛡️ Contre-Offensive", desc: "Active un bouclier de 12h contre les attaquants." },
    faillite: { nom: "⏳ Faillite Temporelle", desc: "Annule automatiquement ta prochaine défaite subie." }
};
function afficherMesStrategies() {
    const box = document.getElementById('mesStrategiesListe');
    if (!box) return;
    const s = monProfil.strategies || {};
    const actives = Object.entries(NOMS_STRATEGIES).filter(([k]) => (s[k] || 0) > 0);
    if (actives.length === 0) { box.innerHTML = `<p class="hint">Aucune stratégie en stock — achète-en dans la boutique ci-dessous.</p>`; return; }
    box.innerHTML = actives.map(([k, info]) => {
        const bouton = k === 'contreOffensive'
            ? `<button onclick="activerContreOffensive()" class="btn-sm" style="background:var(--gold);color:#0a061d;">Activer</button>`
            : '';
        return `<div class="strategie-row"><div class="info"><h4>${info.nom} <span style="color:#6ee7b7;">(${s[k]})</span></h4><span>${info.desc}</span></div>${bouton}</div>`;
    }).join('');
    if (monProfil.contreOffensifFin > Date.now()) {
        box.innerHTML += `<p style="color:#6ee7b7;font-size:11px;margin-top:6px;">🛡️ Contre-Offensive active encore ${Math.ceil((monProfil.contreOffensifFin - Date.now()) / 3600000)}h.</p>`;
    }
}
window.activerContreOffensive = async function() {
    if ((monProfil.strategies?.contreOffensive || 0) < 1) return;
    monProfil.strategies.contreOffensive -= 1;
    monProfil.contreOffensifFin = Date.now() + 12 * 3600000;
    await sauvegarder({ strategies: monProfil.strategies, contreOffensifFin: monProfil.contreOffensifFin });
    afficherToast("🛡️ Contre-Offensive activée pour 12h !");
    afficherMesStrategies();
};
window.acheterArticle = async function(id) {
    const article = ARTICLES.find(a => a.id === id);
    if (monProfil.or < article.prix) { afficherToast("⛔ Pas assez d'or."); return; }
    monProfil.or -= article.prix;
    if (id === "bouclier7j") monProfil.village = { ...(monProfil.village||{}), bouclierFin: Date.now() + 7*86400000 };
    if (id === "boostProd") monProfil.boostProductionFin = Date.now() + 86400000;
    if (id === "sacRessources") { monProfil.ressources.bois += 200; monProfil.ressources.pierre += 200; monProfil.ressources.fer += 100; }
    if (id === "renommer") { const n = prompt("Nouveau nom de ta ville :", monProfil.nomVille || "Lyon"); if (n) monProfil.nomVille = n; else monProfil.or += article.prix; }
    if (id === "attaquebrusque") { monProfil.strategies.brusque = (monProfil.strategies.brusque || 0) + 1; }
    if (id === "contreoffensive") { monProfil.strategies.contreOffensive = (monProfil.strategies.contreOffensive || 0) + 1; }
    if (id === "faillitetemporelle") { monProfil.strategies.faillite = (monProfil.strategies.faillite || 0) + 1; }
    await sauvegarder({ or: monProfil.or, ressources: monProfil.ressources, boostProductionFin: monProfil.boostProductionFin || null, nomVille: monProfil.nomVille || "Lyon", strategies: monProfil.strategies, contreOffensifFin: monProfil.contreOffensifFin || null });
    majHUD();
    if (monProfil.nomVille) document.getElementById('hudCityName').innerText = vueActuelle === 'city' ? monProfil.nomVille : 'Le Monde';
    afficherGainFlottant(`✅ ${article.nom}`);
    afficherArticles();
};

// ==================== 🆕 MUSIQUE DE FOND ====================
window.basculerMusique = function() {
    const audio = document.getElementById('bgMusic');
    const icone = document.getElementById('musicIcon');
    if (audio.paused) { audio.play().catch(() => afficherToast("🎵 Ajoute un fichier musique.mp3 dans ton dépôt pour activer la musique.")); icone.className = 'fas fa-volume-up'; }
    else { audio.pause(); icone.className = 'fas fa-volume-mute'; }
};

// ==================== 🆕 PARTICULES FLOTTANTES (ambiance MMO) ====================
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


async function entrerDansLeJeu() {
    if (!monProfil.ressources) monProfil.ressources = { nourriture:800, bois:600, pierre:400, fer:200 };
    if (!monProfil.batiments) monProfil.batiments = batimentsParDefaut();
    if (!monProfil.troupes) monProfil.troupes = { fantassins:0, archers:0, cavaliers:0, cavaliersBlindes:0, balistes:0, trebuchets:0 };
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

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'flex';
    document.getElementById('hudCityName').innerText = monProfil.nomVille;
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
    document.getElementById('bgMusic').play().catch(() => {}); // silencieux si l'autoplay est bloqué ou le fichier absent
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
