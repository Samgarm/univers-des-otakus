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

// ---------- CONSTANTES ----------
const CODE_COMMUN = "OTAKU2026";
const CLANS_DEFAUT = ["Dragon Écarlate", "Lune d'Argent", "Sabre Noir", "Phénix Doré"];
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀","🤖","🧟","👾"];
const GRADES = ["Recrue", "Officier", "Lieutenant", "Commandant", "Bras droit"];
const CLAN_COLORS = { "Dragon Écarlate": "#dc2626", "Lune d'Argent": "#818cf8", "Sabre Noir": "#1f2937", "Phénix Doré": "#fbbf24", "Sans clan": "#6b7280", "Fondateur": "#10b981" };
const BATIMENTS = ["route","caserne","hotelDeVille","senat","ferme","carriere","scierie","mur","temple"];
const COUT_BATIMENTS = { route:{or:100,bois:20,pierre:30}, caserne:{or:300,bois:40,pierre:60}, hotelDeVille:{or:600,bois:50,pierre:100}, senat:{or:1000,bois:60,pierre:120}, ferme:{or:150,bois:30,pierre:10}, carriere:{or:150,bois:30,pierre:0}, scierie:{or:150,bois:0,pierre:20}, mur:{or:400,bois:20,pierre:80}, temple:{or:350,bois:40,pierre:50} };
const DUREES = [2,4,8,15,30,60,120,240,480,1440];

const HEROS = [
    { etoiles:1, nom:"Guerrier de Fer", attaque:15, defense:8, prix:150, competence:"+5% Attaque", icon:"⚔️" },
    { etoiles:1, nom:"Voleur des Bois", attaque:10, defense:10, prix:120, competence:"+10% Récolte Bois", icon:"🌲" },
    { etoiles:2, nom:"Chevalier d'Argent", attaque:30, defense:25, prix:400, competence:"+10% Défense", icon:"🛡️" },
    { etoiles:2, nom:"Prêtresse de la Lune", attaque:15, defense:35, prix:380, competence:"+15% Vitesse Construction", icon:"🌙" },
    { etoiles:3, nom:"Mage de l'Ombre", attaque:50, defense:20, prix:900, competence:"+20% Dégâts contre Boss", icon:"🔮" },
    { etoiles:3, nom:"Paladin Sacré", attaque:40, defense:50, prix:1000, competence:"+15% Récolte Pierre", icon:"⚜️" },
    { etoiles:4, nom:"Assassin Royale", attaque:90, defense:15, prix:2200, competence:"Attaque furtive (10% chance double dégâts)", icon:"🗡️" },
    { etoiles:5, nom:"Dragon d'Émeraude", attaque:200, defense:120, prix:6000, competence:"+30% Attaque & Défense Totale", icon:"🐉" },
    { etoiles:5, nom:"Seigneur des Abysses", attaque:150, defense:180, prix:5500, competence:"Vol d'or ennemi +20%", icon:"🌊" }
];
const OBJETS_GUERRE = [ { id:"epée", nom:"Épée Berserk", prix:80, effet:"Attaque +20", icon:"⚔️" }, { id:"bouclier", nom:"Bouclier Ancestral", prix:100, effet:"Défense +30", icon:"🛡️" }, { id:"casque", nom:"Casque de l'Ombre", prix:150, effet:"Pillage +15%", icon:"🪖" } ];
const OBJETS_TRESOR = [ { id:"pierrephilo", nom:"Pierre Philosophale", prix:250, effet:"Revenu travaux +50%", icon:"💎" }, { id:"codex", nom:"Codex des Anciens", prix:500, effet:"Prestige +50", icon:"📜" } ];
const OBJETS_DIPLO = [ { id:"traite", nom:"Traité de Paix", prix:200, effet:"Protection contre raids 48h", icon:"🕊️" } ];

let monId = "", monProfil = {}, mesHeros = [], pnjPool = [], CLANS = [...CLANS_DEFAUT], tousTerritoires = [];
let combatInterval = null, ecouteurs = [];

// ---------- TOAST ----------
function afficherToast(txt, type="info") {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = txt;
    c.appendChild(t);
    setTimeout(()=>t.remove(), 3500);
}

// ---------- NAVIGATION ----------
window.changerOnglet = function(nom) {
    document.querySelectorAll('.onglet-container').forEach(el => el.style.display = 'none');
    document.getElementById('onglet'+nom).style.display = 'block';
    document.querySelectorAll('#navFixe button').forEach(b => b.classList.remove('active'));
    const idx = ['Village','Clan','Monde','Boutique','Profil'].indexOf(nom);
    if(idx>-1) document.querySelector(`#navFixe button:nth-child(${idx+1})`).classList.add('active');
    if(nom==='Village') afficherVillage();
    if(nom==='Clan') afficherGestionClan();
    if(nom==='Monde') { afficherAdversaires(); afficherBoss(); dessinerCarte(); }
    if(nom==='Boutique') afficherBoutique();
    if(nom==='Profil') { afficherStats(); afficherClassementPar('prestige'); }
};

// ---------- AUTH ----------
window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    if(!code) return document.getElementById('messageConnexion').innerText = "Entrez un code.";
    try {
        const snap = await getDoc(doc(db, "membres", code));
        if(snap.exists() && !snap.data().banni) {
            monId = code; monProfil = snap.data(); document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
        } else document.getElementById('messageConnexion').innerText = snap.exists() ? "Compte banni." : "Code invalide.";
    } catch(e) { document.getElementById('messageConnexion').innerText = "Erreur: "+e.message; }
};
window.ouvrirInscription = function(){ document.getElementById('connexion').style.display='none'; document.getElementById('inscription').style.display='block'; };
window.retourConnexion = function(){ document.querySelectorAll('.auth-box').forEach(b=>b.style.display='none'); document.getElementById('connexion').style.display='block'; };

window.validerInscription = async function() {
    const codeS = document.getElementById('codeInscriptionInput').value.trim();
    const pseudo = document.getElementById('pseudoInscriptionInput').value.trim();
    const specialite = document.getElementById('specialiteInscriptionInput').value;
    if(codeS !== CODE_COMMUN) return document.getElementById('messageInscription').innerText = "Code invalide.";
    if(!pseudo) return document.getElementById('messageInscription').innerText = "Choisis un pseudo.";
    const check = await getDocs(query(collection(db,"membres"), where("pseudo","==",pseudo)));
    if(!check.empty) return document.getElementById('messageInscription').innerText = "Pseudo déjà pris.";
    const id = "M"+Date.now();
    const data = { pseudo, specialite, clan:"Sans clan", role:"Membre", grade:"Recrue", or:200, prestige:0, avatar:window._avatar||"🧝", heros:[], inventaire:[], village:{taux:20, tresor:0, ressources:{bois:0,pierre:0,nourriture:0}, batiments:{}, enConstruction:null, territoire:0}, premiereConnexion:true, codeRecuperation:String(Math.floor(100000+Math.random()*900000)) };
    await setDoc(doc(db,"membres",id), data);
    monId = id; monProfil = data; localStorage.setItem('otakus_id', id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
};
window.recupererCompte = async function() {
    const code = document.getElementById('codeRecuperationInput').value.trim();
    const snap = await getDocs(query(collection(db,"membres"), where("codeRecuperation","==",code)));
    if(snap.empty) return document.getElementById('messageRecuperation').innerText = "Code introuvable.";
    const d = snap.docs[0]; monId=d.id; monProfil=d.data();
    localStorage.setItem('otakus_id', d.id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
};

// ---------- LANCEMENT JEU ----------
function lancerJeu() {
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo;
    document.getElementById('avatarAffiche').innerText = monProfil.avatar;
    document.getElementById('gradeAffiche').innerText = monProfil.grade;
    document.getElementById('clanAffiche').innerHTML = `<i class="fas fa-flag"></i> ${monProfil.clan||"Aucun"}`;
    majOrPrestige(); mesHeros = monProfil.heros || [];
    demarrerToutesEcoutes();
    if(monProfil.role === "Fondateur") document.getElementById('panelAdminDieu').style.display = 'block';
    if(monProfil.premiereConnexion) { lancerTutoriel(); updateDoc(doc(db,"membres",monId), {premiereConnexion:false}); }
    else changerOnglet('Village');
}
function majOrPrestige() {
    document.getElementById('orAffiche').innerText = monProfil.or || 0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;
}

// ---------- SYSTÈME VILLAGE ----------
function niveauGlobalVillage(b){ return Object.values(b).reduce((s,n)=>s+n,0); }
function nomEvolution(n){ if(n<10) return {t:"🏕️ Village",c:"#9ca3af"}; if(n<25) return {t:"🏙️ Ville",c:"#fbbf24"}; if(n<45) return {t:"🏰 Forteresse",c:"#dc2626"}; return {t:"👑 Capitale",c:"#a855f7"}; }

async function afficherVillage() {
    let v = monProfil.village;
    if(!v) v = {taux:20, tresor:0, ressources:{bois:0,pierre:0,nourriture:0}, batiments:{}, enConstruction:null, territoire:0};
    if(v.enConstruction && v.enConstruction.fin <= Date.now()){
        const t = v.enConstruction.type; v.batiments[t]=(v.batiments[t]||0)+1; v.enConstruction=null;
        await updateDoc(doc(db,"membres",monId),{village:v}); afficherToast("✅ "+t+" terminé !","success");
    }
    const evo = nomEvolution(niveauGlobalVillage(v.batiments));
    document.getElementById('evolutionVillage').innerText = evo.t;
    document.getElementById('evolutionVillage').style.color = evo.c;
    document.getElementById('infosVillage').innerText = `🚩 ${v.territoire||0} | 💰 Trésor ${v.tresor||0}`;
    document.getElementById('ress-bois').innerText = v.ressources.bois||0;
    document.getElementById('ress-pierre').innerText = v.ressources.pierre||0;
    document.getElementById('ress-nourriture').innerText = v.ressources.nourriture||0;
    if(v.enConstruction && v.enConstruction.fin > Date.now()) document.getElementById('constructionEnCours').innerText = `🏗️ ${v.enConstruction.type} (${Math.ceil((v.enConstruction.fin-Date.now())/60000)}min)`;
    else document.getElementById('constructionEnCours').innerText = "";
    document.getElementById('tauxActuel').innerText = v.taux;

    let html = ""; 
    BATIMENTS.forEach(type => {
        const niv = v.batiments[type]||0; 
        const icones = {route:"fa-road",caserne:"fa-helmet-battle",hotelDeVille:"fa-city",senat:"fa-landmark",ferme:"fa-wheat-awn",carriere:"fa-hammer",scierie:"fa-tree",mur:"fa-shield-halved",temple:"fa-place-of-worship"};
        html += `<div class="batiment-card" onclick="detailBatiment('${type}')"><i class="fas ${icones[type]||'fa-ghost'}" style="color:#fbbf24;font-size:22px;"></i><div style="font-size:12px;">${type}</div><span style="font-size:11px;color:#9ca3af;">Niv ${niv}</span></div>`;
    });
    document.getElementById('batimentsVillage').innerHTML = html;
}

window.detailBatiment = function(type) {
    const v = monProfil.village; const niv = v.batiments[type]||0;
    if(niv >= 10) return afficherToast("Niveau max atteint !","error");
    const m = COUT_BATIMENTS[type]; const mult = niv+1; const cout = {or:m.or*mult, bois:(m.bois||0)*mult, pierre:(m.pierre||0)*mult};
    const duree = DUREES[niv]||60;
    if(confirm(`Construire ${type} niveau ${niv+1} ?\nCoût: ${cout.or}🪙 ${cout.bois}🪵 ${cout.pierre}🪨\nDurée: ${duree}min`)) {
        if((monProfil.or||0)<cout.or) return afficherToast("Pas assez d'or","error");
        if(v.ressources.bois<cout.bois) return afficherToast("Pas assez de bois","error");
        if(v.ressources.pierre<cout.pierre) return afficherToast("Pas assez de pierre","error");
        monProfil.or-=cout.or; v.ressources.bois-=cout.bois; v.ressources.pierre-=cout.pierre;
        v.enConstruction = {type, fin:Date.now()+duree*60000};
        updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:v}); majOrPrestige(); afficherVillage(); afficherToast("Construction lancée !","success");
    }
};

window.collecterRessources = function(){
    let v=monProfil.village; const gB=(v.batiments.scierie||0)*15, gP=(v.batiments.carriere||0)*15, gN=(v.batiments.ferme||0)*15;
    if(!gB&&!gP&&!gN) return afficherToast("Construis une scierie, carrière ou ferme","error");
    v.ressources.bois+=gB; v.ressources.pierre+=gP; v.ressources.nourriture+=gN;
    updateDoc(doc(db,"membres",monId),{village:v}); afficherToast(`+${gB}🪵 +${gP}🪨 +${gN}🌾`,"success"); afficherVillage();
};
window.changerTaxe = function(v){ monProfil.village.taux=parseInt(v); updateDoc(doc(db,"membres",monId),{village:monProfil.village}); document.getElementById('tauxActuel').innerText=v; };
window.collecterImpots = function(){ const g=Math.round(20*monProfil.village.taux*0.8); monProfil.village.tresor=(monProfil.village.tresor||0)+g; updateDoc(doc(db,"membres",monId),{village:monProfil.village}); afficherToast(`+${g}🪙 au trésor`,"success"); afficherVillage(); };
window.activerCarteDePaix = function(){ if((monProfil.or||0)<50) return afficherToast("50🪙 requis","error"); monProfil.or-=50; monProfil.village.carteDePaix=Date.now()+86400000; updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherToast("🕊️ Paix 24h","success"); };

// ---------- STATS MILITAIRES ----------
function calculerForceArmée(p, herosList) {
    const v = p.village||{}; const h = herosList||p.heros||[];
    let att = (v.batiments.caserne||0)*15 + (v.batiments.mur||0)*5;
    let def = (v.batiments.mur||0)*20 + (v.batiments.caserne||0)*5;
    h.forEach(hh => { att += hh.attaque||0; def += hh.defense||0; });
    (p.inventaire||[]).forEach(obj => {
        if(obj.includes("Épée")) att+=20; if(obj.includes("Bouclier")) def+=30; if(obj.includes("Casque")) att+=10;
    });
    return { attaque:Math.round(att), defense:Math.round(def), total:Math.round(att+def) };
}

// ---------- COMBAT ----------
window.combattre = async function(idAdv, estPNJ) {
    if(combatInterval) clearInterval(combatInterval);
    let adv; if(estPNJ) adv = pnjPool.find(p=>p.id===idAdv); else { const s=await getDoc(doc(db,"membres",idAdv)); adv=s.data(); }
    if(!adv) return afficherToast("Adversaire introuvable","error");
    
    document.getElementById('panelCombat').style.display='flex';
    document.getElementById('avatarJoueur').innerText = monProfil.avatar;
    document.getElementById('nomJoueur').innerText = monProfil.pseudo;
    document.getElementById('avatarAdv').innerText = adv.avatar||"👹";
    document.getElementById('nomAdv').innerText = adv.pseudo;
    document.getElementById('pvJoueur').style.width='100%'; document.getElementById('pvAdv').style.width='100%';
    document.getElementById('combatLog').innerText = "⚔️ Le duel commence !";

    const statsMoi = calculerForceArmée(monProfil, mesHeros);
    const statsAdv = estPNJ ? {attaque:adv.prestige||100, defense:adv.prestige||100} : calculerForceArmée(adv, adv.heros||[]);
    let pvMoi = 100, pvAdv = 100; let tour=0; let log="";
    
    combatInterval = setInterval(async ()=>{
        tour++; if(tour>6){ clearInterval(combatInterval); return finCombat(pvAdv<=0); }
        const dMoi = Math.max(5, statsMoi.attaque - statsAdv.defense*0.2 + Math.floor(Math.random()*20));
        const dAdv = Math.max(5, statsAdv.attaque - statsMoi.defense*0.2 + Math.floor(Math.random()*20));
        pvAdv = Math.max(0, pvAdv - dMoi); pvMoi = Math.max(0, pvMoi - dAdv);
        document.getElementById('pvAdv').style.width = pvAdv+'%'; document.getElementById('pvJoueur').style.width = pvMoi+'%';
        log += `Round ${tour} : -${dMoi} ❤️ (lui) / -${dAdv} ❤️ (toi)\n`;
        document.getElementById('combatLog').innerText = log;
        if(pvMoi<=0 || pvAdv<=0){ clearInterval(combatInterval); return finCombat(pvAdv<=0); }
    }, 800);

    function finCombat(victoire){
        let msg="";
        if(victoire){
            const gOr = 20+Math.floor(Math.random()*20); monProfil.or+=gOr; monProfil.prestige+=5; if(!estPNJ) updateDoc(doc(db,"membres",idAdv),{prestige: Math.max(0,(adv.prestige||0)-5)});
            msg = `🏆 VICTOIRE ! +${gOr}🪙`;
        } else { monProfil.prestige = Math.max(0,(monProfil.prestige||0)-5); msg = `💀 DÉFAITE... -5🏆`; }
        updateDoc(doc(db,"membres",monId),{or:monProfil.or,prestige:monProfil.prestige}); majOrPrestige(); afficherToast(msg, victoire?"success":"error"); document.getElementById('combatLog').innerText += `\n${msg}`;
    }
};
window.fermerCombat = function(){ clearInterval(combatInterval); document.getElementById('panelCombat').style.display='none'; };

// ---------- BOUTIQUE ----------
window.afficherBoutique = function() {
    let html = "";
    html += `<div class="shop-section-title"><i class="fas fa-crown"></i> HÉROS (Compétences uniques)</div>`;
    HEROS.forEach((h,i) => {
        const possede = mesHeros.some(mh => mh.nom === h.nom);
        html += `<div class="shop-item"><div><span style="font-size:14px;">${"⭐".repeat(h.etoiles)} ${h.icon} ${h.nom}</span><br><span style="font-size:11px;color:#9ca3af;">Att:${h.attaque} Def:${h.defense} | ${h.competence}</span></div>${possede ? "<span style='color:var(--green);'>✅ Acquis</span>" : `<button onclick="acheterHeros(${i})">${h.prix}🪙</button>`}</div>`;
    });
    html += `<div class="shop-section-title"><i class="fas fa-sword"></i> OBJETS DE GUERRE</div>`;
    OBJETS_GUERRE.forEach(o => {
        const possede = (monProfil.inventaire||[]).includes(o.nom);
        html += `<div class="shop-item"><div><span style="font-size:14px;">${o.icon} ${o.nom}</span><br><span style="font-size:11px;color:#9ca3af;">${o.effet}</span></div>${possede ? "<span style='color:var(--green);'>✅ Acquis</span>" : `<button onclick="acheterObjet('${o.id}','${o.nom}',${o.prix})">${o.prix}🪙</button>`}</div>`;
    });
    html += `<div class="shop-section-title"><i class="fas fa-coins"></i> TRÉSOR</div>`;
    OBJETS_TRESOR.forEach(o => {
        const possede = (monProfil.inventaire||[]).includes(o.nom);
        html += `<div class="shop-item"><div><span style="font-size:14px;">${o.icon} ${o.nom}</span><br><span style="font-size:11px;color:#9ca3af;">${o.effet}</span></div>${possede ? "<span style='color:var(--green);'>✅ Acquis</span>" : `<button onclick="acheterObjet('${o.id}','${o.nom}',${o.prix})">${o.prix}🪙</button>`}</div>`;
    });
    html += `<div class="shop-section-title"><i class="fas fa-handshake"></i> DIPLOMATIE</div>`;
    OBJETS_DIPLO.forEach(o => {
        html += `<div class="shop-item"><div><span style="font-size:14px;">${o.icon} ${o.nom}</span><br><span style="font-size:11px;color:#9ca3af;">${o.effet}</span></div><button onclick="acheterObjet('${o.id}','${o.nom}',${o.prix})">${o.prix}🪙</button></div>`;
    });
    document.getElementById('sectionBoutiqueContainer').innerHTML = html;
};

window.acheterHeros = async function(index) {
    const h = HEROS[index];
    if((monProfil.or||0) < h.prix) return afficherToast("Pas assez d'or","error");
    monProfil.or -= h.prix;
    mesHeros.push({ nom:h.nom, etoiles:h.etoiles, attaque:h.attaque, defense:h.defense, competence:h.competence, icon:h.icon });
    monProfil.heros = mesHeros;
    await updateDoc(doc(db,"membres",monId), {or:monProfil.or, heros:mesHeros});
    majOrPrestige(); afficherBoutique(); afficherToast(`${h.icon} ${h.nom} rejoint votre armée ! (⭐${h.etoiles})`, "success");
};
window.acheterObjet = async function(id, nom, prix) {
    if((monProfil.or||0) < prix) return afficherToast("Pas assez d'or","error");
    monProfil.or -= prix;
    if(!monProfil.inventaire) monProfil.inventaire = [];
    monProfil.inventaire.push(nom);
    await updateDoc(doc(db,"membres",monId), {or:monProfil.or, inventaire:monProfil.inventaire});
    majOrPrestige(); afficherBoutique(); afficherToast(`${nom} acheté !`, "success");
};

// ---------- GESTION CLAN ET CHAT (CORRIGÉ) ----------
function demarrerToutesEcoutes() {
    // Écouteur Chat Clan (COEUR DE LA CORRECTION)
    if(monProfil.clan && monProfil.clan !== "Sans clan") {
        onSnapshot(query(collection(db, "messagesClan"), where("clan", "==", monProfil.clan), orderBy("date")), (snap) => {
            const box = document.getElementById('chatClanBox');
            if(box) {
                box.innerHTML = ""; 
                snap.forEach(d => { 
                    const m = d.data(); 
                    box.innerHTML += `<p><b style="color:var(--gold);">${m.pseudo}:</b> ${m.texte}</p>`; 
                });
                box.scrollTop = box.scrollHeight;
            }
        });
    }
}

window.envoyerMessageClan = async function() {
    const input = document.getElementById('messageClanInput');
    if(!input.value.trim() || !monProfil.clan || monProfil.clan === "Sans clan") return afficherToast("Vous n'êtes pas dans un clan.", "error");
    await addDoc(collection(db, "messagesClan"), { pseudo: monProfil.pseudo, clan: monProfil.clan, texte: input.value.trim(), date: serverTimestamp() });
    input.value = "";
};

window.creerClan = async function() {
    const nom = prompt("Nom de votre nouveau clan :");
    if(!nom) return;
    if(CLANS.includes(nom)) return afficherToast("Ce clan existe déjà.", "error");
    await setDoc(doc(db, "clansPersonnalises", nom), { fondateur: monProfil.pseudo, date: serverTimestamp() });
    CLANS.push(nom);
    monProfil.clan = nom; monProfil.role = "Chef"; monProfil.grade = "Chef";
    await updateDoc(doc(db, "membres", monId), { clan: nom, role: "Chef", grade: "Chef" });
    afficherToast(`🏘️ ${nom} a été créé !`, "success");
    location.reload();
};
window.quitterClan = async function() {
    if(!confirm("Quitter votre clan ?")) return;
    await updateDoc(doc(db, "membres", monId), { clan: "Sans clan", role: "Membre", grade: "Recrue" });
    afficherToast("🚪 Clan quitté.", "info"); location.reload();
};

// ---------- ADMIN / DIEU ----------
window.dieuResetPNJ = async function() {
    if(!confirm("SAMUEL, veux-tu réinitialiser tous les PNJ du monde à 800 de force ?")) return;
    const snap = await getDocs(collection(db,"territoires"));
    for(const d of snap.docs){
        const t = d.data(); t.pnjChef.force = 800; t.pnjChef.pv = 1000;
        await updateDoc(doc(db,"territoires",t.nom), {pnjChef: t.pnjChef});
    }
    afficherToast("⚡ PNJ ultra-puissants (800) réincarnés !","success");
};
window.dieuFrapperBoss = async function() {
    const ref = doc(db,"monde","boss"); const snap = await getDoc(ref); if(!snap.exists()) return;
    await updateDoc(ref, {pv:0}); afficherToast("🐉 Le Boss a été foudroyé !","success"); afficherBoss();
};
window.dieuDelugeOr = async function() {
    const snap = await getDocs(collection(db,"membres"));
    for(const d of snap.docs){
        const o = (d.data().or||0)+50;
        await updateDoc(doc(db,"membres",d.id), {or:o});
    }
    afficherToast("💰 Déluge d'or ! +50🪙 pour tous !","success");
};
window.dieuGuerreImmediate = async function() { 
    afficherToast("🔥 Guerre des Royaumes déclenchée !","info"); 
    // Logique simplifiée de guerre
    alert("Guerre mondiale déclenchée, les scores des clans vont être calculés !");
};

// ---------- TUTORIEL SAMUEL ----------
const TUTOS = [
    "Bienvenue, futur conquérant. Je suis Samuel. Ton but ultime : bâtir une cité, fonder un clan, et devenir le Roi du Monde en remportant la Guerre des Royaumes.",
    "La force vient de l'union. Rejoins un clan ou crée le tien. Sans clan, tu ne pourras pas participer à la diplomatie ou à la Guerre des Royaumes.",
    "Construis des bâtiments pour produire des ressources. Scierie=🪵, Carrière=🪨, Ferme=🌾. Sans ressources, tu ne peux ni construire, ni recruter.",
    "Tes bâtiments produisent ! Clique sur 'Récolter'. Les ressources te permettront d'améliorer tes bâtiments et de débloquer des Héros.",
    "Va dans la Boutique. Achète des Héros avec des compétences spéciales (Attaque, Défense, Production). Ils sont la clé de ta puissance militaire.",
    "Ouvre la Carte du Monde. Les territoires sont colorés par clan. Les PNJ sont ultra-puissants (Force 800+). N'attaque pas seul au début !",
    "Le Boss Mondial est ton ennemi commun. Le vaincre rapporte or et prestige. Deviens le maître de cet empire, Ô grand Stratège !"
];
let tutoStep = 0;
window.lancerTutoriel = function(){ tutoStep=0; document.getElementById('panelTutoriel').style.display='flex'; updateTuto(); };
window.lancerTutorielManuel = function(){ lancerTutoriel(); };
function updateTuto(){
    document.getElementById('tutorielTexte').innerText = TUTOS[tutoStep];
    document.getElementById('tutoStep').innerText = `${tutoStep+1}/${TUTOS.length}`;
    document.getElementById('tutoBar').style.width = `${((tutoStep+1)/TUTOS.length)*100}%`;
    document.getElementById('btnTutoPrev').style.display = tutoStep===0?'none':'inline-block';
    document.getElementById('btnTutoNext').style.display = tutoStep===TUTOS.length-1?'none':'inline-block';
    document.getElementById('btnTutoFin').style.display = tutoStep===TUTOS.length-1?'inline-block':'none';
}
window.suivantTutoriel = function(){ if(tutoStep<TUTOS.length-1){tutoStep++; updateTuto();} };
window.precedentTutoriel = function(){ if(tutoStep>0){tutoStep--; updateTuto();} };
window.finirTutoriel = function(){ document.getElementById('panelTutoriel').style.display='none'; monProfil.or=(monProfil.or||0)+50; updateDoc(doc(db,"membres",monId),{or:monProfil.or}); majOrPrestige(); afficherToast("🏆 Tutoriel terminé ! +50🪙 !","success"); changerOnglet('Village'); };
window.ouvrirCodex = function(){ document.getElementById('panelCodex').style.display='flex'; };
window.fermerCodex = function(){ document.getElementById('panelCodex').style.display='none'; };

// ---------- FONCTIONS DIVERSES (pour la compilation) ----------
window.afficherGestionClan = function() { 
    if(!monProfil.clan || monProfil.clan === "Sans clan") { document.getElementById('zoneSansClan').style.display = 'block'; document.getElementById('zoneAvecClan').style.display = 'none'; }
    else { document.getElementById('zoneSansClan').style.display = 'none'; document.getElementById('zoneAvecClan').style.display = 'block'; }
    // Note: pour simplifier, la liste des clans disponibles est statique ici
};
window.afficherAdversaires = function() { /* Logique standard à remettre si besoin */ };
window.afficherBoss = async function() {
    const ref = doc(db,"monde","boss");
    let snap = await getDoc(ref);
    if(!snap.exists()) { await setDoc(ref, { nom:"Dragon Noir", pvMax:5000, pv:5000 }); snap = await getDoc(ref); }
    const b = snap.data();
    document.getElementById('bossPV').innerText = b.pv;
    document.getElementById('remplissageBoss').style.width = `${(b.pv/b.pvMax)*100}%`;
};
window.attaquerBoss = async function() {
    const ref = doc(db,"monde","boss"); const snap = await getDoc(ref); const b = snap.data();
    const degats = Math.round(15+(monProfil.prestige||0)*0.15);
    const nouveauxPV = Math.max(0, b.pv-degats);
    await updateDoc(ref, { pv: nouveauxPV });
    monProfil.or = (monProfil.or||0)+8; await updateDoc(doc(db,"membres",monId),{or:monProfil.or}); majOrPrestige(); afficherBoss();
    if(nouveauxPV===0) { await updateDoc(ref, { pv:b.pvMax }); afficherToast("🐉 Boss vaincu !","success"); }
};
window.dessinerCarte = function() {
    const canvas = document.getElementById('carteCanvas'); const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth*2; canvas.height = canvas.offsetHeight*2; ctx.scale(2,2);
    const W = canvas.width/2, H = canvas.height/2;
    ctx.clearRect(0,0,W,H);
    const cols = 8, rows = 5, taille = Math.min(W/cols, H/rows);
    // Dessiner une carte fictive basée sur CLAN_COLORS
    for(let y=0; y<rows; y++) for(let x=0; x<cols; x++){
        const color = CLAN_COLORS["Sans clan"]; ctx.fillStyle=color; ctx.fillRect(x*taille, y*taille, taille-2, taille-2);
    }
};
window.afficherClassementPar = function(critere) { /* Logique standard à remettre si besoin */ };
window.afficherStats = function() { document.getElementById('statsBox').innerHTML = `<div>💪 Attaque: ${calculerForceArmée(monProfil, mesHeros).attaque}</div><div>🛡️ Défense: ${calculerForceArmée(monProfil, mesHeros).defense}</div><div>💼 Niveau: ${niveauGlobalVillage(monProfil.village?.batiments||{})}</div><div>🏆 Prestige: ${monProfil.prestige||0}</div>`; };

// ---------- INITIALISATION ----------
if(localStorage.getItem('otakus_id')) document.getElementById('codeInput').value = CODE_COMMUN;
pnjPool = Array.from({length:150}, (_,i) => ({ id:`PNJ_${i}`, pseudo:`PNJ_${i}`, clan:"Errants", prestige:800+Math.floor(Math.random()*200), estPNJ:true }));
console.log("Empire des Otakus prêt !");
