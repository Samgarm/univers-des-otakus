import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection,
  addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs, arrayUnion
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

const CODE_COMMUN = "OTAKU2026";
const CLANS = ["Clan du Dragon Écarlate", "Clan de la Lune d'Argent", "Clan du Sabre Noir", "Clan du Phénix Doré"];
const AVANTAGES = { Guerrier: "Stratège", Stratège: "Archer", Archer: "Guerrier" };
const GRADES = ["Recrue", "Officier", "Lieutenant", "Bras droit"];
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀"];

let monId = "";
let monProfil = {};
let pnjPool = [];
let monArmeePersonnelle = [];
let tousLesMembres = [];
let avatarChoisi = "🧝";
let clanInscriptionChoisi = "";

// ---------------- PNJ & ARMÉE ----------------
function genererPNJ() {
    const prenoms = ["Kiro","Yuna","Ren","Sora","Aki","Haru","Miko","Kenji","Sayo","Riku","Ayame","Tatsu","Nozomi","Kaito","Mei","Shiro","Yumi","Daiki","Emi","Rin"];
    const suffixes = ["no Kage","le Silencieux","du Vent","la Flamme","de l'Ombre","le Rapide","des Cimes","la Loyale","le Sage","du Nord"];
    const specialites = ["Guerrier","Archer","Stratège"];
    let pnjs = [];
    CLANS.forEach(clan => {
        for (let i = 0; i < 125; i++) {
            const nom = prenoms[Math.floor(Math.random()*prenoms.length)] + " " + suffixes[Math.floor(Math.random()*suffixes.length)];
            pnjs.push({ id: "PNJ_" + clan.slice(0,3) + "_" + i, pseudo: nom, clan,
                specialite: specialites[Math.floor(Math.random()*specialites.length)],
                prestige: Math.floor(Math.random()*150), estPNJ: true });
        }
    });
    return pnjs;
}
function genererArmeeSamuel() {
    const noms = ["Garde Impérial","Éclaireur","Soldat d'élite","Ambassadeur","Espion"];
    let armee = [];
    for (let i = 0; i < 300; i++) armee.push({ nom: noms[i % noms.length] + " " + i, force: 20 + Math.floor(Math.random()*30) });
    return armee;
}

// ---------------- CONNEXION ----------------
window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    const messageEl = document.getElementById('messageConnexion');
    if (!code) { messageEl.innerText = "Entrez un code."; return; }

    const savedId = localStorage.getItem('otakus_id');
    if (savedId && code === CODE_COMMUN) {
        const snap = await getDoc(doc(db, "membres", savedId));
        if (snap.exists() && !snap.data().banni) { monId = savedId; monProfil = snap.data(); afficherAccueil(); return; }
        localStorage.removeItem('otakus_id');
        messageEl.innerText = snap.exists() ? "Ce compte a été banni." : "Ton compte n'existe plus. Inscris-toi à nouveau.";
        return;
    }
    try {
        const snap = await getDoc(doc(db, "membres", code));
        if (snap.exists()) {
            const d = snap.data();
            if (d.banni) { messageEl.innerText = "Ce compte a été banni."; return; }
            monId = code; monProfil = d;
            localStorage.setItem('otakus_id', code);
            afficherAccueil();
        } else { messageEl.innerText = "Code invalide."; }
    } catch (e) { messageEl.innerText = "Erreur : " + e.message; }
};

// ---------------- INSCRIPTION ----------------
window.ouvrirInscription = function() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('inscription').style.display = 'block';
    const zoneAv = document.getElementById('choixAvatarInscription'); zoneAv.innerHTML = "";
    AVATARS.forEach(a => zoneAv.innerHTML += `<button onclick="choisirAvatarInscription('${a}')">${a}</button>`);
    const zone = document.getElementById('listeClansInscription'); zone.innerHTML = "";
    CLANS.forEach(c => {
        const div = document.createElement('div'); div.className = 'clanChoix';
        div.innerHTML = `<b>${c}</b> <button onclick="choisirClanInscription('${c}')">Rejoindre</button>`;
        zone.appendChild(div);
    });
};
window.choisirAvatarInscription = function(a) { avatarChoisi = a; alert("Avatar : " + a); };
window.choisirClanInscription = function(clan) { clanInscriptionChoisi = clan; alert("Clan sélectionné : " + clan); };
window.retourConnexion = function() {
    document.getElementById('inscription').style.display = 'none';
    document.getElementById('recuperation').style.display = 'none';
    document.getElementById('connexion').style.display = 'block';
};
window.ouvrirRecuperation = function() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('recuperation').style.display = 'block';
};
window.validerInscription = async function() {
    const codeSaisi = document.getElementById('codeInscriptionInput').value.trim();
    const pseudo = document.getElementById('pseudoInscriptionInput').value.trim();
    const specialite = document.getElementById('specialiteInscriptionInput').value;
    const msgEl = document.getElementById('messageInscription');

    if (codeSaisi !== CODE_COMMUN) { msgEl.innerText = "Code d'inscription invalide."; return; }
    if (!pseudo || !clanInscriptionChoisi) { msgEl.innerText = "Renseigne ton pseudo et choisis un clan."; return; }

    const dejaExiste = await getDocs(query(collection(db, "membres"), where("pseudo", "==", pseudo)));
    if (!dejaExiste.empty) { msgEl.innerText = "Ce pseudo est déjà pris, choisis-en un autre."; return; }

    const nouveauId = "M" + Date.now();
    const codeRecup = String(Math.floor(100000 + Math.random() * 900000));
    const data = {
        pseudo, specialite, clan: clanInscriptionChoisi, role: "Membre", grade: "Recrue",
        or: 0, prestige: 0, arme: "Aucune", bonusForce: 0, revenuTotal: 0, inventaire: [],
        avatar: avatarChoisi, xp: 0, niveau: 1, banni: false, codeRecuperation: codeRecup
    };
    await setDoc(doc(db, "membres", nouveauId), data);
    monId = nouveauId; monProfil = data;
    localStorage.setItem('otakus_id', nouveauId);

    document.getElementById('inscription').style.display = 'none';
    document.getElementById('codeRecupAffiche').innerText = codeRecup;
    document.getElementById('afficheCodeRecup').style.display = 'block';
};
window.fermerCodeRecup = function() { document.getElementById('afficheCodeRecup').style.display = 'none'; afficherAccueil(); };
window.recupererCompte = async function() {
    const codeSaisi = document.getElementById('codeRecuperationInput').value.trim();
    const msgEl = document.getElementById('messageRecuperation');
    if (!codeSaisi) { msgEl.innerText = "Entre ton code."; return; }
    const resultat = await getDocs(query(collection(db, "membres"), where("codeRecuperation", "==", codeSaisi)));
    if (resultat.empty) { msgEl.innerText = "Code introuvable."; return; }
    const docTrouve = resultat.docs[0];
    const d = docTrouve.data();
    if (d.banni) { msgEl.innerText = "Ce compte a été banni."; return; }
    monId = docTrouve.id; monProfil = d;
    localStorage.setItem('otakus_id', docTrouve.id);
    afficherAccueil();
};

// ---------------- ACCUEIL ----------------
async function afficherAccueil() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('inscription').style.display = 'none';
    document.getElementById('recuperation').style.display = 'none';
    document.getElementById('accueil').style.display = 'block';

    document.getElementById('avatarAffiche').innerText = monProfil.avatar || "🧝";
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo;
    document.getElementById('gradeAffiche').innerText = monProfil.grade || monProfil.role;
    document.getElementById('clanAffiche').innerText = monProfil.clan || "Aucun — Fondateur";
    document.getElementById('specialiteAffiche').innerText = monProfil.specialite || "";
    document.getElementById('orAffiche').innerText = monProfil.or || 0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;

    pnjPool = genererPNJ();
    if (monProfil.role === "Fondateur") monArmeePersonnelle = genererArmeeSamuel();

    demarrerChat();
    if (monProfil.clan) {
        document.getElementById('sectionClan').style.display = 'block';
        demarrerChatClan();
        demarrerListeClan();
        await afficherVillage();
    }
    demarrerAdversaires();
    demarrerClassements();
    demarrerJournal();
    afficherBoutique();
    afficherDiplomatie();
    afficherCommandement();
    afficherAdmin();
    afficherStats();
    afficherInventaire();
    afficherTrone();
    afficherQuete();
    await afficherBoss();
    await afficherCarteMonde();
    verifierEvenementPNJ();
    surveillerGuerreRoyaumes();
}

// ---------------- CHAT ----------------
window.envoyerMessage = async function() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim()) return;
    await addDoc(collection(db, "messages"), { pseudo: monProfil.pseudo, texte: input.value.trim(), date: serverTimestamp() });
    input.value = "";
};
window.envoyerMessageClan = async function() {
    const input = document.getElementById('messageClanInput');
    if (!input.value.trim()) return;
    await addDoc(collection(db, "messagesClan"), { pseudo: monProfil.pseudo, clan: monProfil.clan, texte: input.value.trim(), date: serverTimestamp() });
    input.value = "";
};
function demarrerChat() {
    onSnapshot(query(collection(db, "messages"), orderBy("date")), (snap) => {
        const box = document.getElementById('chatBox'); box.innerHTML = "";
        snap.forEach(d => { const m = d.data(); box.innerHTML += `<p><b>${m.pseudo} :</b> ${m.texte}</p>`; });
        box.scrollTop = box.scrollHeight;
    });
}
function demarrerChatClan() {
    onSnapshot(query(collection(db, "messagesClan"), where("clan", "==", monProfil.clan), orderBy("date")), (snap) => {
        const box = document.getElementById('chatClanBox'); box.innerHTML = "";
        snap.forEach(d => { const m = d.data(); box.innerHTML += `<p><b>${m.pseudo} :</b> ${m.texte}</p>`; });
        box.scrollTop = box.scrollHeight;
    });
}

// ---------------- CLAN ----------------
function demarrerListeClan() {
    onSnapshot(query(collection(db, "membres"), where("clan", "==", monProfil.clan)), (snap) => {
        tousLesMembres = [];
        const box = document.getElementById('listeMembresClan'); box.innerHTML = "";
        const estChef = monProfil.role === "Chef" || monProfil.role === "Fondateur";
        snap.forEach(d => {
            const m = d.data(); tousLesMembres.push({ id: d.id, ...m });
            let ligne = `<div class="membreLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan}','${m.specialite||''}','${m.grade || m.role}',${m.prestige || 0})">${m.avatar||""} ${m.pseudo} — ${m.grade || m.role}</span>`;
            if (d.id !== monId) {
                ligne += `<button onclick="offrirArgent('${d.id}','${m.pseudo}')">🎁</button>`;
                ligne += `<button onclick="corrompre('${d.id}','${m.pseudo}')">💰</button>`;
            }
            if (estChef && d.id !== monId) ligne += `<button onclick="promouvoir('${d.id}')">⬆️</button>`;
            ligne += `</div>`;
            box.innerHTML += ligne;
        });
    });
}
window.promouvoir = async function(id) {
    const snap = await getDoc(doc(db, "membres", id));
    const data = snap.data();
    const idx = GRADES.indexOf(data.grade || "Recrue");
    const nouveauGrade = GRADES[Math.min(idx + 1, GRADES.length - 1)];
    await updateDoc(doc(db, "membres", id), { grade: nouveauGrade });
    await ajouterEvenement(`${data.pseudo} a été promu ${nouveauGrade} dans ${data.clan} !`);
};
window.offrirArgent = async function(idCible, pseudoCible) {
    const montant = parseInt(prompt(`Offrir combien à ${pseudoCible} ?`, "50"));
    if (!montant || montant <= 0 || montant > (monProfil.or || 0)) { alert("Montant invalide."); return; }
    monProfil.or -= montant;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
    const cibleSnap = await getDoc(doc(db, "membres", idCible));
    const cible = cibleSnap.data();
    await updateDoc(doc(db, "membres", idCible), { or: (cible.or || 0) + montant });
    document.getElementById('orAffiche').innerText = monProfil.or;
    await ajouterEvenement(`🎁 ${monProfil.pseudo} a offert ${montant} 🪙 à ${pseudoCible} !`);
};
window.corrompre = async function(idCible, pseudoCible) {
    const cout = 100;
    if ((monProfil.or || 0) < cout) { alert("Il faut 100 Francs Otaku."); return; }
    monProfil.or -= cout;
    monProfil.prestige = (monProfil.prestige || 0) + 10;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or, prestige: monProfil.prestige });
    const cibleSnap = await getDoc(doc(db, "membres", idCible));
    const cible = cibleSnap.data();
    await updateDoc(doc(db, "membres", idCible), { prestige: Math.max(0, (cible.prestige || 0) - 15) });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats();
    await ajouterEvenement(`💰 ${monProfil.pseudo} a corrompu quelqu'un... des rumeurs circulent sur ${pseudoCible}.`);
};

// ---------------- VILLAGE ----------------
async function getVillage(clan) {
    const ref = doc(db, "villages", clan);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        const base = { clan, taux: 20, mecontentement: 10, tresor: 0, territoire: 5,
            batiments: { route:0, caserne:0, hotelDeVille:0, senat:0, ferme:0, carriere:0, scierie:0, mur:0, temple:0 },
            ressources: { bois: 0, pierre: 0, nourriture: 0 }, relations: {}, alliances: [] };
        await setDoc(ref, base);
        return base;
    }
    const data = snap.data();
    if (!data.ressources) data.ressources = { bois:0, pierre:0, nourriture:0 };
    if (!data.relations) data.relations = {};
    if (!data.alliances) data.alliances = [];
    if (data.territoire === undefined) data.territoire = 5;
    return data;
}
async function afficherVillage() {
    document.getElementById('sectionVillage').style.display = 'block';
    const village = await getVillage(monProfil.clan);
    document.getElementById('infosVillage').innerText = `Trésor : ${village.tresor} 🪙 | Mécontentement : ${village.mecontentement}% | Territoire : ${village.territoire} 🗺️`;
    document.getElementById('ressourcesVillage').innerText = `🪵 Bois: ${village.ressources.bois} | 🪨 Pierre: ${village.ressources.pierre} | 🌾 Nourriture: ${village.ressources.nourriture}`;

    const icones = { route:"🛣️", caserne:"🏋️", hotelDeVille:"🏛️", senat:"🏦", ferme:"🌾", carriere:"🪨", scierie:"🪵", mur:"🧱", temple:"⛩️" };
    let grille = "";
    Object.keys(icones).forEach(type => {
        const niveau = village.batiments[type] || 0;
        grille += `<div class="tuileBatiment" onclick="detailBatiment('${type}',${niveau})">
            <div style="font-size:24px;">${niveau === 0 ? "🌳" : icones[type]}</div>
            <div>${type}</div><div>Niv. ${niveau}</div></div>`;
    });
    document.getElementById('batimentsVillage').innerHTML = grille;

    const estChef = monProfil.role === "Chef" || monProfil.role === "Fondateur";
    if (estChef) {
        document.getElementById('zoneChefVillage').style.display = 'block';
        document.getElementById('tauxActuel').innerText = village.taux;
        document.getElementById('curseurTaxe').value = village.taux;
    }
    if (village.mecontentement >= 70 && !estChef) document.getElementById('zoneRevolte').style.display = 'block';
}
const COUT_BATIMENTS = { route:100, caserne:300, hotelDeVille:600, senat:1000, ferme:150, carriere:150, scierie:150, mur:400, temple:350 };
window.detailBatiment = function(type, niveau) {
    const estChef = monProfil.role === "Chef" || monProfil.role === "Fondateur";
    if (!estChef) { alert(`${type} — Niveau ${niveau}`); return; }
    const cout = COUT_BATIMENTS[type] * (niveau + 1);
    if (confirm(`${type} — Niveau ${niveau}\n${niveau === 0 ? "Construire" : "Améliorer"} pour ${cout} 🪙 ?`)) construireBatiment(type, cout);
};
window.construireBatiment = async function(type, coutPersonnalise) {
    const cout = coutPersonnalise || COUT_BATIMENTS[type];
    if ((monProfil.or || 0) < cout) { alert("Pas assez de Francs Otaku !"); return; }
    monProfil.or -= cout;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
    const village = await getVillage(monProfil.clan);
    village.batiments[type] = (village.batiments[type] || 0) + 1;
    if (type === "caserne") village.mecontentement = Math.max(0, village.mecontentement - 5);
    await setDoc(doc(db, "villages", monProfil.clan), village);
    document.getElementById('orAffiche').innerText = monProfil.or;
    afficherStats(); await afficherVillage();
    await ajouterEvenement(`🏗️ ${monProfil.clan} a construit/amélioré : ${type} !`);
};
window.changerTaxe = async function(valeur) {
    const village = await getVillage(monProfil.clan);
    village.taux = parseInt(valeur);
    await setDoc(doc(db, "villages", monProfil.clan), village);
    document.getElementById('tauxActuel').innerText = village.taux;
};
window.collecterImpots = async function() {
    const village = await getVillage(monProfil.clan);
    const nbMembres = tousLesMembres.length || 1;
    const revenu = Math.round(nbMembres * village.taux * 0.8);
    const reductionTemple = village.batiments.temple * 4;
    const hausse = Math.max(0, Math.round(village.taux * 0.3) - reductionTemple);
    monProfil.or = (monProfil.or || 0) + revenu;
    village.mecontentement = Math.min(100, Math.max(0, village.mecontentement + hausse));
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
    await setDoc(doc(db, "villages", monProfil.clan), village);
    document.getElementById('orAffiche').innerText = monProfil.or;
    afficherStats(); await afficherVillage();
    await ajouterEvenement(`💰 ${monProfil.pseudo} a collecté ${revenu} 🪙 d'impôts. Mécontentement : ${village.mecontentement}%.`);
};
window.collecterRessources = async function() {
    const village = await getVillage(monProfil.clan);
    village.ressources.bois += village.batiments.scierie * 15;
    village.ressources.pierre += village.batiments.carriere * 15;
    village.ressources.nourriture += village.batiments.ferme * 15;
    await setDoc(doc(db, "villages", monProfil.clan), village);
    await afficherVillage();
    alert("Ressources récoltées !");
};
window.seRevolter = async function() {
    const village = await getVillage(monProfil.clan);
    if (Math.random() < village.mecontentement / 100) {
        const membresClan = tousLesMembres.filter(m => m.clan === monProfil.clan);
        const ancienChef = membresClan.find(m => m.role === "Chef");
        if (ancienChef) await updateDoc(doc(db, "membres", ancienChef.id), { role: "Membre", grade: "Recrue" });
        await updateDoc(doc(db, "membres", monId), { role: "Chef", grade: "Chef" });
        village.mecontentement = 10;
        await setDoc(doc(db, "villages", monProfil.clan), village);
        monProfil.role = "Chef"; monProfil.grade = "Chef";
        document.getElementById('gradeAffiche').innerText = "Chef";
        await ajouterEvenement(`🔥 RÉVOLTE ! ${monProfil.pseudo} a renversé l'ancien chef de ${monProfil.clan} !`);
        alert("La révolte a réussi !"); afficherVillage();
    } else {
        await ajouterEvenement(`🔥 Une révolte dans ${monProfil.clan} a échoué...`);
        alert("La révolte a échoué.");
    }
};
window.guerreVillage = async function() {
    const autresClans = CLANS.filter(c => c !== monProfil.clan);
    const cible = prompt("Déclarer la guerre à quel clan ? " + autresClans.join(" / "));
    if (!autresClans.includes(cible)) { alert("Clan invalide."); return; }
    const villageNous = await getVillage(monProfil.clan);
    const villageEux = await getVillage(cible);
    if (villageNous.alliances.includes(cible)) { alert("Vous êtes alliés !"); return; }
    const forceNous = tousLesMembres.reduce((s,m) => s + (m.prestige||0), 0) + villageNous.batiments.caserne*30 + villageNous.batiments.mur*20;
    const forceEux = 200 + Math.random()*300 + villageEux.batiments.caserne*30 + villageEux.batiments.mur*20;
    if (forceNous >= forceEux) {
        const butinOr = Math.min(villageEux.tresor, 200);
        villageEux.tresor -= butinOr; villageNous.tresor += butinOr;
        villageEux.mecontentement = Math.min(100, villageEux.mecontentement + 20);
        villageNous.territoire = (villageNous.territoire||5) + 1;
        villageEux.territoire = Math.max(1, (villageEux.territoire||5) - 1);
        monProfil.prestige = (monProfil.prestige||0) + 50;
        await setDoc(doc(db, "villages", cible), villageEux);
        await setDoc(doc(db, "villages", monProfil.clan), villageNous);
        await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
        await ajouterEvenement(`⚔️ ${monProfil.clan} a vaincu ${cible} ! Butin : ${butinOr} 🪙, territoire gagné.`);
        alert(`Victoire ! Butin : ${butinOr} 🪙`);
    } else {
        monProfil.prestige = Math.max(0, (monProfil.prestige||0) - 20);
        await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
        await ajouterEvenement(`⚔️ ${monProfil.clan} a perdu la guerre contre ${cible}...`);
        alert("Défaite...");
    }
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats(); await afficherVillage(); await afficherCarteMonde();
};
window.proposerAlliance = async function() {
    const autresClans = CLANS.filter(c => c !== monProfil.clan);
    const cible = prompt("Alliance avec quel clan ? " + autresClans.join(" / "));
    if (!autresClans.includes(cible)) { alert("Clan invalide."); return; }
    const villageNous = await getVillage(monProfil.clan);
    const villageEux = await getVillage(cible);
    if (!villageNous.alliances.includes(cible)) villageNous.alliances.push(cible);
    if (!villageEux.alliances.includes(monProfil.clan)) villageEux.alliances.push(monProfil.clan);
    await setDoc(doc(db, "villages", monProfil.clan), villageNous);
    await setDoc(doc(db, "villages", cible), villageEux);
    await ajouterEvenement(`🤝 ${monProfil.clan} et ${cible} sont désormais alliés !`);
    await afficherVillage();
    alert(`Alliance conclue avec ${cible} !`);
};

// ---------------- BOUTIQUE / INVENTAIRE ----------------
const OBJETS_BOUTIQUE = [];
const ARMES = ["Dague","Épée","Hache","Lance","Marteau","Katana","Arbalète","Fléau","Trident","Sabre"];
ARMES.forEach((nom, i) => OBJETS_BOUTIQUE.push({ id: "arme"+i, nom: `⚔️ ${nom}`, prix: 80 + i*40, bonus: 0.08 + i*0.03, desc: `+${Math.round((0.08+i*0.03)*100)}% force` }));
const RELIQUES = ["Amulette","Grimoire","Couronne miniature","Anneau ancien","Cristal de pouvoir","Masque rituel","Parchemin sacré","Statuette","Sceau royal","Orbe mystique"];
RELIQUES.forEach((nom, i) => OBJETS_BOUTIQUE.push({ id: "relique"+i, nom: `💎 ${nom}`, prix: 100 + i*50, prestige: 10 + i*8, desc: `+${10+i*8} prestige` }));
const PROPRIETES = ["Cabane","Ferme privée","Terrain","Entrepôt","Tour de guet","Manoir","Forteresse","Château","Citadelle","Palais"];
PROPRIETES.forEach((nom, i) => OBJETS_BOUTIQUE.push({ id: "prop"+i, nom: `🏞️ ${nom}`, prix: 150 + i*100, prestige: 15 + i*10, revenu: 2 + i*2, desc: `+${15+i*10} prestige, +${2+i*2}🪙/collecte` }));

function afficherBoutique() {
    const box = document.getElementById('boutiqueBox'); box.innerHTML = "";
    OBJETS_BOUTIQUE.forEach(o => box.innerHTML += `<div class="objetBoutique"><span>${o.nom} — ${o.desc} (${o.prix} 🪙)</span><button onclick="acheterObjet('${o.id}')">Acheter</button></div>`);
}
window.acheterObjet = async function(id) {
    const objet = OBJETS_BOUTIQUE.find(o => o.id === id);
    if ((monProfil.or || 0) < objet.prix) { alert("Pas assez de Francs Otaku !"); return; }
    monProfil.or -= objet.prix;
    let updates = { or: monProfil.or, inventaire: arrayUnion(objet.nom) };
    if (objet.bonus) { monProfil.arme = objet.nom; monProfil.bonusForce = (monProfil.bonusForce || 0) + objet.bonus; updates.arme = monProfil.arme; updates.bonusForce = monProfil.bonusForce; }
    if (objet.prestige) { monProfil.prestige = (monProfil.prestige || 0) + objet.prestige; updates.prestige = monProfil.prestige; }
    if (objet.revenu) { monProfil.revenuTotal = (monProfil.revenuTotal || 0) + objet.revenu; updates.revenuTotal = monProfil.revenuTotal; }
    await updateDoc(doc(db, "membres", monId), updates);
    if (!monProfil.inventaire) monProfil.inventaire = [];
    monProfil.inventaire.push(objet.nom);
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;
    afficherStats(); afficherInventaire();
    alert(`Acheté : ${objet.nom} !`);
};
function afficherInventaire() {
    const box = document.getElementById('inventaireBox'); box.innerHTML = "";
    const inv = monProfil.inventaire || [];
    if (inv.length === 0) { box.innerHTML = "<p>Inventaire vide.</p>"; return; }
    const compte = {}; inv.forEach(item => compte[item] = (compte[item]||0)+1);
    Object.entries(compte).forEach(([item, nb]) => box.innerHTML += `<p>${item} ${nb > 1 ? "x"+nb : ""}</p>`);
}

// ---------------- DIPLOMATIE / COMMANDEMENT (Fondateur) ----------------
function afficherDiplomatie() {
    if (monProfil.role !== "Fondateur") return;
    document.getElementById('sectionDiplomatie').style.display = 'block';
    document.getElementById('zoneFondateurGuerre').style.display = 'block';
    document.getElementById('zoneFondateurTournoi').style.display = 'block';
    const box = document.getElementById('boiteDiplomatie'); box.innerHTML = "";
    const chefs = [
        { nom: "Aimé", clan: CLANS[0] }, { nom: "Binbinks", clan: CLANS[1] },
        { nom: "Ortiniel", clan: CLANS[2] }, { nom: "Chef du Phénix", clan: CLANS[3] }
    ];
    chefs.forEach(c => {
        box.innerHTML += `<div class="membreLigne"><span>${c.nom} (${c.clan})</span>
            <button onclick="envoyerEmissaire('${c.nom}','${c.clan}')">🗝️</button>
            <button onclick="envoyerAttaquer('${c.nom}','${c.clan}')">⚔️</button>
            <button onclick="declarerGuerre('${c.nom}','${c.clan}')">⚠️</button></div>`;
    });
}
window.envoyerEmissaire = async function(nomChef, clan) {
    const resultats = [
        { texte: `${nomChef} a accueilli l'émissaire. Alliance renforcée !`, or: 50, prestige: 15 },
        { texte: `${nomChef} a accepté un accord mineur.`, or: 20, prestige: 5 },
        { texte: `${nomChef} a refusé. Tensions.`, or: 0, prestige: -5 }
    ];
    const resultat = resultats[Math.floor(Math.random() * resultats.length)];
    monProfil.or = (monProfil.or || 0) + resultat.or;
    monProfil.prestige = Math.max(0, (monProfil.prestige || 0) + resultat.prestige);
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or, prestige: monProfil.prestige });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats();
    await ajouterEvenement(`🗝️ Samuel → ${clan} : ${resultat.texte}`);
    alert(resultat.texte);
};
window.envoyerAttaquer = async function(nomChef, clan) {
    const forceEnvoyee = monArmeePersonnelle.reduce((s,u) => s+u.force, 0) * 0.1 * (0.8+Math.random()*0.4);
    const resistance = 500 + Math.random()*500;
    let texte;
    if (forceEnvoyee >= resistance) { monProfil.prestige = (monProfil.prestige||0) + 30; texte = `⚔️ Samuel a attaqué ${clan} avec succès ! +30 prestige.`; }
    else { monProfil.prestige = Math.max(0,(monProfil.prestige||0) - 10); texte = `⚔️ L'attaque contre ${clan} a échoué. -10 prestige.`; }
    await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats(); await ajouterEvenement(texte); alert(texte);
};
window.declarerGuerre = async function(nomChef, clan) {
    await ajouterEvenement(`⚠️ Samuel a déclaré la guerre au ${clan} !`);
    alert(`Guerre déclarée contre ${clan} !`);
};
function afficherCommandement() {
    if (monProfil.role !== "Fondateur") return;
    document.getElementById('sectionCommandement').style.display = 'block';
    const forceTotale = monArmeePersonnelle.reduce((s,u) => s+u.force, 0);
    document.getElementById('resumeArmee').innerText = `${monArmeePersonnelle.length} soldats — force totale : ${forceTotale}`;
    const box = document.getElementById('listeArmee'); box.innerHTML = "";
    monArmeePersonnelle.slice(0, 15).forEach((s, i) => {
        box.innerHTML += `<div class="membreLigne"><span>🗝️ ${s.nom} (force ${s.force})</span><button onclick="assignerSoldat(${i})">🎯</button></div>`;
    });
    box.innerHTML += `<p><i>...et ${monArmeePersonnelle.length - 15} autres.</i></p>`;
}
window.assignerSoldat = async function(index) {
    const soldat = monArmeePersonnelle[index];
    const cible = prompt("Cible (nom du clan) ?");
    if (!cible) return;
    const reussite = (soldat.force + Math.random()*30) >= (40 + Math.random()*50);
    const texte = reussite ? `🎯 ${soldat.nom} a réussi contre ${cible} !` : `🎯 ${soldat.nom} a échoué contre ${cible}...`;
    if (reussite) {
        monProfil.prestige = (monProfil.prestige||0) + 5;
        await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        afficherStats();
    }
    await ajouterEvenement(texte); alert(texte);
};
window.pillerVillage = async function() {
    const cible = prompt("Piller quel clan ? " + CLANS.join(" / "));
    if (!CLANS.includes(cible)) { alert("Clan invalide."); return; }
    const village = await getVillage(cible);
    const forceBandits = monArmeePersonnelle.slice(0,50).reduce((s,u)=>s+u.force,0) * (0.8+Math.random()*0.4);
    const defense = 100 + village.batiments.caserne*40 + village.batiments.mur*50;
    if (forceBandits >= defense) {
        const butin = Math.min(village.tresor, 150);
        village.tresor -= butin; village.mecontentement = Math.min(100, village.mecontentement + 15);
        monProfil.or = (monProfil.or||0) + butin;
        await setDoc(doc(db, "villages", cible), village);
        await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
        document.getElementById('orAffiche').innerText = monProfil.or;
        await ajouterEvenement(`🏴‍☠️ Les bandits de Samuel ont pillé ${cible} ! Butin : ${butin} 🪙.`);
        alert(`Raid réussi ! +${butin} 🪙`);
    } else {
        await ajouterEvenement(`🏴‍☠️ Le raid contre ${cible} a été repoussé.`);
        alert("Raid repoussé.");
    }
    afficherStats();
};

// ---------------- ADMINISTRATION SUPRÊME ----------------
function afficherAdmin() {
    if (monProfil.role !== "Fondateur") return;
    document.getElementById('sectionAdmin').style.display = 'block';
    onSnapshot(collection(db, "membres"), (snap) => {
        const box = document.getElementById('listeAdmin'); box.innerHTML = "";
        snap.forEach(d => {
            if (d.id === monId) return;
            const m = d.data();
            box.innerHTML += `<div class="membreLigne"><span>${m.avatar||""} ${m.pseudo} (${m.clan||"Aucun"}) ${m.banni ? "🚫" : ""}</span>
                <button onclick="adminDonnerOr('${d.id}')">💰</button>
                <button onclick="adminDonnerPrestige('${d.id}')">🏆</button>
                <button onclick="adminChangerRole('${d.id}')">🔄</button>
                <button onclick="adminChangerClan('${d.id}')">🎯</button>
                <button onclick="adminBannir('${d.id}', ${m.banni||false})">🚫</button></div>`;
        });
    });
}
window.adminDonnerOr = async function(id) {
    const montant = parseInt(prompt("Combien d'or donner (peut être négatif) ?", "100"));
    if (isNaN(montant)) return;
    const snap = await getDoc(doc(db, "membres", id));
    const m = snap.data();
    await updateDoc(doc(db, "membres", id), { or: Math.max(0, (m.or||0) + montant) });
    await ajouterEvenement(`🛠️ Samuel a modifié l'or de ${m.pseudo}.`);
};
window.adminDonnerPrestige = async function(id) {
    const montant = parseInt(prompt("Combien de prestige donner (peut être négatif) ?", "50"));
    if (isNaN(montant)) return;
    const snap = await getDoc(doc(db, "membres", id));
    const m = snap.data();
    await updateDoc(doc(db, "membres", id), { prestige: Math.max(0, (m.prestige||0) + montant) });
    await ajouterEvenement(`🛠️ Samuel a modifié le prestige de ${m.pseudo}.`);
};
window.adminChangerRole = async function(id) {
    const nouveauRole = prompt("Nouveau rôle/grade ? (Membre / Chef / Officier / Lieutenant / Bras droit)");
    if (!nouveauRole) return;
    await updateDoc(doc(db, "membres", id), { role: nouveauRole, grade: nouveauRole });
    await ajouterEvenement(`🛠️ Samuel a changé un rôle en ${nouveauRole}.`);
};
window.adminChangerClan = async function(id) {
    const nouveauClan = prompt("Nouveau clan ? " + CLANS.join(" / "));
    if (!CLANS.includes(nouveauClan)) { alert("Clan invalide."); return; }
    await updateDoc(doc(db, "membres", id), { clan: nouveauClan });
    await ajouterEvenement(`🛠️ Samuel a transféré un membre vers ${nouveauClan}.`);
};
window.adminBannir = async function(id, etaitBanni) {
    await updateDoc(doc(db, "membres", id), { banni: !etaitBanni });
    await ajouterEvenement(`🛠️ Samuel a ${etaitBanni ? "débanni" : "banni"} un membre.`);
};

// ---------------- COMBAT ----------------
function demarrerAdversaires() {
    onSnapshot(query(collection(db, "membres"), where("clan", "!=", monProfil.clan || "___aucun___")), (snap) => {
        const box = document.getElementById('listeAdversaires');
        box.innerHTML = "<p><b>👤 Joueurs</b></p>";
        snap.forEach(d => {
            const m = d.data();
            box.innerHTML += `<div class="membreLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan}','${m.specialite||''}','${m.grade || m.role}',${m.prestige || 0})">${m.avatar||""} ${m.pseudo} (${m.clan})</span><button onclick="combattre('${d.id}', false)">⚔️</button></div>`;
        });
        box.innerHTML += "<p><b>🤖 Habitants du monde</b></p>";
        const echantillon = pnjPool.filter(p => p.clan !== monProfil.clan).sort(() => 0.5 - Math.random()).slice(0, 10);
        echantillon.forEach(p => {
            box.innerHTML += `<div class="membreLigne"><span onclick="voirProfil('${p.pseudo}','${p.clan}','${p.specialite}','PNJ',${p.prestige})">${p.pseudo} (${p.clan})</span><button onclick="combattre('${p.id}', true)">⚔️</button></div>`;
        });
    });
}
async function verifierEvenementPNJ() {
    if (Math.random() < 0.25) {
        const pnjAttaquant = pnjPool[Math.floor(Math.random()*pnjPool.length)];
        const perte = Math.floor(Math.random()*10);
        monProfil.prestige = Math.max(0, (monProfil.prestige||0) - perte);
        await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        document.getElementById('evenementAleatoire').innerText = `⚠️ ${pnjAttaquant.pseudo} t'a attaqué ! -${perte} prestige.`;
        afficherStats();
    }
}
window.combattre = async function(idAdversaire, estPNJ) {
    let adv;
    if (estPNJ) adv = pnjPool.find(p => p.id === idAdversaire);
    else { const snap = await getDoc(doc(db, "membres", idAdversaire)); adv = snap.data(); }
    const bonusType = (AVANTAGES[monProfil.specialite] === adv.specialite) ? 1.4 : 1;
    const bonusTypeAdv = (AVANTAGES[adv.specialite] === monProfil.specialite) ? 1.4 : 1;
    const forceMoi = ((monProfil.prestige || 0) + 50) * bonusType * (1 + (monProfil.bonusForce || 0)) * (0.85 + Math.random() * 0.3);
    const forceAdv = ((adv.prestige || 0) + 50) * bonusTypeAdv * (0.85 + Math.random() * 0.3);
    const resultat = document.getElementById('resultatCombat');
    if (forceMoi >= forceAdv) {
        const gain = estPNJ ? 10 : 20; const gainPrestige = estPNJ ? 4 : 10;
        monProfil.or = (monProfil.or || 0) + gain; monProfil.prestige = (monProfil.prestige || 0) + gainPrestige;
        await updateDoc(doc(db, "membres", monId), { or: monProfil.or, prestige: monProfil.prestige });
        if (!estPNJ) await updateDoc(doc(db, "membres", idAdversaire), { prestige: Math.max(0, (adv.prestige || 0) - 5) });
        resultat.innerText = `🏆 Victoire contre ${adv.pseudo} ! +${gain} 🪙, +${gainPrestige} prestige.`;
        await ajouterEvenement(`${monProfil.pseudo} a vaincu ${adv.pseudo} !`);
    } else {
        monProfil.prestige = Math.max(0, (monProfil.prestige || 0) - 5);
        await updateDoc(doc(db, "membres", monId), { prestige: monProfil.prestige });
        resultat.innerText = `💀 Défaite contre ${adv.pseudo}... -5 prestige.`;
    }
    document.getElementById('orAffiche').innerText = monProfil.or || 0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;
    afficherStats();
};

// ---------------- GUERRE DES ROYAUMES (réelle) ----------------
window.commencerGuerreRoyaumes = async function() {
    const fin = Date.now() + 10 * 60 * 1000;
    await setDoc(doc(db, "monde", "guerreRoyaumes"), { statut: "compteARebours", fin, resolue: false });
    await ajouterEvenement("👑 Samuel a annoncé le début de la Guerre des Royaumes ! Compte à rebours lancé.");
};
function surveillerGuerreRoyaumes() {
    onSnapshot(doc(db, "monde", "guerreRoyaumes"), (snap) => {
        if (!snap.exists()) return;
        const g = snap.data();
        if (g.statut === "compteARebours" && !g.resolue) {
            document.getElementById('statutGuerreRoyaumes').innerText = "Compte à rebours en cours...";
            demarrerCompteARebours(g.fin);
        } else if (g.resolue) {
            document.getElementById('statutGuerreRoyaumes').innerText = `🔥 La guerre a eu lieu ! Vainqueur : ${g.vainqueur}`;
            document.getElementById('compteARebours').innerText = "";
        }
    });
}
let intervalGuerre = null;
function demarrerCompteARebours(fin) {
    if (intervalGuerre) clearInterval(intervalGuerre);
    intervalGuerre = setInterval(async () => {
        const restant = fin - Date.now();
        if (restant <= 0) {
            clearInterval(intervalGuerre);
            document.getElementById('compteARebours').innerText = "🔥 LA GUERRE COMMENCE !";
            if (monProfil.role === "Fondateur") await resoudreGuerreRoyaumes();
            return;
        }
        const min = Math.floor(restant / 60000);
        const sec = Math.floor((restant % 60000) / 1000);
        document.getElementById('compteARebours').innerText = `${min}:${sec.toString().padStart(2,'0')}`;
    }, 1000);
}
async function resoudreGuerreRoyaumes() {
    const forces = {};
    for (const clan of CLANS) {
        const village = await getVillage(clan);
        const membresClan = await getDocs(query(collection(db, "membres"), where("clan", "==", clan)));
        let total = 0;
        membresClan.forEach(d => total += (d.data().prestige||0));
        forces[clan] = total + (village.batiments.caserne||0)*30 + Math.random()*100;
    }
    const vainqueur = Object.entries(forces).sort((a,b) => b[1]-a[1])[0][0];
    await setDoc(doc(db, "monde", "guerreRoyaumes"), { statut: "terminee", resolue: true, vainqueur });
    await ajouterEvenement(`🔥 La Guerre des Royaumes est terminée ! ${vainqueur} règne sur le monde !`);
};

// ---------------- QUÊTE / BOSS ----------------
function afficherQuete() {
    document.getElementById('queteTexte').innerText = "Gagne 3 combats aujourd'hui pour une récompense (30🪙, 15🏆).";
}
window.reclamerQuete = async function() {
    const derniere = localStorage.getItem('otakus_quete_' + monId);
    const aujourdHui = new Date().toDateString();
    if (derniere === aujourdHui) { alert("Déjà réclamée aujourd'hui."); return; }
    monProfil.or = (monProfil.or||0) + 30;
    monProfil.prestige = (monProfil.prestige||0) + 15;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or, prestige: monProfil.prestige });
    localStorage.setItem('otakus_quete_' + monId, aujourdHui);
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats();
    alert("Récompense réclamée !");
};
async function afficherBoss() {
    const ref = doc(db, "monde", "boss");
    let snap = await getDoc(ref);
    if (!snap.exists()) { await setDoc(ref, { nom: "Dragon Noir", pvMax: 5000, pv: 5000 }); snap = await getDoc(ref); }
    const b = snap.data();
    document.getElementById('infosBoss').innerText = `${b.nom} — PV : ${b.pv}/${b.pvMax}`;
}
window.attaquerBoss = async function() {
    const ref = doc(db, "monde", "boss");
    const snap = await getDoc(ref);
    const b = snap.data();
    const degats = Math.round(20 + (monProfil.prestige||0)*0.2 + (monProfil.bonusForce||0)*30);
    const nouveauxPV = Math.max(0, b.pv - degats);
    await updateDoc(ref, { pv: nouveauxPV });
    monProfil.or = (monProfil.or||0) + 10;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    await afficherBoss();
    if (nouveauxPV === 0) {
        await updateDoc(ref, { pv: b.pvMax });
        await ajouterEvenement(`🐉 Le ${b.nom} a été vaincu par la communauté !`);
        alert("Le Boss a été vaincu !");
    } else {
        alert(`Tu as infligé ${degats} dégâts au ${b.nom} !`);
    }
};

// ---------------- CARTE / TRÔNE / CLASSEMENTS ----------------
async function afficherCarteMonde() {
    let html = "";
    for (const clan of CLANS) {
        const village = await getVillage(clan);
        html += `<p>🏰 ${clan} — Territoire : ${village.territoire||5} 🗺️ | Trésor : ${village.tresor}🪙</p>`;
    }
    document.getElementById('carteMonde').innerHTML = html;
}
async function afficherTrone() {
    const snap = await getDoc(doc(db, "monde", "trone"));
    if (snap.exists()) { const t = snap.data(); document.getElementById('roiActuel').innerText = `${t.pseudo} (${t.clan})`; }
    else document.getElementById('roiActuel').innerText = "Aucun — trône vacant";
    demarrerInscrits();
}
function demarrerInscrits() {
    onSnapshot(collection(db, "tournoiInscrits"), (snap) => {
        const box = document.getElementById('listeInscrits'); box.innerHTML = "";
        snap.forEach(d => { const p = d.data(); box.innerHTML += `<p>🎗️ ${p.pseudo} (${p.clan})</p>`; });
    });
}
window.inscrireTournoi = async function() {
    await setDoc(doc(db, "tournoiInscrits", monId), { pseudo: monProfil.pseudo, clan: monProfil.clan, prestige: monProfil.prestige||0, bonusForce: monProfil.bonusForce||0 });
    alert("Inscrit au tournoi !");
};
window.lancerTournoi = async function() {
    const snap = await getDocs(collection(db, "tournoiInscrits"));
    let participants = []; snap.forEach(d => participants.push(d.data()));
    if (participants.length < 2) { alert("Pas assez d'inscrits."); return; }
    participants = participants.sort(() => 0.5 - Math.random());
    while (participants.length > 1) {
        const suivant = [];
        for (let i = 0; i < participants.length; i += 2) {
            if (i + 1 >= participants.length) { suivant.push(participants[i]); continue; }
            const a = participants[i], b = participants[i+1];
            const forceA = ((a.prestige||0)+50) * (1+(a.bonusForce||0)) * (0.85+Math.random()*0.3);
            const forceB = ((b.prestige||0)+50) * (1+(b.bonusForce||0)) * (0.85+Math.random()*0.3);
            suivant.push(forceA >= forceB ? a : b);
        }
        participants = suivant;
    }
    const vainqueur = participants[0];
    await setDoc(doc(db, "monde", "trone"), { pseudo: vainqueur.pseudo, clan: vainqueur.clan, date: serverTimestamp() });
    const inscritsSnap = await getDocs(collection(db, "tournoiInscrits"));
    for (const d of inscritsSnap.docs) await deleteDoc(doc(db, "tournoiInscrits", d.id));
    await ajouterEvenement(`👑 ${vainqueur.pseudo} devient Roi du Monde !`);
    afficherTrone();
    alert(`${vainqueur.pseudo} est le nouveau Roi !`);
};
async function demarrerClassements() {
    const snap = await getDocs(collection(db, "membres"));
    const tous = []; snap.forEach(d => tous.push(d.data()));
    const boxJ = document.getElementById('classementJoueurs'); boxJ.innerHTML = "";
    [...tous].sort((a,b) => (b.prestige||0)-(a.prestige||0)).slice(0,10).forEach((m,i) => boxJ.innerHTML += `<div class="rangLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan||''}','${m.specialite||''}','${m.grade || m.role}',${m.prestige || 0})">#${i+1} ${m.pseudo}</span><span>${m.prestige||0}🏆</span></div>`);
    const totaux = {}; tous.forEach(m => { if (m.clan) totaux[m.clan] = (totaux[m.clan]||0)+(m.prestige||0); });
    const boxC = document.getElementById('classementClans'); boxC.innerHTML = "";
    Object.entries(totaux).sort((a,b)=>b[1]-a[1]).forEach(([c,t],i) => boxC.innerHTML += `<div class="rangLigne"><span>#${i+1} ${c}</span><span>${t}🏆</span></div>`);
}

// ---------------- JOURNAL / STATS / PROFIL / PARAMÈTRES ----------------
async function ajouterEvenement(texte) { await addDoc(collection(db, "journal"), { texte, date: serverTimestamp() }); }
function demarrerJournal() {
    onSnapshot(query(collection(db, "journal"), orderBy("date", "desc")), (snap) => {
        const box = document.getElementById('journalBox'); box.innerHTML = "";
        let c = 0; snap.forEach(d => { if (c<20) { box.innerHTML += `<p>📌 ${d.data().texte}</p>`; c++; } });
    });
}
function calculerStats(profil) {
    const capacites = { Guerrier: "💥 Coup dévastateur", Archer: "🎯 Tir rapide", Stratège: "🧠 Vision tactique" };
    return {
        force: Math.round(40 + (profil.prestige || 0) * 0.4 + (profil.bonusForce || 0) * 100),
        rapidite: Math.round(30 + (profil.specialite === "Archer" ? 40 : 15) + (profil.prestige || 0) * 0.2),
        agilite: Math.round(30 + (profil.specialite === "Stratège" ? 35 : 15) + (profil.prestige || 0) * 0.2),
        pv: Math.round(100 + (profil.prestige || 0) * 0.3 + (profil.bonusForce || 0) * 50),
        capacite: capacites[profil.specialite] || "Aucune (Fondateur)"
    };
}
function afficherStats() {
    const s = calculerStats(monProfil);
    document.getElementById('statsBox').innerHTML = `<p>💪 Force : ${s.force}</p><p>⚡ Rapidité : ${s.rapidite}</p><p>🤸 Agilité : ${s.agilite}</p><p>❤️ PV : ${s.pv}</p><p>✨ Capacité : ${s.capacite}</p><p>🏞️ Revenu/collecte : +${monProfil.revenuTotal || 0} 🪙</p>`;
}
window.travailler = async function() {
    const derniereFois = localStorage.getItem('otakus_travail_' + monId);
    const maintenant = Date.now();
    const attente = 45 * 60 * 1000;
    if (derniereFois && (maintenant - parseInt(derniereFois)) < attente) {
        const restant = Math.ceil((attente - (maintenant - parseInt(derniereFois))) / 60000);
        document.getElementById('messageTravail').innerText = `Reviens dans ${restant} min.`;
        return;
    }
    const gain = 15 + Math.floor(Math.random() * 10) + (monProfil.revenuTotal || 0);
    monProfil.or = (monProfil.or || 0) + gain;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('messageTravail').innerText = `+${gain} 🪙 gagnés !`;
    localStorage.setItem('otakus_travail_' + monId, maintenant.toString());
};
window.voirProfil = function(pseudo, clan, specialite, grade, prestige) {
    document.getElementById('panelPseudo').innerText = pseudo;
    document.getElementById('panelInfos').innerHTML = `Clan : ${clan || 'Aucun — Fondateur'}<br>Spécialité : ${specialite || '?'}<br>Grade : ${grade || '?'}<br>Prestige : ${prestige || 0} 🏆`;
    document.getElementById('panelProfil').style.display = 'block';
};
window.fermerPanel = function() { document.getElementById('panelProfil').style.display = 'none'; };
window.ouvrirParametres = function() { document.getElementById('panelParametres').style.display = 'block'; };
window.fermerParametres = function() { document.getElementById('panelParametres').style.display = 'none'; };
window.seDeconnecter = function() { localStorage.removeItem('otakus_id'); location.reload(); };
window.reinitialiserCache = function() { if (confirm("Effacer les données locales ?")) { localStorage.clear(); location.reload(); } };
window.changerPseudo = async function() {
    const nouveau = prompt("Nouveau pseudo :", monProfil.pseudo);
    if (!nouveau) return;
    const dejaExiste = await getDocs(query(collection(db, "membres"), where("pseudo", "==", nouveau)));
    if (!dejaExiste.empty) { alert("Ce pseudo est déjà pris."); return; }
    monProfil.pseudo = nouveau;
    await updateDoc(doc(db, "membres", monId), { pseudo: nouveau });
    document.getElementById('pseudoAffiche').innerText = nouveau;
};

const savedId = localStorage.getItem('otakus_id');
if (savedId) { document.getElementById('codeInput').value = CODE_COMMUN; seConnecter(); }
