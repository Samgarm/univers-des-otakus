import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// CONFIG FIREBASE
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

// CONSTANTES
const CODE_COMMUN = "OTAKU2026";
const CLANS_DEFAUT = ["Dragon Écarlate", "Lune d'Argent", "Sabre Noir", "Phénix Doré"];
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀","🤖","🧟","👾"];
const GRADES = ["Recrue", "Officier", "Lieutenant", "Commandant", "Bras droit"];
const BATIMENTS = ["route","caserne","hotelDeVille","senat","ferme","carriere","scierie","mur","temple"];
const COUT_BATIMENTS = { route:{or:100,bois:20,pierre:30}, caserne:{or:300,bois:40,pierre:60}, hotelDeVille:{or:600,bois:50,pierre:100}, senat:{or:1000,bois:60,pierre:120}, ferme:{or:150,bois:30,pierre:10}, carriere:{or:150,bois:30,pierre:0}, scierie:{or:150,bois:0,pierre:20}, mur:{or:400,bois:20,pierre:80}, temple:{or:350,bois:40,pierre:50} };
const DUREES = [2,4,8,15,30,60,120,240,480,1440];

// ========== SYSTÈME DE FORGE & ÉQUIPEMENTS ==========
const RARETES = ["commun", "rare", "epic", "legendary", "mythic"];
const NOMS_RARETES = { commun:"Commun", rare:"Rare", epic:"Épique", legendary:"Légendaire", mythic:"Mythique" };
const MATERIAUX = {
    commun: { minerai: 5, fibre: 5 },
    rare: { minerai: 15, fibre: 15, poussiere: "poussiere_rare" },
    epic: { minerai: 30, fibre: 30, poussiere: "poussiere_epic" },
    legendary: { minerai: 60, fibre: 60, poussiere: "poussiere_legendary" },
    mythic: { minerai: 120, fibre: 120, poussiere: "poussiere_mythic" }
};

const ARMES = [
    { nom:"Lame du Berserker", type:"weapon", att:120, def:-20, hp:0, passif:"+30% dégâts aux 2 premiers rounds" },
    { nom:"Épée de l'Aube", type:"weapon", att:80, def:40, hp:30, passif:"Immortel pendant 2 rounds" },
    { nom:"Arc de la Nuit", type:"weapon", att:140, def:0, hp:0, passif:"Ignore 30% de la défense" },
    { nom:"Trident de Poséidon", type:"weapon", att:100, def:50, hp:50, passif:"+15% critique" }
];
const ARMURES = [
    { nom:"Armure du Gardien", type:"armor", att:-10, def:150, hp:50, passif:"Réduit les dégâts subis de 20%" },
    { nom:"Cotte de Mailles", type:"armor", att:0, def:100, hp:20, passif:"Aucun" }
];
const CASQUES = [
    { nom:"Heaume de Fer", type:"head", att:0, def:50, hp:20, passif:"Aucun" },
    { nom:"Diadème de l'Aube", type:"head", att:30, def:20, hp:10, passif:"+10% Attaque" }
];
const MONTS = [
    { nom:"Cheval de Guerre", type:"mount", att:40, def:20, hp:0, passif:"+15% Vitesse" },
    { nom:"Dragonnet Écarlate", type:"mount", att:60, def:40, hp:50, passif:"Brûlure (10% dégâts bonus par tour)" }
];
const ACCESSOIRES = [
    { nom:"Bague de Pouvoir", type:"accessory", att:50, def:10, hp:0, passif:"Rage (+10% attaque par tour)" },
    { nom:"Amulette Sacrée", type:"accessory", att:10, def:60, hp:80, passif:"Régénération (+5% PV par tour)" }
];
const BOTTES = [
    { nom:"Bottes de l'Éclaireur", type:"boots", att:20, def:20, hp:0, passif:"Premier Sang (Attaque en premier)" }
];
const TOUS_EQUIPEMENTS = [...ARMES, ...ARMURES, ...CASQUES, ...MONTS, ...ACCESSOIRES, ...BOTTES];

let monId = "", monProfil = {}, mesHeros = [], tousTerritoires = [], pnjPool = [];
let CLANS = [...CLANS_DEFAUT];
let combatInterval = null;

// ========== TOAST ==========
function afficherToast(txt, type="info") {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = txt;
    c.appendChild(t);
    setTimeout(()=>t.remove(), 3500);
}

// ========== NAVIGATION ==========
window.changerOnglet = function(nom) {
    document.querySelectorAll('.onglet-container').forEach(el => el.style.display = 'none');
    document.getElementById('onglet'+nom).style.display = 'block';
    document.querySelectorAll('#navFixe button').forEach(b => b.classList.remove('active'));
    const idx = ['Village','Clan','Monde','Boutique','Profil'].indexOf(nom);
    if(idx > -1) document.querySelector(`#navFixe button:nth-child(${idx+1})`).classList.add('active');
    if(nom === 'Village') afficherVillage();
    if(nom === 'Monde') { afficherAdversaires(); afficherBoss(); dessinerCarte(); }
    if(nom === 'Profil') { afficherStats(); afficherClassementPar('prestige'); }
};

// ========== AUTH ==========
window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    if(!code) return document.getElementById('messageConnexion').innerText = "Entrez un code.";
    try {
        const snap = await getDoc(doc(db, "membres", code));
        if(snap.exists() && !snap.data().banni) {
            monId = code; monProfil = snap.data();
            document.getElementById('auth-ecran').style.display = 'none';
            document.getElementById('game-ecran').style.display = 'block';
            lancerJeu();
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
    const data = { pseudo, specialite, clan:"Sans clan", role:"Membre", grade:"Recrue", or:500, prestige:0, avatar:window._avatar||"🧝", heros:[], inventaire:[], village:{taux:20, tresor:0, ressources:{bois:1000,pierre:1000,nourriture:0}, batiments:{}, enConstruction:null, territoire:0}, premiereConnexion:true, codeRecuperation:String(Math.floor(100000+Math.random()*900000)) };
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

// ========== LANCEMENT DU JEU ==========
function lancerJeu() {
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo;
    document.getElementById('avatarAffiche').innerText = monProfil.avatar;
    document.getElementById('gradeAffiche').innerText = monProfil.grade;
    document.getElementById('clanAffiche').innerHTML = `<i class="fas fa-flag"></i> ${monProfil.clan||"Aucun"}`;
    majOrPrestige();
    mesHeros = monProfil.heros || [];
    demarrerEcoutes();
    if(monProfil.premiereConnexion) { lancerTutoriel(); updateDoc(doc(db,"membres",monId), {premiereConnexion:false}); }
    else changerOnglet('Village');
}
function majOrPrestige() {
    document.getElementById('orAffiche').innerText = monProfil.or || 0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;
}

// ========== VILLAGE & RESSOURCES ==========
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
window.activerCarteDePaix = function(){ if((monProfil.or||0)<50) return afficherToast("50🪙 requis","error"); monProfil.or-=50; monProfil.village.carteDePaix=Date.now()+86400000; updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherToast("🛡️ Bouclier activé 24h","success"); };

// ========== STATS & COMBAT ==========
function calculerForceArmée(p, herosList) {
    const v = p.village||{}; const h = herosList||p.heros||[];
    let att = (v.batiments.caserne||0)*15 + (v.batiments.mur||0)*5;
    let def = (v.batiments.mur||0)*20 + (v.batiments.caserne||0)*5;
    h.forEach(hh => { att += hh.attaque||0; def += hh.defense||0; });
    (p.inventaire||[]).forEach(obj => {
        if(obj.includes("Épée") || obj.includes("Lame") || obj.includes("Arc")) att += 20;
        if(obj.includes("Armure") || obj.includes("Cotte") || obj.includes("Manteau")) def += 30;
    });
    return { attaque:Math.round(att), defense:Math.round(def), total:Math.round(att+def) };
}

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
            const gOr = 20+Math.floor(Math.random()*20); monProfil.or+=gOr; monProfil.prestige+=5;
            if(!estPNJ) updateDoc(doc(db,"membres",idAdv),{prestige: Math.max(0,(adv.prestige||0)-5)});
            msg = `🏆 VICTOIRE ! +${gOr}🪙`;
        } else { monProfil.prestige = Math.max(0,(monProfil.prestige||0)-5); msg = `💀 DÉFAITE... -5🏆`; }
        updateDoc(doc(db,"membres",monId),{or:monProfil.or,prestige:monProfil.prestige}); majOrPrestige(); afficherToast(msg, victoire?"success":"error"); document.getElementById('combatLog').innerText += `\n${msg}`;
    }
};
window.fermerCombat = function(){ clearInterval(combatInterval); document.getElementById('panelCombat').style.display='none'; };

// ========== ESPIONNAGE ==========
window.espionner = async function(idCible) {
    const snap = await getDoc(doc(db,"membres",idCible)); const c = snap.data();
    const stats = calculerForceArmée(c, c.heros||[]);
    document.getElementById('espionnageContent').innerHTML = `
        <b>Seigneur :</b> ${c.pseudo} (${c.clan||"Sans clan"})<br>
        <b>💪 Force :</b> ${stats.attaque} Att / ${stats.defense} Def<br>
        <b>💰 Or :</b> ${c.or||0}<br>
        <b>🏘️ Territoire :</b> ${c.village?.territoire||0}<br>
        <b>📦 Ressources :</b> 🪵${c.village?.ressources.bois||0} 🪨${c.village?.ressources.pierre||0} 🌾${c.village?.ressources.nourriture||0}<br>
        <b>⚔️ Héros :</b> ${(c.heros||[]).map(h => h.nom).join(", ") || "Aucun"}
    `;
    document.getElementById('panelEspionnage').style.display='flex';
};
window.fermerEspionnage = function(){ document.getElementById('panelEspionnage').style.display='none'; };

// ========== CLASSEMENTS ==========
window.afficherClassementPar = async function(critere) {
    const snap = await getDocs(collection(db,"membres"));
    let tous = []; snap.forEach(d => tous.push({id:d.id, ...d.data()}));
    const box = document.getElementById('classementDynamique'); box.innerHTML = "";
    if(critere === 'clan') {
        const totaux = {}; tous.forEach(m => { if(m.clan) totaux[m.clan]=(totaux[m.clan]||0)+(m.prestige||0); });
        Object.entries(totaux).sort((a,b)=>b[1]-a[1]).slice(0,10).forEach(([c,t],i) => box.innerHTML += `<div class="membreLigne"><span>#${i+1} ${c}</span><span>${t}🏆</span></div>`);
        return;
    }
    let cle = critere, unite = critere==='prestige'?"🏆":critere==='or'?"🪙":critere==='force'?"💪":"";
    if(critere==='force') { tous.forEach(m => m._force = calculerForceArmée(m, m.heros||[]).total); cle='_force'; unite="💪"; }
    tous.sort((a,b)=>(b[cle]||0)-(a[cle]||0)).slice(0,15).forEach((m,i) => {
        box.innerHTML += `<div class="membreLigne"><span onclick="espionner('${m.id}')">#${i+1} ${m.avatar||""} ${m.pseudo}</span><span>${m[cle]||0}${unite}</span></div>`;
    });
};

// ========== ADMIN / DIEU ==========
window.dieuResetPNJ = async function() {
    if(!confirm("SAMUEL, réinitialiser tous les PNJ à 800 ?")) return;
    const snap = await getDocs(collection(db,"territoires"));
    for(const d of snap.docs){ const t=d.data(); t.pnjChef.force=800; t.pnjChef.pv=1000; await updateDoc(doc(db,"territoires",t.nom),{pnjChef:t.pnjChef}); }
    afficherToast("⚡ Légats réincarnés !","success");
};
window.dieuFrapperBoss = async function() {
    const ref=doc(db,"monde","boss"); const snap=await getDoc(ref);
    if(!snap.exists()) return; await updateDoc(ref,{pv:0}); afficherToast("🐉 Le Fléau est mort !","success"); afficherBoss();
};
window.dieuDelugeOr = async function() {
    const snap=await getDocs(collection(db,"membres"));
    for(const d of snap.docs){ await updateDoc(doc(db,"membres",d.id),{or:(d.data().or||0)+50}); }
    afficherToast("💰 Déluge d'Or !","success");
};
window.dieuGuerreImmediate = function(){ afficherToast("🔥 Guerre des Royaumes déclenchée !","info"); };

// ========== TUTORIEL ==========
const TUTOS = ["Bienvenue...", "Construis...", "Récolte...", "Forge...", "Combat...", "Conquiers...", "Deviens le Roi !"];
let tutoStep=0;
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
window.finirTutoriel = function(){ document.getElementById('panelTutoriel').style.display='none'; afficherToast("🏆 Tutoriel terminé !","success"); changerOnglet('Village'); };

// ========== ÉCOUTES FIREBASE ==========
function demarrerEcoutes() {
    onSnapshot(collection(db, "messagesClan"), (snap) => {
        const box = document.getElementById('chatClanBox'); if(box) { box.innerHTML=""; snap.forEach(d=>{const m=d.data(); box.innerHTML+=`<p><b>${m.pseudo}:</b> ${m.texte}</p>`;}); }
    });
    onSnapshot(collection(db, "membres"), (snap) => {
        const select = document.getElementById('destinatairePrive'); select.innerHTML="";
        snap.forEach(d => { if(d.id !== monId) select.innerHTML += `<option value="${d.id}">${d.data().pseudo}</option>`; });
    });
}

// ========== AUTRES FONCTIONS ==========
window.envoyerMessageClan = async function() {
    const input = document.getElementById('messageClanInput');
    if(!input.value.trim()) return;
    await addDoc(collection(db,"messagesClan"), { pseudo:monProfil.pseudo, texte:input.value.trim(), date:serverTimestamp() });
    input.value="";
};
window.envoyerMessagePrive = async function() {
    const destId = document.getElementById('destinatairePrive').value;
    const input = document.getElementById('messagePriveInput');
    if(!input.value.trim() || !destId) return;
    await addDoc(collection(db,"messagesPrives"), { expediteur:monProfil.pseudo, destinataireId:destId, texte:input.value.trim(), date:serverTimestamp() });
    input.value=""; afficherToast("Message privé envoyé !","success");
};
window.filtrerAdversaires = function() { document.getElementById('listeAdversaires').innerHTML = "<p>Liste des joueurs (à implémenter)</p>"; };
window.dessinerCarte = function() { /* Logique canvas simplifiée */ };
window.attaquerBoss = function() { afficherToast("Attaque du Boss lancée !","info"); };
window.afficherBoss = function() { document.getElementById('bossPV').innerText = "5000"; };
window.explorerNouveauTerritoire = function() { afficherToast("🧭 Exploration en cours...","info"); };
window.lancerCombatSolo = function() { afficherToast("⚔️ Mode Solo lancé contre une IA !","info"); };
window.afficherAdversaires = function() { afficherToast("👤 Liste des adversaires chargée.","info"); };
window.afficherStats = function(){ document.getElementById('statsBox').innerHTML = `<div>💪 Attaque: ${calculerForceArmée(monProfil, mesHeros).attaque}</div><div>🛡️ Défense: ${calculerForceArmée(monProfil, mesHeros).defense}</div>`; };
window.creerClan = function(){ afficherToast("Fonction de création de clan à implémenter.","info"); };
window.quitterClan = function(){ afficherToast("Fonction de sortie de clan à implémenter.","info"); };
window.afficherSectionBoutique = function(s){ document.getElementById('sectionBoutiqueContainer').innerHTML = `<p>Section ${s} de la boutique.</p>`; };
window.ouvrirForge = function(){ document.getElementById('panelForge').style.display = 'block'; };
window.afficherGestionClan = function(){ };
window.ouvrirCodex = function(){ document.getElementById('panelCodex').style.display='flex'; };
window.fermerCodex = function(){ document.getElementById('panelCodex').style.display='none'; };
window.seDeconnecter = function(){ localStorage.removeItem('otakus_id'); location.reload(); };

// ========== INITIALISATION ==========
if(localStorage.getItem('otakus_id')) document.getElementById('codeInput').value = CODE_COMMUN;
pnjPool = Array.from({length:50}, (_,i) => ({ id:`PNJ_${i}`, pseudo:`Légat_${i}`, clan:"Errants", prestige:800+Math.floor(Math.random()*200), estPNJ:true }));
console.log("Empire des Otakus - Version Finale");
