import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCHw1y_HTgPvtFrn18QOR5y7mvMo53p01A",
    authDomain: "univers-des-otakus-90640.firebaseapp.com",
    projectId: "univers-des-otakus-90640",
    storageBucket: "univers-des-otakus-90640.firebasestorage.app",
    messagingSenderId: "55096557900",
    appId: "1:55096557900:web:280115592b1dc051564fe9"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ================= CONSTANTES =================
const CODE_COMMUN = "OTAKU2026";
const GRADES_CLAN = ["Recrue", "Guerrier", "Officier", "Vice-Chef", "Chef"];
const BATIMENTS = ["caserne","ferme","mur","scierie","carriere","temple","hotelDeVille"];
const COUT_BAT = { caserne:{or:100,bois:20}, ferme:{or:50,bois:10}, mur:{or:150,pierre:30}, scierie:{or:60,bois:10}, carriere:{or:60,pierre:10}, temple:{or:200,bois:50,pierre:50}, hotelDeVille:{or:300,bois:80,pierre:80} };
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀","🤖","🧟","👾"];

// ================= DONNÉES DU JEU =================
const HEROS = [
    { etoiles:1, nom:"Scribe", attaque:5, defense:5, prix:100, icon:"📜", comp:"Récolte +10%" },
    { etoiles:1, nom:"Milicien", attaque:10, defense:8, prix:150, icon:"⚔️", comp:"Défense +5%" },
    { etoiles:2, nom:"Chevalier", attaque:25, defense:20, prix:400, icon:"🛡️", comp:"Attaque +10%" },
    { etoiles:2, nom:"Archer", attaque:30, defense:10, prix:380, icon:"🏹", comp:"Vitesse +10%" },
    { etoiles:3, nom:"Mage", attaque:50, defense:15, prix:900, icon:"🔮", comp:"Dégâts +20%" },
    { etoiles:3, nom:"Paladin", attaque:35, defense:45, prix:1000, icon:"⚜️", comp:"Résistance +20%" },
    { etoiles:4, nom:"Assassin", attaque:90, defense:10, prix:2200, icon:"🗡️", comp:"Double dégâts 10%" },
    { etoiles:4, nom:"Prêtresse", attaque:20, defense:70, prix:2100, icon:"🌙", comp:"Soin +20% PV" },
    { etoiles:5, nom:"Dragon", attaque:200, defense:120, prix:6000, icon:"🐉", comp:"Att & Déf +30%" },
    { etoiles:5, nom:"Abysses", attaque:150, defense:180, prix:5500, icon:"🌊", comp:"Vol d'or +20%" }
];

const TOUS_EQUIPEMENTS = [
    { id:"epee_fer", cat:"guerre", type:"weapon", nom:"⚔️ Épée de Fer", att:15, def:0, hp:0, prix:250, rarete:"Commun", set:"Guerrier" },
    { id:"epee_acier", cat:"guerre", type:"weapon", nom:"⚔️ Lame d'Acier", att:30, def:5, hp:10, prix:600, rarete:"Rare", set:"Guerrier" },
    { id:"epee_ombre", cat:"guerre", type:"weapon", nom:"🗡️ Lame de l'Ombre", att:55, def:15, hp:20, prix:2000, rarete:"Épique", set:"Assassin" },
    { id:"epee_dawn", cat:"guerre", type:"weapon", nom:"⚔️ Épée de l'Aube", att:90, def:30, hp:40, prix:5000, rarete:"Légendaire", set:"Paladin", passif:"Immortel 2 tours" },
    { id:"epee_roi", cat:"guerre", type:"weapon", nom:"👑 Lame du Roi", att:180, def:50, hp:100, prix:14000, rarete:"Mythique", set:"Conquérant", passif:"Rage (+10% attaque)" },
    { id:"hache_guerre", cat:"guerre", type:"weapon", nom:"🪓 Hache", att:40, def:0, hp:15, prix:800, rarete:"Rare", set:"Berserker" },
    { id:"arc_nuit", cat:"guerre", type:"weapon", nom:"🏹 Arc", att:60, def:5, hp:0, prix:2200, rarete:"Épique", set:"Archer", passif:"Ignore 20% défense" },
    { id:"lance_dragon", cat:"guerre", type:"weapon", nom:"🐉 Lance", att:120, def:20, hp:50, prix:8000, rarete:"Légendaire", set:"Dragon", passif:"Brûlure (dégâts bonus)" },
    { id:"cuir", cat:"guerre", type:"armor", nom:"🛡️ Armure de Cuir", att:0, def:20, hp:10, prix:200, rarete:"Commun", set:"Guerrier" },
    { id:"cotte_mailles", cat:"guerre", type:"armor", nom:"🛡️ Cotte", att:0, def:45, hp:25, prix:700, rarete:"Rare", set:"Guerrier" },
    { id:"manteau_ombre", cat:"guerre", type:"armor", nom:"🌑 Manteau", att:10, def:80, hp:15, prix:2500, rarete:"Épique", set:"Assassin", passif:"Esquive +25%" },
    { id:"armure_sacree", cat:"guerre", type:"armor", nom:"✨ Armure Sacrée", att:15, def:150, hp:60, prix:6000, rarete:"Légendaire", set:"Paladin", passif:"Régénération 5% PV" },
    { id:"heaume_fer", cat:"guerre", type:"head", nom:"🪖 Heaume", att:0, def:25, hp:15, prix:300, rarete:"Commun", set:"Guerrier" },
    { id:"diademe_aube", cat:"guerre", type:"head", nom:"👑 Diadème", att:25, def:15, hp:10, prix:1800, rarete:"Rare", set:"Paladin" },
    { id:"cheval_guerre", cat:"guerre", type:"mount", nom:"🐴 Cheval", att:20, def:10, hp:0, prix:600, rarete:"Rare", set:"Guerrier" },
    { id:"loup_fantome", cat:"guerre", type:"mount", nom:"🐺 Loup", att:10, def:40, hp:15, prix:1500, rarete:"Épique", set:"Assassin", passif:"Esquive +15%" },
    { id:"dragonnet", cat:"guerre", type:"mount", nom:"🐉 Dragonnet", att:60, def:40, hp:50, prix:6000, rarete:"Légendaire", set:"Dragon", passif:"Brûlure" },
    { id:"bague_pouvoir", cat:"guerre", type:"accessory", nom:"💍 Bague", att:30, def:5, hp:0, prix:800, rarete:"Rare", set:"Assassin" },
    { id:"amulette_anciens", cat:"guerre", type:"accessory", nom:"📿 Amulette", att:5, def:60, hp:80, prix:4000, rarete:"Légendaire", set:"Paladin", passif:"Bouclier 50" },
    { id:"bottes_eclaireur", cat:"guerre", type:"boots", nom:"👢 Bottes", att:15, def:15, hp:0, prix:400, rarete:"Rare", set:"Archer", passif:"Premier coup" }
];
const PARCHES = [
    { id:"parchemin_ralentir", cat:"tactiques", nom:"📜 Ralentissement", prix:200, desc:"Retarde l'arrivée 10min" },
    { id:"parchemin_desordre", cat:"tactiques", nom:"📜 Désordre", prix:350, desc:"-30% Défense ennemie" },
    { id:"parchemin_moral", cat:"tactiques", nom:"📜 Moral", prix:400, desc:"Réduit production ennemie 50% 6h" },
    { id:"parchemin_renfort", cat:"tactiques", nom:"📜 Renfort", prix:250, desc:"+5 troupes" }
];
const MATERIAUX_FORGE = {
    commun: { minerai:2, fibre:2 },
    rare: { minerai:5, fibre:5, poussiere:"poussiere_rare" },
    epic: { minerai:15, fibre:15, poussiere:"poussiere_epic" },
    legendary: { minerai:30, fibre:30, poussiere:"poussiere_legendary" },
    mythic: { minerai:60, fibre:60, poussiere:"poussiere_mythic" }
};

let monId = "", monProfil = {}, pnjPool = [], tousJoueurs = [], mesHeros = [], territoires = [];
let combatInterval = null;

// ================= FONCTIONS UTILITAIRES =================
function afficherToast(txt, type="info") {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`; t.innerText = txt;
    c.appendChild(t); setTimeout(()=>t.remove(), 3500);
}

// ================= NAVIGATION =================
window.changerOnglet = function(nom) {
    document.querySelectorAll('.onglet-container').forEach(el => el.style.display = 'none');
    document.getElementById('onglet'+nom).style.display = 'block';
    document.querySelectorAll('#navFixe button').forEach(b => b.classList.remove('active'));
    const idx = ['Village','Clan','Monde','Boutique','Inventaire','Profil'].indexOf(nom);
    if(idx > -1) document.querySelector(`#navFixe button:nth-child(${idx+1})`).classList.add('active');
    if(nom === 'Village') afficherVillage();
    if(nom === 'Clan') chargerMembresClan();
    if(nom === 'Monde') { chargerAdversaires(); dessinerCarte(); }
    if(nom === 'Boutique') afficherBoutiqueComplete();
    if(nom === 'Inventaire') afficherInventaire('tout');
    if(nom === 'Profil') { afficherStats(); afficherClassementPar('prestige'); }
};

// ================= AUTHENTIFICATION =================
window.ouvrirInscription = function(){ document.getElementById('connexion').style.display='none'; document.getElementById('recuperation').style.display='none'; document.getElementById('inscription').style.display='block'; };
window.ouvrirRecuperation = function(){ document.getElementById('connexion').style.display='none'; document.getElementById('inscription').style.display='none'; document.getElementById('recuperation').style.display='block'; };
window.retourConnexion = function(){ document.getElementById('inscription').style.display='none'; document.getElementById('recuperation').style.display='none'; document.getElementById('connexion').style.display='block'; };
window._avatarChoisi = "🧝";

window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    if(!code) return document.getElementById('messageConnexion').innerText = "Entrez votre ID.";
    try {
        const snap = await getDoc(doc(db, "membres", code));
        if(snap.exists() && !snap.data().banni) {
            monId = code; monProfil = snap.data();
            document.getElementById('auth-ecran').style.display='none';
            document.getElementById('game-ecran').style.display='block';
            lancerJeu();
        } else document.getElementById('messageConnexion').innerText = snap.exists() ? "Compte banni." : "ID invalide.";
    } catch(e) { document.getElementById('messageConnexion').innerText = "Erreur: "+e.message; }
};

window.validerInscription = async function() {
    const pseudo = document.getElementById('pseudoInscriptionInput').value.trim();
    if(!pseudo) return document.getElementById('messageInscription').innerText = "Choisis un pseudo.";
    const check = await getDocs(query(collection(db,"membres"), where("pseudo","==",pseudo)));
    if(!check.empty) return document.getElementById('messageInscription').innerText = "Pseudo déjà pris.";
    const id = "M"+Date.now();
    const data = { pseudo, or:1000, prestige:0, avatar:window._avatarChoisi, heros:[], inventaire:["epee_fer"], village:{ressources:{bois:2000,pierre:2000,nourriture:500}, batiments:{}}, premiereConnexion:true, codeRecuperation:String(Math.floor(100000+Math.random()*900000)), clan:"Sans clan", grade:"Recrue", materiaux:{minerai:20, fibre:20}, geole:[], alliances:[] };
    await setDoc(doc(db,"membres",id), data);
    monId = id; monProfil = data; localStorage.setItem('otakus_id', id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
    afficherToast("✅ Compte créé ! ID: "+id, "success");
};
window.recupererCompte = async function() {
    const code = document.getElementById('codeRecuperationInput').value.trim();
    const snap = await getDocs(query(collection(db,"membres"), where("codeRecuperation","==",code)));
    if(snap.empty) return document.getElementById('messageRecuperation').innerText = "Code introuvable.";
    const d = snap.docs[0]; monId=d.id; monProfil=d.data();
    localStorage.setItem('otakus_id', d.id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
    afficherToast("🔑 Compte récupéré ! ID: "+d.id, "success");
};

// ================= LANCEMENT JEU =================
function lancerJeu() {
    if(!monProfil) return afficherToast("Erreur profil","error");
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo || "Inconnu";
    document.getElementById('avatarAffiche').innerText = monProfil.avatar || "🧝";
    document.getElementById('gradeAffiche').innerText = monProfil.grade || "Recrue";
    document.getElementById('nomClan').innerText = monProfil.clan || "Sans clan";
    majOrPrestige();
    mesHeros = monProfil.heros || [];
    demarrerEcoutes();
    if(monProfil.premiereConnexion) { lancerTutoriel(); updateDoc(doc(db,"membres",monId),{premiereConnexion:false}); }
    else changerOnglet('Village');
}
function majOrPrestige() {
    document.getElementById('orAffiche').innerText = monProfil.or||0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige||0;
    document.getElementById('ressMinerais').innerText = monProfil.materiaux?.minerai||0;
}

// ================= VILLAGE & RESSOURCES =================
async function afficherVillage() {
    let v = monProfil.village;
    if(!v) v = {taux:20, tresor:0, ressources:{bois:0,pierre:0,nourriture:0}, batiments:{}, enConstruction:null, territoire:0};
    if(v.enConstruction && v.enConstruction.fin <= Date.now()){
        const t = v.enConstruction.type; v.batiments[t]=(v.batiments[t]||0)+1; v.enConstruction=null;
        await updateDoc(doc(db,"membres",monId),{village:v}); afficherToast("✅ "+t+" terminé !","success");
    }
    document.getElementById('infosVillage').innerHTML = `🚩 ${v.territoire||0} | 💰 Trésor ${v.tresor||0}`;
    document.getElementById('ress-bois').innerText = v.ressources.bois||0;
    document.getElementById('ress-pierre').innerText = v.ressources.pierre||0;
    document.getElementById('ress-nourriture').innerText = v.ressources.nourriture||0;
    if(v.enConstruction && v.enConstruction.fin > Date.now()) document.getElementById('constructionEnCours').innerText = `🏗️ ${v.enConstruction.type} (${Math.ceil((v.enConstruction.fin-Date.now())/60000)}min)`;
    else document.getElementById('constructionEnCours').innerText = "";
    document.getElementById('tauxActuel').innerText = v.taux;
    let html=""; const icones = {caserne:"fa-helmet-battle", ferme:"fa-wheat-awn", mur:"fa-shield-halved", scierie:"fa-tree", carriere:"fa-hammer", temple:"fa-place-of-worship", hotelDeVille:"fa-city"};
    BATIMENTS.forEach(type => { const niv = v.batiments[type]||0; html += `<div class="batiment-card" onclick="construire('${type}')"><i class="fas ${icones[type]||'fa-cube'}" style="color:#fbbf24;font-size:22px;"></i><div>${type}</div><div style="font-size:11px;">Niv ${niv}</div></div>`; });
    document.getElementById('batimentsVillage').innerHTML = html;
}
window.construire = async function(type) {
    const v=monProfil.village; const niv=v.batiments[type]||0; if(niv>=5) return afficherToast("Niveau max !","error");
    const cout=COUT_BAT[type]||{or:100,bois:10,pierre:10}; const mult=niv+1;
    if((monProfil.or||0)<cout.or*mult) return afficherToast(`⛔ ${cout.or*mult}🪙`,"error");
    if(v.ressources.bois<(cout.bois||0)*mult) return afficherToast(`⛔ ${(cout.bois||0)*mult}🪵`,"error");
    if(v.ressources.pierre<(cout.pierre||0)*mult) return afficherToast(`⛔ ${(cout.pierre||0)*mult}🪨`,"error");
    monProfil.or-=cout.or*mult; v.ressources.bois-=(cout.bois||0)*mult; v.ressources.pierre-=(cout.pierre||0)*mult;
    v.enConstruction = {type, fin:Date.now()+30000}; await updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:v}); majOrPrestige(); afficherVillage(); afficherToast("🏗️ Construction lancée !","success");
};
window.collecterRessources = function(){ let v=monProfil.village; const gB=(v.batiments.scierie||0)*5,gP=(v.batiments.carriere||0)*5,gN=(v.batiments.ferme||0)*5; if(!gB&&!gP&&!gN) return afficherToast("Construis scierie/carrière/ferme","error"); v.ressources.bois+=gB;v.ressources.pierre+=gP;v.ressources.nourriture+=gN; updateDoc(doc(db,"membres",monId),{village:v}); afficherToast(`🌿 +${gB}🪵 +${gP}🪨 +${gN}🌾`,"success"); afficherVillage(); };
window.changerTaxe = function(v){ monProfil.village.taux=parseInt(v); updateDoc(doc(db,"membres",monId),{village:monProfil.village}); document.getElementById('tauxActuel').innerText=v; };
window.collecterImpots = function(){ const g=Math.round(20*monProfil.village.taux*0.8); monProfil.village.tresor=(monProfil.village.tresor||0)+g; updateDoc(doc(db,"membres",monId),{village:monProfil.village}); afficherToast(`💰 +${g}🪙`,"success"); afficherVillage(); };
window.activerCarteDePaix = function(){ if((monProfil.or||0)<50) return afficherToast("50🪙 requis","error"); monProfil.or-=50; monProfil.village.carteDePaix=Date.now()+86400000; updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherToast("🛡️ Bouclier 24h","success"); };

// ================= CALCUL DE FORCE (STATS) =================
function calculerForce(p, herosList) {
    const v = p.village || {}; const h = herosList || p.heros || [];
    let att = (v.batiments.caserne || 0) * 10; let def = (v.batiments.mur || 0) * 15; let hp = 100;
    h.forEach(hh => { att += hh.attaque || 0; def += hh.defense || 0; });
    if (p.inventaire && Array.isArray(p.inventaire)) {
        p.inventaire.forEach(itemId => {
            const eq = TOUS_EQUIPEMENTS.find(e => e.id === itemId);
            if (eq) { att += eq.att || 0; def += eq.def || 0; hp += eq.hp || 0; }
        });
    }
    return { attaque: Math.round(att), defense: Math.round(def), hp: Math.round(hp) };
}

// ================= INVENTAIRE CATÉGORISÉ =================
window.afficherInventaire = function(categorie) {
    const box = document.getElementById('inventaireContainer'); box.innerHTML = "";
    if(!monProfil.inventaire || monProfil.inventaire.length === 0) return box.innerHTML = "<p>Aucun objet.</p>";
    let aAfficher = monProfil.inventaire;
    if(categorie !== 'tout') aAfficher = aAfficher.filter(id => { const eq = TOUS_EQUIPEMENTS.find(e => e.id === id); if(categorie === 'guerre') return eq && eq.cat === 'guerre'; if(categorie === 'tactiques') return eq && eq.cat === 'tactiques'; return false; });
    let html = "";
    if(categorie === 'tout' || categorie === 'ressources') html += `<div class="shop-section-title"><i class="fas fa-cubes"></i> Ressources</div><div class="shop-item"><span>🪵 Bois: ${monProfil.village?.ressources?.bois||0}</span></div><div class="shop-item"><span>🪨 Pierre: ${monProfil.village?.ressources?.pierre||0}</span></div><div class="shop-item"><span>🌾 Nourriture: ${monProfil.village?.ressources?.nourriture||0}</span></div><div class="shop-item"><span>⛓️ Minerais: ${monProfil.materiaux?.minerai||0}</span></div><div class="shop-item"><span>🧵 Fibres: ${monProfil.materiaux?.fibre||0}</span></div>`;
    aAfficher.forEach(id => {
        const eq = TOUS_EQUIPEMENTS.find(e => e.id === id);
        if(eq) html += `<div class="shop-item"><span>${eq.nom} (${eq.rarete}) ${eq.passif||''}</span></div>`;
        else if(PARCHES.find(p => p.id === id)) { const p = PARCHES.find(p => p.id === id); html += `<div class="shop-item"><span>${p.nom} - ${p.desc}</span></div>`; }
    });
    box.innerHTML = html;
};

// ================= BOUTIQUE, FORGE & MARCHÉ =================
window.afficherBoutiqueComplete = function() {
    document.getElementById('panelForge').style.display = 'none'; document.getElementById('panelMarche').style.display = 'none';
    const box = document.getElementById('sectionBoutiqueContainer'); box.innerHTML = `
        <div class="shop-section-title"><i class="fas fa-sword"></i> ⚔️ Armurerie</div>
        ${TOUS_EQUIPEMENTS.filter(e => e.type === 'weapon').map(e => `<div class="shop-item"><span>${e.nom} (${e.rarete}) - ${e.passif||'Aucun'}</span><button onclick="acheterObjet('${e.id}', ${e.prix})">${e.prix}🪙</button></div>`).join('')}
        <div class="shop-section-title"><i class="fas fa-shield-alt"></i> 🛡️ Armures</div>
        ${TOUS_EQUIPEMENTS.filter(e => e.type === 'armor').map(e => `<div class="shop-item"><span>${e.nom} (${e.rarete}) - ${e.passif||'Aucun'}</span><button onclick="acheterObjet('${e.id}', ${e.prix})">${e.prix}🪙</button></div>`).join('')}
        <div class="shop-section-title"><i class="fas fa-helmet-safety"></i> 🪖 Casques & Montures</div>
        ${TOUS_EQUIPEMENTS.filter(e => e.type === 'head' || e.type === 'mount').map(e => `<div class="shop-item"><span>${e.nom} (${e.rarete}) - ${e.passif||'Aucun'}</span><button onclick="acheterObjet('${e.id}', ${e.prix})">${e.prix}🪙</button></div>`).join('')}
        <div class="shop-section-title"><i class="fas fa-gem"></i> 💍 Accessoires & Bottes</div>
        ${TOUS_EQUIPEMENTS.filter(e => e.type === 'accessory' || e.type === 'boots').map(e => `<div class="shop-item"><span>${e.nom} (${e.rarete}) - ${e.passif||'Aucun'}</span><button onclick="acheterObjet('${e.id}', ${e.prix})">${e.prix}🪙</button></div>`).join('')}
        <div class="shop-section-title"><i class="fas fa-cubes"></i> 📦 Ressources</div>
        <div class="shop-item"><span>100 🪵 Bois</span><button onclick="acheterRessource('bois',100,50)">50🪙</button></div>
        <div class="shop-item"><span>100 🪨 Pierre</span><button onclick="acheterRessource('pierre',100,50)">50🪙</button></div>
        <div class="shop-item"><span>10 ⛓️ Minerais</span><button onclick="acheterRessource('minerai',10,60)">60🪙</button></div>
        <div class="shop-item"><span>10 🧵 Fibres</span><button onclick="acheterRessource('fibre',10,60)">60🪙</button></div>
        <div class="shop-section-title"><i class="fas fa-scroll"></i> 📜 Tactiques</div>
        ${PARCHES.map(p => `<div class="shop-item"><span>${p.nom} - ${p.desc}</span><button onclick="acheterObjet('${p.id}', ${p.prix})">${p.prix}🪙</button></div>`).join('')}
        <div class="shop-section-title"><i class="fas fa-shield-alt"></i> 🛡️ Défense</div>
        <div class="shop-item"><span>🛡️ Bouclier 24h</span><button onclick="activerCarteDePaix()">50🪙</button></div>
    `;
};
window.acheterObjet = async function(id, prix) {
    if((monProfil.or||0) < prix) return afficherToast("Pas assez d'or","error");
    if(monProfil.inventaire && monProfil.inventaire.includes(id)) return afficherToast("Déjà possédé","error");
    monProfil.or -= prix; if(!monProfil.inventaire) monProfil.inventaire = []; monProfil.inventaire.push(id);
    await updateDoc(doc(db,"membres",monId),{or:monProfil.or,inventaire:monProfil.inventaire}); majOrPrestige(); afficherBoutiqueComplete(); afficherToast("🛒 Objet acheté !","success");
};
window.acheterRessource = async function(type, qte, prix) {
    if((monProfil.or||0)<prix) return afficherToast("Pas assez d'or","error");
    monProfil.or-=prix;
    if(type === 'minerai' || type === 'fibre') { if(!monProfil.materiaux) monProfil.materiaux = {}; monProfil.materiaux[type] = (monProfil.materiaux[type]||0) + qte; await updateDoc(doc(db,"membres",monId),{or:monProfil.or,materiaux:monProfil.materiaux}); }
    else { if(!monProfil.village) monProfil.village = {ressources:{bois:0,pierre:0,nourriture:0}}; monProfil.village.ressources[type] = (monProfil.village.ressources[type]||0) + qte; await updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); }
    majOrPrestige(); afficherToast(`📦 +${qte} ${type}`,"success"); afficherBoutiqueComplete();
};

// ================= FORGE =================
window.ouvrirForge = function() {
    document.getElementById('sectionBoutiqueContainer').innerHTML = ""; document.getElementById('panelForge').style.display = 'block'; document.getElementById('panelMarche').style.display = 'none';
    const box = document.getElementById('forgeInterface'); let html = `<p>Matériaux : ⛓️ ${(monProfil.materiaux?.minerai||0)} | 🧵 ${(monProfil.materiaux?.fibre||0)}</p>`;
    ['commun','rare','epic','legendary','mythic'].forEach(r => {
        const cout = MATERIAUX_FORGE[r];
        html += `<div class="shop-item"><span>Forger un objet ${r.charAt(0).toUpperCase()+r.slice(1)}</span><button onclick="forgerObjet('${r}')">${cout.minerai}⛓️ ${cout.fibre}🧵 ${cout.poussiere? ' + 1 '+cout.poussiere : ''}</button></div>`;
    });
    html += `<hr><h4>Désenchanter</h4>`;
    (monProfil.inventaire||[]).forEach(id => {
        const eq = TOUS_EQUIPEMENTS.find(e => e.id === id);
        if(eq) html += `<div class="shop-item"><span>${eq.nom}</span><button onclick="desenchanter('${eq.id}')">Recycler</button></div>`;
    });
    box.innerHTML = html;
};
window.forgerObjet = async function(rarete) {
    const cout = MATERIAUX_FORGE[rarete]; const minerai = monProfil.materiaux?.minerai||0; const fibre = monProfil.materiaux?.fibre||0;
    if(minerai < cout.minerai || fibre < cout.fibre) return afficherToast("Matériaux insuffisants","error");
    if(cout.poussiere && (!monProfil.materiaux || !monProfil.materiaux[cout.poussiere] || monProfil.materiaux[cout.poussiere] < 1)) return afficherToast("Poussière manquante","error");
    const possibles = TOUS_EQUIPEMENTS.filter(e => e.rarete.toLowerCase() === rarete);
    if(possibles.length === 0) return afficherToast("Aucun objet","error");
    const choisi = possibles[Math.floor(Math.random() * possibles.length)];
    monProfil.materiaux.minerai -= cout.minerai; monProfil.materiaux.fibre -= cout.fibre; if(cout.poussiere) monProfil.materiaux[cout.poussiere] -= 1;
    if(!monProfil.inventaire) monProfil.inventaire = []; monProfil.inventaire.push(choisi.id);
    await updateDoc(doc(db,"membres",monId),{materiaux:monProfil.materiaux,inventaire:monProfil.inventaire}); afficherToast(`🔨 ${choisi.nom} (${rarete}) forgé !`,"success"); ouvrirForge();
};
window.desenchanter = async function(id) {
    const eq = TOUS_EQUIPEMENTS.find(e => e.id === id); if(!eq) return;
    const rendu = MATERIAUX_FORGE[eq.rarete.toLowerCase()] || MATERIAUX_FORGE.commun;
    if(!monProfil.materiaux) monProfil.materiaux = {};
    monProfil.materiaux.minerai = (monProfil.materiaux.minerai||0) + Math.floor(rendu.minerai/2);
    monProfil.materiaux.fibre = (monProfil.materiaux.fibre||0) + Math.floor(rendu.fibre/2);
    monProfil.inventaire = monProfil.inventaire.filter(i => i !== id);
    await updateDoc(doc(db,"membres",monId),{materiaux:monProfil.materiaux,inventaire:monProfil.inventaire}); afficherToast("♻️ Désenchanté !","success"); ouvrirForge();
};

// ================= MARCHÉ =================
window.ouvrirMarche = function() {
    document.getElementById('panelForge').style.display = 'none'; document.getElementById('panelMarche').style.display = 'block'; document.getElementById('sectionBoutiqueContainer').innerHTML = "";
    document.getElementById('marcheInterface').innerHTML = `<p>Marché (simulé). Mettez vos ressources en vente.</p><div class="shop-item"><span>Vendre 100 bois</span><button onclick="mettreEnVente('bois',100,30)">30🪙</button></div><div class="shop-item"><span>Vendre 100 pierre</span><button onclick="mettreEnVente('pierre',100,30)">30🪙</button></div>`;
};
window.mettreEnVente = async function(type, qte, prix) {
    const res = monProfil.village?.ressources[type]; if(!res || res < qte) return afficherToast("Pas assez de ressources","error");
    monProfil.village.ressources[type] -= qte; monProfil.or += prix;
    await updateDoc(doc(db,"membres",monId),{village:monProfil.village,or:monProfil.or}); majOrPrestige(); afficherVillage(); afficherToast(`💸 Vendu ${qte} ${type} pour ${prix}🪙`,"success"); ouvrirMarche();
};

// ================= COMBAT (PvP & PvE) =================
window.chargerAdversaires = function() {
    const box = document.getElementById('listeAdversaires'); box.innerHTML = "";
    (tousJoueurs||[]).slice(0,15).forEach(j => box.innerHTML += `<div class="membreLigne"><span>${j.avatar||""} ${j.pseudo}</span><button onclick="combattre('${j.id}', false)">⚔️</button></div>`);
    pnjPool.slice(0,5).forEach(p => box.innerHTML += `<div class="membreLigne"><span>🤖 ${p.pseudo} (IA)</span><button onclick="combattre('${p.id}', true)">⚔️</button></div>`);
};
window.combattre = async function(idAdv, estPNJ) {
    if(combatInterval) clearInterval(combatInterval);
    let adv; if(estPNJ) adv = pnjPool.find(p=>p.id===idAdv); else { const s=await getDoc(doc(db,"membres",idAdv)); adv=s.data(); }
    if(!adv) return afficherToast("Introuvable","error");
    document.getElementById('panelCombat').style.display='flex';
    document.getElementById('avatarJoueur').innerText = monProfil.avatar; document.getElementById('nomJoueur').innerText = monProfil.pseudo;
    document.getElementById('avatarAdv').innerText = adv.avatar||"👹"; document.getElementById('nomAdv').innerText = adv.pseudo;
    document.getElementById('pvJoueur').style.width='100%'; document.getElementById('pvAdv').style.width='100%';
    document.getElementById('combatLog').innerText = "⚔️ Le duel commence !";
    const statsMoi = calculerForce(monProfil, mesHeros);
    const statsAdv = estPNJ ? {attaque:adv.prestige||100, defense:adv.prestige||100, hp:500} : calculerForce(adv, adv.heros||[]);
    let pvMoi = statsMoi.hp || 100, pvAdv = statsAdv.hp || 100; let tour=0; let log="";
    combatInterval = setInterval(async ()=>{
        tour++; if(tour>6){ clearInterval(combatInterval); return finCombat(pvAdv<=0); }
        const dMoi = Math.max(5, statsMoi.attaque - statsAdv.defense*0.2 + Math.floor(Math.random()*20));
        const dAdv = Math.max(5, statsAdv.attaque - statsMoi.defense*0.2 + Math.floor(Math.random()*20));
        pvAdv = Math.max(0, pvAdv - dMoi); pvMoi = Math.max(0, pvMoi - dAdv);
        document.getElementById('pvAdv').style.width = (pvAdv/(statsAdv.hp||100)*100)+'%';
        document.getElementById('pvJoueur').style.width = (pvMoi/(statsMoi.hp||100)*100)+'%';
        log += `Round ${tour} : -${dMoi}❤️ / -${dAdv}❤️\n`; document.getElementById('combatLog').innerText = log;
        if(pvMoi<=0 || pvAdv<=0){ clearInterval(combatInterval); return finCombat(pvAdv<=0); }
    }, 800);
    function finCombat(victoire){
        let msg="";
        if(victoire){ const gOr = 20+Math.floor(Math.random()*20); monProfil.or+=gOr; monProfil.prestige+=5; if(!estPNJ) updateDoc(doc(db,"membres",idAdv),{prestige: Math.max(0,(adv.prestige||0)-5)}); msg = `🏆 VICTOIRE ! +${gOr}🪙`; }
        else { monProfil.prestige = Math.max(0,(monProfil.prestige||0)-5); msg = `💀 DÉFAITE... -5🏆`; }
        updateDoc(doc(db,"membres",monId),{or:monProfil.or,prestige:monProfil.prestige}); majOrPrestige(); afficherToast(msg, victoire?"success":"error"); document.getElementById('combatLog').innerText += `\n${msg}`;
    }
};
window.fermerCombat = function(){ clearInterval(combatInterval); document.getElementById('panelCombat').style.display='none'; };
window.lancerCombatSolo = function(){ if(pnjPool.length===0) return afficherToast("Aucune IA","error"); combattre(pnjPool[Math.floor(Math.random()*pnjPool.length)].id, true); };
window.attaquerBoss = function() {
    let pv = parseInt(document.getElementById('bossPV').innerText)||5000; pv = Math.max(0,pv-50);
    document.getElementById('bossPV').innerText = pv; document.getElementById('remplissageBoss').style.width = (pv/5000*100)+'%';
    if(pv<=0){ afficherToast("🐉 Le Fléau est vaincu !","success"); document.getElementById('bossPV').innerText="5000"; document.getElementById('remplissageBoss').style.width="100%"; }
};

// ================= CARTE & TERRITOIRES =================
function dessinerCarte() {
    const canvas = document.getElementById('carteCanvas'); if(!canvas) return;
    const ctx = canvas.getContext('2d'); canvas.width = canvas.offsetWidth*2; canvas.height = canvas.offsetHeight*2; ctx.scale(2,2);
    const W = canvas.width/2, H = canvas.height/2; ctx.clearRect(0,0,W,H); const cols=8, rows=5, taille=Math.min(W/cols,H/rows);
    const couleurs = {"Sans clan":"#6b7280","Dragon":"#dc2626","Lune":"#818cf8","Sabre":"#1f2937","Phénix":"#fbbf24"};
    if(territoires.length===0){
        for(let y=0; y<rows; y++) for(let x=0; x<cols; x++){ const c=Object.keys(couleurs)[Math.floor(Math.random()*Object.keys(couleurs).length)]; ctx.fillStyle=couleurs[c]; ctx.fillRect(x*taille,y*taille,taille-2,taille-2); }
    } else {
        territoires.forEach((t,i)=>{ const y=Math.floor(i/cols), x=i%cols; if(y>=rows) return; ctx.fillStyle=couleurs[t.clan]||"#6b7280"; ctx.fillRect(x*taille,y*taille,taille-2,taille-2); });
    }
}
window.explorerNouveauTerritoire = function() {
    if((monProfil.or||0)<50) return afficherToast("50🪙 requis","error");
    monProfil.or-=50; territoires.push({nom:`Territoire ${territoires.length+1}`, clan:monProfil.clan||"Sans clan"});
    monProfil.village.territoire=(monProfil.village.territoire||0)+1;
    updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherVillage(); dessinerCarte(); afficherToast("🧭 Nouveau territoire !","success");
};

// ================= CLAN & ALLIANCE =================
window.chargerMembresClan = function() {
    if(!monProfil.clan || monProfil.clan==="Sans clan") return document.getElementById('zoneSansClan').style.display='block';
    document.getElementById('zoneSansClan').style.display='none'; document.getElementById('zoneAvecClan').style.display='block';
    onSnapshot(query(collection(db,"membres"), where("clan","==",monProfil.clan)), (snap)=>{
        const box=document.getElementById('listeMembresClan'); box.innerHTML="";
        const estChef = monProfil.grade==="Chef"||monProfil.grade==="Vice-Chef";
        snap.forEach(d=>{
            const m=d.data(); const enLigne = m.lastSeen&&(Date.now()-m.lastSeen<60000);
            let ligne = `<div class="membreLigne"><span>${enLigne?"🟢":"⚪"} ${m.avatar||""} ${m.pseudo} — ${m.grade||"Recrue"}</span>`;
            if(estChef&&d.id!==monId) ligne += `<button onclick="promouvoir('${d.id}')">⬆️</button>`;
            ligne += `</div>`; box.innerHTML += ligne;
        });
        document.getElementById('boutiqueClanBox').innerHTML = `<div class="shop-item"><span>🛡️ Bouclier Clan</span><button onclick="acheterObjetClan('bouclier')">50 Éclats</button></div>`;
    });
};
window.promouvoir = async function(idCible){ const snap=await getDoc(doc(db,"membres",idCible)); const data=snap.data(); const idx=GRADES_CLAN.indexOf(data.grade||"Recrue"); const nouveau=GRADES_CLAN[Math.min(idx+1,GRADES_CLAN.length-1)]; await updateDoc(doc(db,"membres",idCible),{grade:nouveau}); afficherToast(`🎖️ ${data.pseudo} promu ${nouveau}!`,"success"); };
window.creerClan = function(){ const n=prompt("Nom du clan ?"); if(n){ monProfil.clan=n; monProfil.grade="Chef"; updateDoc(doc(db,"membres",monId),{clan:n,grade:"Chef"}); afficherToast("Clan créé !","success"); location.reload(); } };
window.quitterClan = function(){ if(confirm("Quitter ?")){ monProfil.clan="Sans clan"; monProfil.grade="Recrue"; updateDoc(doc(db,"membres",monId),{clan:"Sans clan",grade:"Recrue"}); afficherToast("Clan quitté","info"); location.reload(); } };
window.envoyerMessageClan = async function(){ const i=document.getElementById('messageClanInput'); if(i.value.trim()){ await addDoc(collection(db,"messagesClan"),{pseudo:monProfil.pseudo,clan:monProfil.clan,texte:i.value.trim(),date:serverTimestamp()}); i.value=""; } };
window.creerAlliance = async function(){ if(!monProfil.clan||monProfil.clan==="Sans clan") return afficherToast("Vous devez avoir un clan","error"); const n=prompt("Nom de l'alliance :"); if(!n) return; await addDoc(collection(db,"alliances"),{nom:n,clans:[monProfil.clan],chef:monProfil.pseudo}); afficherToast(`🤝 Alliance ${n} créée !`,"success"); location.reload(); };
window.quitterAlliance = function(){ afficherToast("🚪 Alliance quittée","info"); };

// ================= CAPTURE, FIDÉLITÉ & CIMETIÈRE =================
window.capturerHeros = function(herosEnnemi){ if(!monProfil.geole) monProfil.geole=[]; monProfil.geole.push({hero:herosEnnemi,fidelite:30}); afficherToast("⛓️ Héros capturé ! Fidélité:30","success"); updateDoc(doc(db,"membres",monId),{geole:monProfil.geole}); };
window.cimetiere = function(){ afficherToast("💀 Héros tombé. Reviendra dans 4h (Simulé).","info"); };

// ================= STATS & CLASSEMENTS =================
window.afficherStats = function(){ const f=calculerForce(monProfil,mesHeros); document.getElementById('statsBox').innerHTML=`<div>💪 Attaque: ${f.attaque}</div><div>🛡️ Défense: ${f.defense}</div><div>❤️ PV: ${f.hp}</div><div>🏆 Prestige: ${monProfil.prestige||0}</div><div>💰 Or: ${monProfil.or||0}</div>`; };
window.afficherClassementPar = async function(critere){
    const box=document.getElementById('classementDynamique'); box.innerHTML="<p>🏆 Classement...</p>";
    const snap=await getDocs(collection(db,"membres")); let tous=[]; snap.forEach(d=>tous.push({id:d.id,...d.data()}));
    if(critere==='prestige') tous.sort((a,b)=>(b.prestige||0)-(a.prestige||0));
    else if(critere==='force'){ tous.forEach(m=>m._force=calculerForce(m,m.heros||[]).attaque); tous.sort((a,b)=>(b._force||0)-(a._force||0)); }
    tous.slice(0,10).forEach((m,i)=>{ box.innerHTML+=`<div class="membreLigne"><span>#${i+1} ${m.avatar||""} ${m.pseudo}</span><span>${m.prestige||0}🏆</span></div>`; });
};

// ================= TUTORIEL & CODEX =================
const TUTOS = ["Bienvenue, futur conquérant. Je suis Samuel, le dernier gardien. Il y a 1000 ans, 5 Anciens Gardiens scellèrent le monde...","Rejoins ou crée un clan. Le clan est ta famille.","Bâtis ton village. Produis du bois, de la pierre et de la nourriture."];
let tutoStep=0;
window.lancerTutoriel = function(){ tutoStep=0; document.getElementById('panelTutoriel').style.display='flex'; updateTuto(); };
window.lancerTutorielManuel = function(){ lancerTutoriel(); };
function updateTuto(){ document.getElementById('tutorielTexte').innerText = TUTOS[tutoStep]; document.getElementById('tutoStep').innerText = `${tutoStep+1}/${TUTOS.length}`; document.getElementById('tutoBar').style.width = `${((tutoStep+1)/TUTOS.length)*100}%`; document.getElementById('btnTutoPrev').style.display = tutoStep===0?'none':'inline-block'; document.getElementById('btnTutoNext').style.display = tutoStep===TUTOS.length-1?'none':'inline-block'; document.getElementById('btnTutoFin').style.display = tutoStep===TUTOS.length-1?'inline-block':'none'; }
window.suivantTutoriel = function(){ if(tutoStep<TUTOS.length-1){tutoStep++; updateTuto();} };
window.precedentTutoriel = function(){ if(tutoStep>0){tutoStep--; updateTuto();} };
window.finirTutoriel = function(){ document.getElementById('panelTutoriel').style.display='none'; monProfil.or=(monProfil.or||0)+50; updateDoc(doc(db,"membres",monId),{or:monProfil.or}); majOrPrestige(); afficherToast("🏆 Tutoriel terminé ! +50🪙","success"); changerOnglet('Village'); };
window.ouvrirCodex = function(){ document.getElementById('panelCodex').style.display='flex'; };
window.fermerCodex = function(){ document.getElementById('panelCodex').style.display='none'; };

// ================= PANEL ADMIN =================
window.dieuResetPNJ = function(){ afficherToast("⚡ Légats réincarnés avec force 800","success"); };
window.dieuFrapperBoss = function(){ afficherToast("🐉 Le Fléau est exécuté !","success"); };
window.dieuDelugeOr = function(){ afficherToast("💰 Déluge d'Or distribué !","success"); };
window.dieuGuerreImmediate = function(){ afficherToast("🔥 Guerre des Royaumes déclenchée !","info"); };

// ================= ÉCOUTES FIREBASE =================
function demarrerEcoutes() {
    if(monProfil.clan && monProfil.clan !== "Sans clan") onSnapshot(query(collection(db,"messagesClan"), where("clan","==",monProfil.clan), orderBy("date")), (snap)=>{ const box=document.getElementById('chatClanBox'); if(box){ box.innerHTML=""; snap.forEach(d=>{const m=d.data(); box.innerHTML+=`<p><b>${m.pseudo}:</b> ${m.texte}</p>`;}); box.scrollTop=box.scrollHeight; } });
    onSnapshot(collection(db,"membres"), (snap)=>{ tousJoueurs=[]; snap.forEach(d=>{ if(d.id!==monId) tousJoueurs.push({id:d.id,...d.data()}); }); chargerAdversaires(); });
}

// ================= INITIALISATION =================
if(localStorage.getItem('otakus_id')) document.getElementById('codeInput').value = localStorage.getItem('otakus_id');
pnjPool = Array.from({length:10}, (_,i) => ({ id:`PNJ_${i}`, pseudo:`Légat ${i+1}`, clan:"Errants", prestige:800+Math.floor(Math.random()*200), estPNJ:true }));
console.log("Empire des Otakus - Version ULTIME déployée avec succès !");
