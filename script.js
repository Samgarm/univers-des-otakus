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
let CLANS = ["Clan du Dragon Écarlate", "Clan de la Lune d'Argent", "Clan du Sabre Noir", "Clan du Phénix Doré"];
const AVANTAGES = { Guerrier: "Stratège", Stratège: "Archer", Archer: "Guerrier" };
const GRADES = ["Recrue", "Officier", "Lieutenant", "Bras droit"];
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀"];
const ADJECTIFS_TERRITOIRE = ["Écarlate","Perdu","Maudit","Doré","Glacé","Ardent","Oublié","Sacré","Brumeux","Ancestral","Sanglant","Éternel"];
const NOMS_BASE_TERRITOIRE = ["Vallée","Forêt","Pic","Désert","Baie","Plaine","Cité","Montagne","Marais","Île","Ruines","Vallon","Falaise","Oasis","Royaume","Bastion"];
const HISTOIRES_CLANS = {
    "Clan du Dragon Écarlate": "Nés des cendres d'un volcan sacré, les guerriers du Dragon Écarlate croient que le feu purifie les faibles et forge les héros.",
    "Clan de la Lune d'Argent": "Peuple mystique vivant sous le clair de lune, ils maîtrisent la stratégie et la patience plutôt que la force brute.",
    "Clan du Sabre Noir": "D'anciens mercenaires devenus une fraternité redoutée, unis par un code d'honneur strict et une lame jamais rangée.",
    "Clan du Phénix Doré": "Renaissant sans cesse de ses défaites, ce clan jeune mais ambitieux promet à ses membres une seconde chance, toujours."
};
const TITRES_PNJ = ["Seigneur des Cendres","Gardien Sanglant","Ombre Ancestrale","Roi Déchu","Bête du Territoire","Sentinelle Maudite","Golem de Pierre","Chasseur Silencieux"];
const QUETES_JOUR = [
    { texte: "Gagne 3 combats aujourd'hui.", or: 20, prestige: 10 },
    { texte: "Récolte des ressources dans ton village.", or: 15, prestige: 5 },
    { texte: "Attaque le Boss mondial au moins une fois.", or: 25, prestige: 8 },
    { texte: "Envoie un message à ton clan.", or: 10, prestige: 5 },
    { texte: "Explore un nouveau territoire.", or: 30, prestige: 12 }
];

let monId = "";
let monProfil = {};
let pnjPool = [];
let monArmeePersonnelle = [];
let tousLesMembres = [];
let avatarChoisi = "🧝";
let clanInscriptionChoisi = "";
let etapeTuto = 0;

// ================= PNJ =================
function genererPNJ() {
    const prenoms = ["Kiro","Yuna","Ren","Sora","Aki","Haru","Miko","Kenji","Sayo","Riku","Ayame","Tatsu","Nozomi","Kaito","Mei"];
    const suffixes = ["no Kage","le Silencieux","du Vent","la Flamme","de l'Ombre","le Rapide","des Cimes","la Loyale"];
    const specialites = ["Guerrier","Archer","Stratège"];
    let pnjs = [];
    for (let i = 0; i < 150; i++) {
        const nom = prenoms[Math.floor(Math.random()*prenoms.length)] + " " + suffixes[Math.floor(Math.random()*suffixes.length)];
        pnjs.push({ id: "PNJ_"+i, pseudo: nom, clan: "Errants",
            specialite: specialites[Math.floor(Math.random()*specialites.length)],
            prestige: Math.floor(Math.random()*150), pv: 80+Math.floor(Math.random()*100), estPNJ: true });
    }
    return pnjs;
}
function genererArmeeSamuel() {
    let armee = [];
    for (let i = 0; i < 300; i++) armee.push({ nom: "Garde Impérial " + i, force: 20 + Math.floor(Math.random()*30) });
    return armee;
}

// ================= CONNEXION =================
window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    const messageEl = document.getElementById('messageConnexion');
    if (!code) { messageEl.innerText = "Entrez un code."; return; }
    const savedId = localStorage.getItem('otakus_id');
    if (savedId && code === CODE_COMMUN) {
        const snap = await getDoc(doc(db, "membres", savedId));
        if (snap.exists() && !snap.data().banni) { monId = savedId; monProfil = snap.data(); afficherAccueil(); return; }
        localStorage.removeItem('otakus_id');
        messageEl.innerText = snap.exists() ? "Ce compte a été banni." : "Compte introuvable, inscris-toi.";
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

// ================= INSCRIPTION / RÉCUPÉRATION =================
window.ouvrirInscription = function() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('inscription').style.display = 'block';
    const zoneAv = document.getElementById('choixAvatarInscription'); zoneAv.innerHTML = "";
    AVATARS.forEach(a => zoneAv.innerHTML += `<button onclick="choisirAvatarInscription('${a}')">${a}</button>`);
    const zone = document.getElementById('listeClansInscription'); zone.innerHTML = "";
    CLANS.forEach(c => { zone.innerHTML += `<div class="clanChoix"><b>${c}</b> <button onclick="choisirClanInscription('${c}')">Rejoindre</button></div>`; });
};
window.choisirAvatarInscription = function(a) { avatarChoisi = a; alert("Avatar : " + a); };
window.choisirClanInscription = function(clan) {
    clanInscriptionChoisi = clan;
    alert(`${clan}\n\n${HISTOIRES_CLANS[clan] || "Un nouveau clan, son histoire reste à écrire..."}`);
};
window.retourConnexion = function() {
    document.getElementById('inscription').style.display = 'none';
    document.getElementById('recuperation').style.display = 'none';
    document.getElementById('connexion').style.display = 'block';
};
window.ouvrirRecuperation = function() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('recuperation').style.display = 'block';
};
function villageVierge() {
    return { taux: 20, tresor: 0, territoire: 1, carteDePaix: 0,
        batiments: { route:0, caserne:0, hotelDeVille:0, senat:0, ferme:0, carriere:0, scierie:0, mur:0, temple:0 },
        ressources: { bois:0, pierre:0, nourriture:0 }, enConstruction: null };
}
window.validerInscription = async function() {
    const codeSaisi = document.getElementById('codeInscriptionInput').value.trim();
    const pseudo = document.getElementById('pseudoInscriptionInput').value.trim();
    const specialite = document.getElementById('specialiteInscriptionInput').value;
    const msgEl = document.getElementById('messageInscription');
    if (codeSaisi !== CODE_COMMUN) { msgEl.innerText = "Code d'inscription invalide."; return; }
    if (!pseudo || !clanInscriptionChoisi) { msgEl.innerText = "Renseigne ton pseudo et choisis un clan."; return; }
    const dejaExiste = await getDocs(query(collection(db, "membres"), where("pseudo", "==", pseudo)));
    if (!dejaExiste.empty) { msgEl.innerText = "Ce pseudo est déjà pris."; return; }
    const nouveauId = "M" + Date.now();
    const codeRecup = String(Math.floor(100000 + Math.random() * 900000));
    const data = {
        pseudo, specialite, clan: clanInscriptionChoisi, role: "Membre", grade: "Recrue",
        or: 200, prestige: 0, arme: "Aucune", bonusForce: 0, revenuTotal: 0, inventaire: [],
        avatar: avatarChoisi, xp: 0, niveau: 1, banni: false, codeRecuperation: codeRecup,
        village: villageVierge(), premiereConnexion: true
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

// ================= TUTORIEL =================
const ETAPES_TUTO = [
    "🎯 Choisis un clan (ou crée le tien) pour rejoindre une communauté et participer aux guerres.",
    "🏰 Gère ton propre village : construis des bâtiments (or + ressources), récolte, collecte tes impôts dans le trésor.",
    "⚔️ Combats d'autres joueurs ou des habitants du monde pour gagner or et prestige.",
    "👑 Tous les 7 jours, la Guerre des Royaumes désigne un nouveau Roi du Monde avec des pouvoirs spéciaux !",
    "🧭 Explore de nouveaux territoires infinis, gardés par des chefs PNJ très puissants.",
    "🕊️ Utilise une carte de paix si tu veux te protéger temporairement des attaques.",
    "Bonne aventure, otaku !"
];
function afficherTutoriel() {
    etapeTuto = 0;
    document.getElementById('tutoTexte').innerText = ETAPES_TUTO[0];
    document.getElementById('tutoriel').style.display = 'block';
}
window.etapeTutoSuivante = function() {
    etapeTuto++;
    if (etapeTuto >= ETAPES_TUTO.length) { fermerTutoriel(); return; }
    document.getElementById('tutoTexte').innerText = ETAPES_TUTO[etapeTuto];
};
window.fermerTutoriel = function() { document.getElementById('tutoriel').style.display = 'none'; };
window.ouvrirTutorielManuel = function() { fermerParametres(); afficherTutoriel(); };

// ================= NAVIGATION =================
window.allerVers = function(idSection) {
    document.getElementById(idSection)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// ================= ACCUEIL =================
async function chargerClans() {
    const snap = await getDocs(collection(db, "clansPersonnalises"));
    snap.forEach(d => { if (!CLANS.includes(d.id)) CLANS.push(d.id); });
}
async function afficherAccueil() {
    document.getElementById('connexion').style.display = 'none';
    document.getElementById('inscription').style.display = 'none';
    document.getElementById('recuperation').style.display = 'none';
    document.getElementById('accueil').style.display = 'block';

    if (!monProfil.village) { monProfil.village = villageVierge(); await updateDoc(doc(db, "membres", monId), { village: monProfil.village }); }

    document.getElementById('avatarAffiche').innerText = monProfil.avatar || "🧝";
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo;
    document.getElementById('gradeAffiche').innerText = monProfil.grade || monProfil.role;
    document.getElementById('clanAffiche').innerText = monProfil.clan || "Aucun — Fondateur";
    document.getElementById('specialiteAffiche').innerText = monProfil.specialite || "";
    document.getElementById('orAffiche').innerText = monProfil.or || 0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige || 0;

    await chargerClans();
    pnjPool = genererPNJ();
    if (monProfil.role === "Fondateur") monArmeePersonnelle = genererArmeeSamuel();

    demarrerChat();
    demarrerMessagesPrives();
    afficherGestionClan();
    if (monProfil.clan) demarrerChatClan();
    demarrerAdversaires();
    demarrerClassements();
    demarrerJournal();
    afficherBoutique();
    afficherDiplomatie();
    afficherCommandement();
    afficherAdmin();
    afficherStats();
    afficherInventaire();
    afficherQuete();
    await afficherBoss();
    await afficherVillage();
    await afficherCarteMonde();
    await verifierRoiActuel();
    surveillerGuerreRoyaumes();
    verifierEvenementPNJ();

    if (monProfil.premiereConnexion) { afficherTutoriel(); await updateDoc(doc(db, "membres", monId), { premiereConnexion: false }); }
}

// ================= CHAT =================
window.envoyerMessage = async function() {
    const input = document.getElementById('messageInput');
    if (!input.value.trim()) return;
    await addDoc(collection(db, "messages"), { pseudo: monProfil.pseudo, texte: input.value.trim(), date: serverTimestamp() });
    input.value = "";
};
function demarrerChat() {
    onSnapshot(query(collection(db, "messages"), orderBy("date")), (snap) => {
        const box = document.getElementById('chatBox'); box.innerHTML = "";
        snap.forEach(d => { const m = d.data(); box.innerHTML += `<p><b>${m.pseudo} :</b> ${m.texte}</p>`; });
        box.scrollTop = box.scrollHeight;
    });
}
window.envoyerMessageClan = async function() {
    const input = document.getElementById('messageClanInput');
    if (!input.value.trim() || !monProfil.clan) return;
    await addDoc(collection(db, "messagesClan"), { pseudo: monProfil.pseudo, clan: monProfil.clan, texte: input.value.trim(), date: serverTimestamp() });
    input.value = "";
};
function demarrerChatClan() {
    onSnapshot(query(collection(db, "messagesClan"), where("clan", "==", monProfil.clan), orderBy("date")), (snap) => {
        const box = document.getElementById('chatClanBox'); box.innerHTML = "";
        snap.forEach(d => { const m = d.data(); box.innerHTML += `<p><b>${m.pseudo} :</b> ${m.texte}</p>`; });
        box.scrollTop = box.scrollHeight;
    });
}

// ================= MESSAGES PRIVÉS + NOTIFICATIONS =================
function demarrerMessagesPrives() {
    onSnapshot(collection(db, "membres"), (snap) => {
        const select = document.getElementById('destinatairePrive'); select.innerHTML = "";
        snap.forEach(d => { if (d.id !== monId) select.innerHTML += `<option value="${d.id}">${d.data().pseudo}</option>`; });
    });
    onSnapshot(query(collection(db, "messagesPrives"), where("destinataireId", "==", monId), orderBy("date","desc")), (snap) => {
        const box = document.getElementById('messagesPrivesBox'); box.innerHTML = "";
        let nonLus = 0;
        snap.forEach(d => { const m = d.data(); box.innerHTML += `<p><b>${m.expediteur} → toi :</b> ${m.texte}</p>`; if (!m.lu) nonLus++; });
        document.getElementById('compteurNotif').innerText = nonLus;
        document.getElementById('badgeNotif').style.display = nonLus > 0 ? 'block' : 'none';
    });
}
window.envoyerMessagePrive = async function() {
    const destId = document.getElementById('destinatairePrive').value;
    const input = document.getElementById('messagePriveInput');
    if (!input.value.trim() || !destId) return;
    await addDoc(collection(db, "messagesPrives"), { expediteur: monProfil.pseudo, expediteurId: monId, destinataireId: destId, texte: input.value.trim(), date: serverTimestamp(), lu: false });
    input.value = "";
    alert("Message envoyé !");
};

// ================= GESTION DE CLAN =================
function afficherGestionClan() {
    if (!monProfil.clan) {
        document.getElementById('zoneSansClan').style.display = 'block';
        document.getElementById('zoneAvecClan').style.display = 'none';
        const box = document.getElementById('listeClansDisponibles'); box.innerHTML = "";
        CLANS.forEach(c => box.innerHTML += `<div class="membreLigne"><span>${c}</span><button onclick="rejoindreClan('${c}')">Rejoindre</button></div>`);
    } else {
        document.getElementById('zoneAvecClan').style.display = 'block';
        document.getElementById('zoneSansClan').style.display = 'none';
        demarrerListeClan();
        if (monProfil.role === "Chef") document.getElementById('zoneNommerViceChef').style.display = 'block';
    }
}
window.creerClan = async function() {
    const nomClan = prompt("Nom de ton nouveau clan :");
    if (!nomClan) return;
    if (CLANS.includes(nomClan)) { alert("Ce clan existe déjà."); return; }
    await setDoc(doc(db, "clansPersonnalises", nomClan), { fondateur: monProfil.pseudo, dateCreation: serverTimestamp() });
    CLANS.push(nomClan);
    monProfil.clan = nomClan; monProfil.role = "Chef"; monProfil.grade = "Chef";
    await updateDoc(doc(db, "membres", monId), { clan: nomClan, role: "Chef", grade: "Chef" });
    await ajouterEvenement(`🏘️ ${monProfil.pseudo} a fondé le clan ${nomClan} !`);
    alert("Clan créé !"); location.reload();
};
window.rejoindreClan = async function(clan) {
    monProfil.clan = clan; monProfil.role = "Membre"; monProfil.grade = "Recrue";
    await updateDoc(doc(db, "membres", monId), { clan, role: "Membre", grade: "Recrue" });
    await ajouterEvenement(`➡️ ${monProfil.pseudo} a rejoint ${clan} !`);
    alert("Clan rejoint !"); location.reload();
};
window.quitterClan = async function() {
    if (!confirm("Quitter ton clan ?")) return;
    await updateDoc(doc(db, "membres", monId), { clan: "", role: "Membre", grade: "Sans clan" });
    await ajouterEvenement(`🚪 ${monProfil.pseudo} a quitté ${monProfil.clan}.`);
    alert("Clan quitté."); location.reload();
};
window.nommerViceChef = async function() {
    const nomCible = prompt("Pseudo du futur vice-chef ?");
    const cible = tousLesMembres.find(m => m.pseudo === nomCible);
    if (!cible) { alert("Introuvable dans ton clan."); return; }
    await updateDoc(doc(db, "membres", cible.id), { grade: "Vice-Chef" });
    await ajouterEvenement(`🎖️ ${cible.pseudo} devient Vice-Chef de ${monProfil.clan} !`);
    alert(`${cible.pseudo} est Vice-Chef.`);
};
function demarrerListeClan() {
    onSnapshot(query(collection(db, "membres"), where("clan", "==", monProfil.clan)), (snap) => {
        tousLesMembres = [];
        const box = document.getElementById('listeMembresClan'); box.innerHTML = "";
        const estChef = monProfil.role === "Chef" || monProfil.role === "Fondateur";
        snap.forEach(d => {
            const m = d.data(); tousLesMembres.push({ id: d.id, ...m });
            let ligne = `<div class="membreLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan}','${m.specialite||''}','${m.grade||m.role}',${m.prestige||0})">${m.avatar||""} ${m.pseudo} — ${m.grade || m.role}</span>`;
            if (d.id !== monId) ligne += `<button onclick="corrompre('${d.id}','${m.pseudo}')">💰</button>`;
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
    await ajouterEvenement(`${data.pseudo} a été promu ${nouveauGrade} !`);
};
window.corrompre = async function(idCible, pseudoCible) {
    if ((monProfil.or||0) < 100) { alert("Il faut 100 🪙."); return; }
    monProfil.or -= 100; monProfil.prestige = (monProfil.prestige||0)+10;
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or, prestige: monProfil.prestige });
    const cibleSnap = await getDoc(doc(db, "membres", idCible));
    const cible = cibleSnap.data();
    await updateDoc(doc(db, "membres", idCible), { prestige: Math.max(0,(cible.prestige||0)-15) });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats();
    await ajouterEvenement(`💰 Des rumeurs de corruption circulent visant ${pseudoCible}...`);
};
window.seRevolter = async function() {
    if (Math.random() < 0.4) {
        const ancienChef = tousLesMembres.find(m => m.role === "Chef");
        if (ancienChef) await updateDoc(doc(db, "membres", ancienChef.id), { role: "Membre", grade: "Recrue" });
        await updateDoc(doc(db, "membres", monId), { role: "Chef", grade: "Chef" });
        await ajouterEvenement(`🔥 RÉVOLTE ! ${monProfil.pseudo} a renversé le chef de ${monProfil.clan} !`);
        alert("Révolte réussie !"); location.reload();
    } else { await ajouterEvenement(`🔥 Une révolte dans ${monProfil.clan} a échoué.`); alert("Échec de la révolte."); }
};

// ================= VILLAGE INDIVIDUEL (trésor réel + ressources obligatoires) =================
const COUT_BATIMENTS = {
    route:       { or:100, bois:20, pierre:30,  nourriture:0 },
    caserne:     { or:300, bois:40, pierre:60,  nourriture:10 },
    hotelDeVille:{ or:600, bois:50, pierre:100, nourriture:0 },
    senat:       { or:1000,bois:60, pierre:120, nourriture:0 },
    ferme:       { or:150, bois:30, pierre:10,  nourriture:0 },
    carriere:    { or:150, bois:30, pierre:0,   nourriture:0 },
    scierie:     { or:150, bois:0,  pierre:20,  nourriture:0 },
    mur:         { or:400, bois:20, pierre:80,  nourriture:0 },
    temple:      { or:350, bois:40, pierre:50,  nourriture:20 }
};
const DUREES_CONSTRUCTION = [2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];
const NIVEAU_MAX_BATIMENT = 10;

function calculerNiveauGlobalVillage(village) { return Object.values(village.batiments).reduce((s,n)=>s+n,0); }
function nomEtapeVillage(niveauGlobal) {
    if (niveauGlobal < 5) return { nom: "Hameau", icone: "🏕️" };
    if (niveauGlobal < 15) return { nom: "Village", icone: "🏘️" };
    if (niveauGlobal < 30) return { nom: "Bourg", icone: "🏰" };
    if (niveauGlobal < 50) return { nom: "Ville", icone: "🏙️" };
    if (niveauGlobal < 75) return { nom: "Cité", icone: "🌆" };
    return { nom: "Capitale", icone: "👑" };
}
async function afficherVillage() {
    let village = monProfil.village;
    if (village.enConstruction && village.enConstruction.fin <= Date.now()) {
        const type = village.enConstruction.type;
        village.batiments[type] = (village.batiments[type]||0)+1;
        village.enConstruction = null;
        await updateDoc(doc(db, "membres", monId), { village });
        await ajouterEvenement(`✅ ${monProfil.pseudo} a terminé la construction de ${type} !`);
    }
    const etape = nomEtapeVillage(calculerNiveauGlobalVillage(village));
    document.getElementById('infosVillage').innerText = `${etape.icone} ${etape.nom} — Trésor : ${village.tresor||0} 🪙 | Territoire : ${village.territoire} 🗺️${village.carteDePaix > Date.now() ? " | 🕊️ Protégé" : ""}`;
    document.getElementById('ressourcesVillage').innerText = `🪵 ${village.ressources.bois} | 🪨 ${village.ressources.pierre} | 🌾 ${village.ressources.nourriture}`;
    document.getElementById('constructionEnCours').innerText = village.enConstruction ? `🏗️ ${village.enConstruction.type} — encore ${Math.ceil((village.enConstruction.fin-Date.now())/60000)} min` : "";
    document.getElementById('tauxActuel').innerText = village.taux;
    document.getElementById('curseurTaxe').value = village.taux;

    const icones = { route:"🛣️", caserne:"🏋️", hotelDeVille:"🏛️", senat:"🏦", ferme:"🌾", carriere:"🪨", scierie:"🪵", mur:"🧱", temple:"⛩️" };
    let grille = "";
    Object.keys(icones).forEach(type => {
        const niveau = village.batiments[type]||0;
        grille += `<div class="tuileBatiment" onclick="detailBatiment('${type}',${niveau})"><div style="font-size:24px;">${niveau===0?"🌳":icones[type]}</div><div>${type}</div><div>Niv. ${niveau}</div></div>`;
    });
    document.getElementById('batimentsVillage').innerHTML = grille;
}
window.detailBatiment = function(type, niveau) {
    if (niveau >= NIVEAU_MAX_BATIMENT) { alert("Niveau maximum atteint."); return; }
    const base = COUT_BATIMENTS[type];
    const multiplicateur = niveau + 1;
    const cout = { or: base.or*multiplicateur, bois: base.bois*multiplicateur, pierre: base.pierre*multiplicateur, nourriture: base.nourriture*multiplicateur };
    const duree = DUREES_CONSTRUCTION[niveau];
    const texteDuree = duree >= 60 ? `${Math.round(duree/60)}h` : `${duree} min`;
    const texteCout = `${cout.or}🪙${cout.bois>0?` + ${cout.bois}🪵`:""}${cout.pierre>0?` + ${cout.pierre}🪨`:""}${cout.nourriture>0?` + ${cout.nourriture}🌾`:""}`;
    if (confirm(`${type} — Niveau ${niveau}\nCoût : ${texteCout}\nDurée : ${texteDuree}`)) construireBatiment(type, cout, duree);
};
window.construireBatiment = async function(type, cout, duree) {
    if (monProfil.village.enConstruction && monProfil.village.enConstruction.fin > Date.now()) { alert("Une construction est déjà en cours."); return; }
    const r = monProfil.village.ressources;
    if ((monProfil.or||0) < cout.or) { alert("Pas assez de Francs Otaku."); return; }
    if (r.bois < cout.bois) { alert(`Pas assez de bois (besoin de ${cout.bois}🪵, tu as ${r.bois}). Récolte plus de ressources !`); return; }
    if (r.pierre < cout.pierre) { alert(`Pas assez de pierre (besoin de ${cout.pierre}🪨, tu as ${r.pierre}). Récolte plus de ressources !`); return; }
    if (r.nourriture < cout.nourriture) { alert(`Pas assez de nourriture (besoin de ${cout.nourriture}🌾, tu as ${r.nourriture}). Récolte plus de ressources !`); return; }

    monProfil.or -= cout.or;
    r.bois -= cout.bois; r.pierre -= cout.pierre; r.nourriture -= cout.nourriture;
    monProfil.village.enConstruction = { type, fin: Date.now()+duree*60000 };
    await updateDoc(doc(db, "membres", monId), { or: monProfil.or, village: monProfil.village });
    document.getElementById('orAffiche').innerText = monProfil.or;
    afficherStats(); await afficherVillage();
    await ajouterEvenement(`🏗️ ${monProfil.pseudo} construit : ${type} !`);
};
window.changerTaxe = async function(valeur) {
    monProfil.village.taux = parseInt(valeur);
    await updateDoc(doc(db, "membres", monId), { village: monProfil.village });
    document.getElementById('tauxActuel').innerText = monProfil.village.taux;
};
window.collecterImpots = async function() {
    const revenu = Math.round(20 * monProfil.village.taux * 0.8);
    monProfil.village.tresor = (monProfil.village.tresor||0) + revenu;
    await updateDoc(doc(db, "membres", monId), { village: monProfil.village });
    await afficherVillage();
    alert(`+${revenu} 🪙 ajoutés au trésor du village !`);
};
window.retirerDuTresor = async function() {
    const montant = parseInt(prompt(`Trésor disponible : ${monProfil.village.tresor||0} 🪙\nCombien retirer ?`));
    if (!montant || montant <= 0 || montant > (monProfil.village.tresor||0)) { alert("Montant invalide."); return; }
    monProfil.village.tresor -= montant;
    monProfil.or = (monProfil.or||0) + montant;
    await updateDoc(doc(db, "membres", monId), { village: monProfil.village, or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    await afficherVillage();
};
window.collecterRessources = async function() {
    monProfil.village.ressources.bois += monProfil.village.batiments.scierie*15;
    monProfil.village.ressources.pierre += monProfil.village.batiments.carriere*15;
    monProfil.village.ressources.nourriture += monProfil.village.batiments.ferme*15;
    await updateDoc(doc(db, "membres", monId), { village: monProfil.village });
    await afficherVillage();
    alert("Ressources récoltées !");
};
window.activerCarteDePaix = async function() {
    monProfil.village.carteDePaix = Date.now() + 24*60*60*1000;
    await updateDoc(doc(db, "membres", monId), { village: monProfil.village });
    await afficherVillage();
    alert("🕊️ Carte de paix activée pour 24h !");
};

// ================= ESPIONNAGE =================
window.espionner = async function(idCible, pseudoCible) {
    const snap = await getDoc(doc(db, "membres", idCible));
    const cible = snap.data();
    const reussite = Math.random() > 0.25;
    if (!reussite) { alert("🕵️ Ton espion a été repéré ! Mission échouée."); return; }
    const s = calculerStats(cible);
    document.getElementById('espionInfos').innerHTML = `
        <b>${pseudoCible}</b> (${cible.clan||"Aucun"})<br>
        💪 Force : ${s.force} | ❤️ PV : ${s.pv}<br>
        🪙 Trésor : ${cible.village?.tresor||0}<br>
        🛣️ Route ${cible.village?.batiments.route||0} | 🏋️ Caserne ${cible.village?.batiments.caserne||0} | 🧱 Mur ${cible.village?.batiments.mur||0}<br>
        🗺️ Territoire : ${cible.village?.territoire||0}`;
    document.getElementById('panelEspion').style.display = 'block';
};
window.fermerEspion = function() { document.getElementById('panelEspion').style.display = 'none'; };

// ================= BOUTIQUE / INVENTAIRE =================
const OBJETS_BOUTIQUE = [];
["Dague","Épée","Hache","Lance","Marteau","Katana","Arbalète","Fléau","Trident","Sabre"].forEach((nom,i) => OBJETS_BOUTIQUE.push({ id:"arme"+i, nom:`⚔️ ${nom}`, prix:80+i*40, bonus:0.08+i*0.03, desc:`+${Math.round((0.08+i*0.03)*100)}% force` }));
["Amulette","Grimoire","Couronne miniature","Anneau ancien","Cristal","Masque","Parchemin","Statuette","Sceau","Orbe"].forEach((nom,i) => OBJETS_BOUTIQUE.push({ id:"relique"+i, nom:`💎 ${nom}`, prix:100+i*50, prestige:10+i*8, desc:`+${10+i*8} prestige` }));
["Cabane","Ferme privée","Terrain","Entrepôt","Tour de guet","Manoir","Forteresse","Château","Citadelle","Palais"].forEach((nom,i) => OBJETS_BOUTIQUE.push({ id:"prop"+i, nom:`🏞️ ${nom}`, prix:150+i*100, prestige:15+i*10, revenu:2+i*2, desc:`+${15+i*10} prestige, +${2+i*2}🪙` }));
function afficherBoutique() {
    const box = document.getElementById('boutiqueBox'); box.innerHTML = "";
    OBJETS_BOUTIQUE.forEach(o => box.innerHTML += `<div class="objetBoutique"><span>${o.nom} — ${o.desc} (${o.prix}🪙)</span><button onclick="acheterObjet('${o.id}')">Acheter</button></div>`);
}
window.acheterObjet = async function(id) {
    const objet = OBJETS_BOUTIQUE.find(o => o.id === id);
    if ((monProfil.or||0) < objet.prix) { alert("Pas assez d'or."); return; }
    monProfil.or -= objet.prix;
    let updates = { or: monProfil.or, inventaire: arrayUnion(objet.nom) };
    if (objet.bonus) { monProfil.bonusForce = (monProfil.bonusForce||0)+objet.bonus; updates.bonusForce = monProfil.bonusForce; }
    if (objet.prestige) { monProfil.prestige = (monProfil.prestige||0)+objet.prestige; updates.prestige = monProfil.prestige; }
    if (objet.revenu) { monProfil.revenuTotal = (monProfil.revenuTotal||0)+objet.revenu; updates.revenuTotal = monProfil.revenuTotal; }
    await updateDoc(doc(db, "membres", monId), updates);
    if (!monProfil.inventaire) monProfil.inventaire = [];
    monProfil.inventaire.push(objet.nom);
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige||0;
    afficherStats(); afficherInventaire();
    alert(`Acheté : ${objet.nom} !`);
};
function afficherInventaire() {
    const box = document.getElementById('inventaireBox'); box.innerHTML = "";
    const inv = monProfil.inventaire || [];
    if (inv.length === 0) { box.innerHTML = "<p>Vide.</p>"; return; }
    const compte = {}; inv.forEach(i => compte[i]=(compte[i]||0)+1);
    Object.entries(compte).forEach(([item,nb]) => box.innerHTML += `<p>${item}${nb>1?" x"+nb:""}</p>`);
}

// ================= DIPLOMATIE DURABLE / COMMANDEMENT / ADMIN (Fondateur) =================
async function getRelationClans(clanA, clanB) {
    if (!clanA || !clanB) return "Neutre";
    const ref = doc(db, "relationsClans", [clanA, clanB].sort().join("_vs_"));
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data().statut : "Neutre";
}
window.changerRelationClan = async function(clanA, clanB, nouveauStatut) {
    const ref = doc(db, "relationsClans", [clanA, clanB].sort().join("_vs_"));
    await setDoc(ref, { statut: nouveauStatut });
    await ajouterEvenement(`🗺️ ${clanA} et ${clanB} sont désormais : ${nouveauStatut}.`);
    afficherDiplomatie();
};
async function afficherDiplomatie() {
    if (monProfil.role !== "Fondateur" && !monProfil.clan) return;
    document.getElementById('sectionDiplomatie').style.display = 'block';
    const box = document.getElementById('boiteDiplomatie'); box.innerHTML = "";
    const monClanRef = monProfil.clan || "Fondateur";
    for (const c of CLANS.filter(c => c !== monProfil.clan)) {
        const relation = await getRelationClans(monClanRef, c);
        box.innerHTML += `<div class="membreLigne"><span>${c} (${relation})</span>
            <button onclick="changerRelationClan('${monClanRef}','${c}','Allié')">🤝</button>
            <button onclick="changerRelationClan('${monClanRef}','${c}','Ennemi')">⚔️</button>
            <button onclick="changerRelationClan('${monClanRef}','${c}','Neutre')">➖</button>
            ${monProfil.role==="Fondateur" ? `<button onclick="envoyerEmissaire('${c}')">🗝️</button>` : ""}</div>`;
    }
}
window.envoyerEmissaire = async function(clan) {
    const resultats = [{t:`${clan} accueille l'émissaire, alliance renforcée`,or:50,p:15},{t:`${clan} refuse.`,or:0,p:-5}];
    const r = resultats[Math.floor(Math.random()*resultats.length)];
    monProfil.or=(monProfil.or||0)+r.or; monProfil.prestige=Math.max(0,(monProfil.prestige||0)+r.p);
    await updateDoc(doc(db,"membres",monId), { or: monProfil.or, prestige: monProfil.prestige });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats(); await ajouterEvenement(`🗝️ Samuel → ${clan} : ${r.t}`); alert(r.t);
};
function afficherCommandement() {
    if (monProfil.role !== "Fondateur") return;
    document.getElementById('sectionCommandement').style.display = 'block';
    document.getElementById('resumeArmee').innerText = `${monArmeePersonnelle.length} soldats`;
    const box = document.getElementById('listeArmee'); box.innerHTML = "";
    monArmeePersonnelle.slice(0,10).forEach((s) => box.innerHTML += `<div class="membreLigne"><span>🗝️ ${s.nom} (${s.force})</span></div>`);
}
window.pillerVillage = async function() {
    const nomCible = prompt("Piller quel joueur ? (pseudo)");
    const snapRecherche = await getDocs(query(collection(db,"membres"), where("pseudo","==",nomCible)));
    if (snapRecherche.empty) { alert("Joueur introuvable."); return; }
    const cibleDoc = snapRecherche.docs[0]; const cible = cibleDoc.data();
    const butin = Math.min(cible.village?.tresor||0, 100);
    cible.village.tresor -= butin;
    await updateDoc(doc(db,"membres",cibleDoc.id), { village: cible.village });
    monProfil.or = (monProfil.or||0)+butin;
    await updateDoc(doc(db,"membres",monId), { or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    await ajouterEvenement(`🏴‍☠️ Raid des bandits contre ${nomCible} : ${butin}🪙 volés au trésor.`);
    alert(`Butin : ${butin}🪙`);
};
function afficherAdmin() {
    if (monProfil.role !== "Fondateur") return;
    document.getElementById('sectionAdmin').style.display = 'block';
    onSnapshot(collection(db,"membres"), (snap) => {
        const box = document.getElementById('listeAdmin'); box.innerHTML = "";
        snap.forEach(d => {
            if (d.id === monId) return;
            const m = d.data();
            box.innerHTML += `<div class="membreLigne"><span>${m.pseudo} ${m.banni?"🚫":""}</span>
                <button onclick="adminBannir('${d.id}',${m.banni||false})">🚫</button>
                <button onclick="adminChangerRole('${d.id}')">🔄</button></div>`;
        });
    });
}
window.adminBannir = async function(id, etaitBanni) { await updateDoc(doc(db,"membres",id), { banni: !etaitBanni }); };
window.adminChangerRole = async function(id) {
    const r = prompt("Nouveau rôle ?"); if (!r) return;
    await updateDoc(doc(db,"membres",id), { role: r, grade: r });
};

// ================= COMBAT (rapports variés, journal complet, raid, respect relations) =================
const RAPPORTS_VICTOIRE = [
    "🏆 {g} a écrasé {p} sans la moindre pitié !", "🏆 {g} l'emporte, {p} n'a rien pu faire.",
    "🏆 Combat acharné : {g} finit par soumettre {p}.", "🏆 {p} a mordu la poussière devant {g} !"
];
const RAPPORTS_DEFAITE = [
    "💀 {p} a lamentablement perdu contre {g}.", "💀 {p} a été impuissant face à la puissance de {g}.",
    "💀 {g} n'a fait qu'une bouchée de {p}.", "💀 Cuisant échec pour {p}, dominé par {g}."
];
function demarrerAdversaires() {
    onSnapshot(query(collection(db, "membres"), where("clan", "!=", monProfil.clan || "___aucun___")), (snap) => {
        window._joueursListe = []; snap.forEach(d => window._joueursListe.push({ id:d.id, ...d.data() }));
        filtrerAdversaires();
    });
}
window.filtrerAdversaires = function() {
    const recherche = (document.getElementById('rechercheJoueur').value || "").toLowerCase();
    const box = document.getElementById('listeAdversaires'); box.innerHTML = "<p><b>👤 Joueurs</b></p>";
    (window._joueursListe||[]).filter(m => m.pseudo.toLowerCase().includes(recherche)).forEach(m => {
        box.innerHTML += `<div class="membreLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan}','${m.specialite||''}','${m.grade||m.role}',${m.prestige||0})">${m.avatar||""} ${m.pseudo} (${m.clan})</span>
            <button onclick="espionner('${m.id}','${m.pseudo}')">🕵️</button>
            <button onclick="combattre('${m.id}', false)">⚔️</button>
            <button onclick="raidVillage('${m.id}','${m.pseudo}')">🏴</button></div>`;
    });
    if (!recherche) {
        box.innerHTML += "<p><b>🤖 Habitants du monde</b></p>";
        pnjPool.slice(0,10).forEach(p => {
            box.innerHTML += `<div class="membreLigne"><span onclick="voirProfil('${p.pseudo}','Errant','${p.specialite}','PNJ',${p.prestige})">${p.pseudo} (PV:${p.pv}, 🏆${p.prestige})</span><button onclick="combattre('${p.id}', true)">⚔️</button></div>`;
        });
    }
};
window.combattre = async function(idAdversaire, estPNJ) {
    let adv;
    if (estPNJ) adv = pnjPool.find(p => p.id === idAdversaire);
    else {
        const snap = await getDoc(doc(db,"membres",idAdversaire)); adv = snap.data();
        if (adv.village?.carteDePaix > Date.now()) { alert(`${adv.pseudo} est protégé par une carte de paix.`); return; }
        if (monProfil.clan && adv.clan) {
            const relation = await getRelationClans(monProfil.clan, adv.clan);
            if (relation === "Allié") { alert(`${monProfil.clan} est allié à ${adv.clan}, impossible d'attaquer.`); return; }
        }
    }
    const bonusType = (AVANTAGES[monProfil.specialite]===adv.specialite) ? 1.4 : 1;
    const forceMoi = ((monProfil.prestige||0)+50)*bonusType*(1+(monProfil.bonusForce||0))*(0.85+Math.random()*0.3);
    const forceAdv = ((adv.prestige||0)+50)*(0.85+Math.random()*0.3);
    const resultat = document.getElementById('resultatCombat');
    let texte = `Round 1 : premiers échanges...\nRound 2 : la mêlée s'intensifie...\nRound 3 : le coup décisif !\n\n`;
    let rapportFinal = "";
    if (forceMoi >= forceAdv) {
        const gain = estPNJ?10:20, gp = estPNJ?4:10;
        monProfil.or=(monProfil.or||0)+gain; monProfil.prestige=(monProfil.prestige||0)+gp;
        await updateDoc(doc(db,"membres",monId), { or: monProfil.or, prestige: monProfil.prestige });
        if (!estPNJ) await updateDoc(doc(db,"membres",idAdversaire), { prestige: Math.max(0,(adv.prestige||0)-5) });
        const tpl = RAPPORTS_VICTOIRE[Math.floor(Math.random()*RAPPORTS_VICTOIRE.length)];
        rapportFinal = tpl.replace("{g}",monProfil.pseudo).replace("{p}",adv.pseudo) + ` +${gain}🪙, +${gp} prestige.`;
    } else {
        monProfil.prestige = Math.max(0,(monProfil.prestige||0)-5);
        await updateDoc(doc(db,"membres",monId), { prestige: monProfil.prestige });
        const tpl = RAPPORTS_DEFAITE[Math.floor(Math.random()*RAPPORTS_DEFAITE.length)];
        rapportFinal = tpl.replace("{g}",adv.pseudo).replace("{p}",monProfil.pseudo);
    }
    resultat.innerText = texte + rapportFinal;
    document.getElementById('orAffiche').innerText = monProfil.or||0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige||0;
    afficherStats();
    await ajouterEvenement(rapportFinal);
};
window.raidVillage = async function(idCible, pseudoCible) {
    const snap = await getDoc(doc(db, "membres", idCible));
    const cible = snap.data();
    if (cible.village?.carteDePaix > Date.now()) { alert(`${pseudoCible} est protégé par une carte de paix.`); return; }
    if (monProfil.clan && cible.clan) {
        const relation = await getRelationClans(monProfil.clan, cible.clan);
        if (relation === "Allié") { alert(`${monProfil.clan} est allié à ${cible.clan}, impossible d'attaquer.`); return; }
    }
    const defense = 50 + (cible.village?.batiments.caserne||0)*30 + (cible.village?.batiments.mur||0)*25;
    const attaque = ((monProfil.prestige||0)+50)*(1+(monProfil.bonusForce||0))*(0.85+Math.random()*0.3);
    if (attaque >= defense) {
        const butinOr = Math.min(cible.village?.tresor||0, 150);
        cible.village.tresor -= butinOr;
        await updateDoc(doc(db,"membres",idCible), { village: cible.village });
        monProfil.village.tresor = (monProfil.village.tresor||0) + butinOr;
        monProfil.prestige = (monProfil.prestige||0)+15;
        await updateDoc(doc(db,"membres",monId), { village: monProfil.village, prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        afficherStats(); await afficherVillage();
        await ajouterEvenement(`🏴 ${monProfil.pseudo} a raidé le village de ${pseudoCible} et volé ${butinOr}🪙 !`);
        alert(`Raid réussi ! +${butinOr}🪙 dans ton trésor.`);
    } else {
        monProfil.prestige = Math.max(0,(monProfil.prestige||0)-10);
        await updateDoc(doc(db,"membres",monId), { prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        afficherStats();
        await ajouterEvenement(`🏴 ${monProfil.pseudo} a tenté de raider ${pseudoCible} mais a été repoussé par ses défenses !`);
        alert("Raid repoussé par les défenses !");
    }
};
async function verifierEvenementPNJ() {
    if (Math.random() < 0.2) {
        const pnj = pnjPool[Math.floor(Math.random()*pnjPool.length)];
        const perte = Math.floor(Math.random()*8);
        monProfil.prestige = Math.max(0,(monProfil.prestige||0)-perte);
        await updateDoc(doc(db,"membres",monId), { prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        document.getElementById('evenementAleatoire').innerText = `⚠️ ${pnj.pseudo} (force ${pnj.prestige}, PV ${pnj.pv}) t'a attaqué ! -${perte} prestige.`;
        afficherStats();
    }
}

// ================= TERRITOIRES INFINIS (exploration + PNJ nommés puissants) =================
async function afficherCarteMonde() {
    const snap = await getDocs(collection(db, "territoires"));
    const box = document.getElementById('carteMonde'); box.innerHTML = "";
    const tousLesTerritoires = []; snap.forEach(d => tousLesTerritoires.push(d.data()));
    if (tousLesTerritoires.length === 0) { box.innerHTML = "<p>Aucun territoire découvert. Sois le premier à explorer !</p>"; return; }
    tousLesTerritoires.slice(-20).forEach(t => {
        const estRoi = window._roiClanActuel && t.clanOccupant === window._roiClanActuel;
        box.innerHTML += `<div class="tuileCarte ${t.occupePar?"":"pnj"} ${estRoi?"roi":""}" onclick="detailTerritoire('${t.nom}')">
            <div style="font-size:26px;">${t.occupePar?"🏰":"🐺"}</div>
            <b>${t.nom}</b>
            <p>${t.occupePar ? t.clanOccupant : (t.pnjChef?.nom || "Gardé par un chef PNJ")}</p></div>`;
    });
}
window.explorerNouveauTerritoire = async function() {
    const compteurSnap = await getDoc(doc(db, "monde", "compteurTerritoires"));
    const index = compteurSnap.exists() ? compteurSnap.data().total : 0;
    const nom = `${NOMS_BASE_TERRITOIRE[Math.floor(Math.random()*NOMS_BASE_TERRITOIRE.length)]} ${ADJECTIFS_TERRITOIRE[Math.floor(Math.random()*ADJECTIFS_TERRITOIRE.length)]} ${index}`;
    const nomChef = TITRES_PNJ[Math.floor(Math.random()*TITRES_PNJ.length)];
    await setDoc(doc(db, "territoires", nom), {
        nom, occupePar: null, clanOccupant: null,
        pnjChef: { nom: nomChef, force: 300+index*80+Math.floor(Math.random()*200), pv: 400+index*100, garnison: 20+index*5 }
    });
    await setDoc(doc(db, "monde", "compteurTerritoires"), { total: index+1 });
    await ajouterEvenement(`🧭 ${monProfil.pseudo} a découvert un nouveau territoire : ${nom}, gardé par ${nomChef} !`);
    await afficherCarteMonde();
    alert(`Nouveau territoire découvert : ${nom} !`);
};
window.detailTerritoire = async function(nom) {
    const snap = await getDoc(doc(db, "territoires", nom));
    const t = snap.data();
    if (t.occupePar) { alert(`${t.nom} appartient à ${t.clanOccupant} (joueur : ${t.occupePar}).`); return; }
    if (!confirm(`${t.nom} est gardé par ${t.pnjChef.nom} (force ${t.pnjChef.force}, garnison de ${t.pnjChef.garnison} soldats). Attaquer ?`)) return;
    const maForce = ((monProfil.prestige||0)+50)*(1+(monProfil.bonusForce||0))*(0.85+Math.random()*0.3);
    if (maForce >= t.pnjChef.force) {
        await updateDoc(doc(db, "territoires", nom), { occupePar: monProfil.pseudo, clanOccupant: monProfil.clan||monProfil.pseudo });
        monProfil.village.territoire = (monProfil.village.territoire||1)+1;
        monProfil.prestige = (monProfil.prestige||0)+40;
        await updateDoc(doc(db,"membres",monId), { village: monProfil.village, prestige: monProfil.prestige });
        document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        afficherStats();
        await ajouterEvenement(`⚔️ ${monProfil.pseudo} a vaincu ${t.pnjChef.nom} et devient chef de ${t.nom} !`);
        alert("Territoire conquis !"); await afficherCarteMonde();
    } else {
        await ajouterEvenement(`⚔️ ${monProfil.pseudo} a été repoussé par ${t.pnjChef.nom}, gardien de ${t.nom}.`);
        alert("Le chef PNJ t'a repoussé... reviens plus fort !");
    }
};

// ================= GUERRE DES ROYAUMES (3 rounds, cycle 7 jours, Roi, saisons) =================
function surveillerGuerreRoyaumes() {
    onSnapshot(doc(db,"monde","guerreRoyaumes"), async (snap) => {
        if (!snap.exists()) {
            if (monProfil.role === "Fondateur") await setDoc(doc(db,"monde","guerreRoyaumes"), { statut:"compteARebours", fin: Date.now()+7*24*60*60*1000, resolue:false });
            return;
        }
        const g = snap.data();
        if (g.statut === "compteARebours" && !g.resolue) {
            document.getElementById('statutGuerreRoyaumes').innerText = `Prochaine Guerre des Royaumes dans...`;
            demarrerCompteARebours(g.fin);
        } else if (g.resolue) {
            document.getElementById('statutGuerreRoyaumes').innerText = `🔥 Vainqueur : ${g.vainqueur}`;
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
            if (monProfil.role === "Fondateur") await resoudreGuerreRoyaumes3Rounds();
            return;
        }
        const j = Math.floor(restant/86400000), h = Math.floor((restant%86400000)/3600000), m = Math.floor((restant%3600000)/60000);
        document.getElementById('compteARebours').innerText = `${j}j ${h}h ${m}m`;
    }, 1000);
}
async function resoudreGuerreRoyaumes3Rounds() {
    let scores = {}; CLANS.forEach(c => scores[c] = 0);
    for (let round = 1; round <= 3; round++) {
        for (const clan of CLANS) {
            const membresClan = await getDocs(query(collection(db,"membres"), where("clan","==",clan)));
            let total = 0; membresClan.forEach(d => total += (d.data().prestige||0));
            scores[clan] += total * (0.7+Math.random()*0.6);
        }
        await ajouterEvenement(`👑 Round ${round}/3 de la Guerre des Royaumes terminé !`);
        await new Promise(r => setTimeout(r, 60000));
    }
    const vainqueur = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0][0];
    const finRegne = Date.now() + 7*24*60*60*1000;
    await setDoc(doc(db,"monde","guerreRoyaumes"), { statut:"terminee", resolue:true, vainqueur, finRegne });
    await setDoc(doc(db,"monde","roi"), { clan: vainqueur, finRegne });

    const saisonSnap = await getDoc(doc(db, "monde", "compteurSaisons"));
    const numSaison = saisonSnap.exists() ? saisonSnap.data().total + 1 : 1;
    await setDoc(doc(db, "saisons", "saison"+numSaison), { numero: numSaison, vainqueur, date: serverTimestamp() });
    await setDoc(doc(db, "monde", "compteurSaisons"), { total: numSaison });
    await ajouterEvenement(`📖 Fin de la Saison ${numSaison} : ${vainqueur} entre dans l'histoire !`);

    setTimeout(async () => { await setDoc(doc(db,"monde","guerreRoyaumes"), { statut:"compteARebours", fin: Date.now()+7*24*60*60*1000, resolue:false }); }, 1000);
}
async function verifierRoiActuel() {
    const snap = await getDoc(doc(db,"monde","roi"));
    if (!snap.exists()) return;
    const r = snap.data();
    window._roiClanActuel = (r.finRegne > Date.now()) ? r.clan : null;
    if (monProfil.clan === r.clan && r.finRegne > Date.now()) {
        document.getElementById('sectionRoi').style.display = 'block';
        document.getElementById('bandeauRoi').style.display = 'block';
        document.getElementById('bandeauRoi').innerText = `👑 Ton clan règne sur le monde jusqu'au ${new Date(r.finRegne).toLocaleDateString()} !`;
        document.getElementById('tempsRegneRestant').innerText = `${Math.ceil((r.finRegne-Date.now())/86400000)} jour(s)`;
        const dernierJour = localStorage.getItem('otakus_recompense_roi_'+monId);
        const aujourdHui = new Date().toDateString();
        if (dernierJour !== aujourdHui) {
            monProfil.or = (monProfil.or||0)+50; monProfil.prestige=(monProfil.prestige||0)+20;
            await updateDoc(doc(db,"membres",monId), { or: monProfil.or, prestige: monProfil.prestige });
            localStorage.setItem('otakus_recompense_roi_'+monId, aujourdHui);
            document.getElementById('orAffiche').innerText = monProfil.or;
            document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
        }
    } else {
        document.getElementById('sectionRoi').style.display = 'none';
        document.getElementById('bandeauRoi').style.display = 'none';
    }
}
window.imposerImpotMondial = async function() { await ajouterEvenement(`👑 Le Roi a imposé un impôt mondial !`); alert("Impôt imposé."); };
window.distribuerRecompense = async function() {
    const snap = await getDocs(collection(db,"membres"));
    for (const d of snap.docs) await updateDoc(doc(db,"membres",d.id), { or: (d.data().or||0)+10 });
    await ajouterEvenement(`👑 Le Roi a distribué une récompense royale à tous !`); alert("Récompense distribuée.");
};
window.annonceMondiale = async function() { const texte = prompt("Ton annonce :"); if (texte) await ajouterEvenement(`📯 ANNONCE ROYALE : ${texte}`); };
window.organiserFete = async function() { await ajouterEvenement(`🎉 Le Roi déclare une fête mondiale !`); alert("Fête déclarée."); };
window.nommerGouverneur = async function() { const p = prompt("Pseudo du futur gouverneur ?"); if (p) await ajouterEvenement(`🏛️ ${p} est nommé gouverneur par le Roi !`); };

// ================= QUÊTE VARIÉE / BOSS =================
function afficherQuete() {
    const jourAnnee = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / 86400000);
    const quete = QUETES_JOUR[jourAnnee % QUETES_JOUR.length];
    window._queteDuJour = quete;
    document.getElementById('queteTexte').innerText = `${quete.texte} (${quete.or}🪙, ${quete.prestige}🏆)`;
}
window.reclamerQuete = async function() {
    const derniere = localStorage.getItem('otakus_quete_'+monId);
    const aujourdHui = new Date().toDateString();
    if (derniere === aujourdHui) { alert("Déjà réclamée."); return; }
    monProfil.or=(monProfil.or||0)+window._queteDuJour.or; monProfil.prestige=(monProfil.prestige||0)+window._queteDuJour.prestige;
    await updateDoc(doc(db,"membres",monId), { or: monProfil.or, prestige: monProfil.prestige });
    localStorage.setItem('otakus_quete_'+monId, aujourdHui);
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige;
    afficherStats(); alert("Récompense réclamée !");
};
async function afficherBoss() {
    const ref = doc(db,"monde","boss");
    let snap = await getDoc(ref);
    if (!snap.exists()) { await setDoc(ref, { nom:"Dragon Noir", pvMax:5000, pv:5000 }); snap = await getDoc(ref); }
    const b = snap.data();
    document.getElementById('infosBoss').innerText = `${b.nom} — PV : ${b.pv}/${b.pvMax}`;
    document.getElementById('remplissageBoss').style.width = `${(b.pv/b.pvMax)*100}%`;
}
window.attaquerBoss = async function() {
    const ref = doc(db,"monde","boss");
    const snap = await getDoc(ref); const b = snap.data();
    const degats = Math.round(15+(monProfil.prestige||0)*0.15+(monProfil.bonusForce||0)*25);
    const nouveauxPV = Math.max(0, b.pv-degats);
    await updateDoc(ref, { pv: nouveauxPV });
    monProfil.or=(monProfil.or||0)+8;
    await updateDoc(doc(db,"membres",monId), { or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    await afficherBoss();
    if (nouveauxPV===0) { await updateDoc(ref, { pv:b.pvMax }); await ajouterEvenement(`🐉 Le ${b.nom} a été vaincu !`); alert("Boss vaincu !"); }
    else alert(`${degats} dégâts infligés !`);
};

// ================= CLASSEMENTS =================
async function demarrerClassements() { afficherClassementPar('prestige'); }
window.afficherClassementPar = async function(critere) {
    const snap = await getDocs(collection(db,"membres"));
    let tous = []; snap.forEach(d => tous.push(d.data()));
    const box = document.getElementById('classementDynamique'); box.innerHTML = "";
    if (critere === 'clan') {
        const totaux = {}; tous.forEach(m => { if (m.clan) totaux[m.clan]=(totaux[m.clan]||0)+(m.prestige||0); });
        Object.entries(totaux).sort((a,b)=>b[1]-a[1]).forEach(([c,t],i) => box.innerHTML += `<div class="rangLigne"><span>#${i+1} ${c}</span><span>${t}🏆</span></div>`);
        return;
    }
    let cle = critere, unite = critere==='prestige'?"🏆":critere==='or'?"🪙":"";
    if (critere==='force') { tous.forEach(m => m._force = calculerStats(m).force); cle='_force'; unite="💪"; }
    tous.sort((a,b)=>(b[cle]||0)-(a[cle]||0)).slice(0,15).forEach((m,i) => {
        box.innerHTML += `<div class="rangLigne"><span onclick="voirProfil('${m.pseudo}','${m.clan||''}','${m.specialite||''}','${m.grade||m.role}',${m.prestige||0})">#${i+1} ${m.avatar||""} ${m.pseudo}</span><span>${m[cle]||0}${unite}</span></div>`;
    });
};

// ================= JOURNAL / STATS / PROFIL =================
async function ajouterEvenement(texte) { await addDoc(collection(db,"journal"), { texte, date: serverTimestamp() }); }
function demarrerJournal() {
    onSnapshot(query(collection(db,"journal"), orderBy("date","desc")), (snap) => {
        const box = document.getElementById('journalBox'); box.innerHTML = "";
        let c=0; snap.forEach(d => { if(c<25){ box.innerHTML += `<p>📌 ${d.data().texte}</p>`; c++; } });
    });
}
function calculerStats(profil) {
    const capacites = { Guerrier:"💥 Coup dévastateur", Archer:"🎯 Tir rapide", Stratège:"🧠 Vision tactique" };
    return {
        force: Math.round(40+(profil.prestige||0)*0.35+(profil.bonusForce||0)*100),
        rapidite: Math.round(30+(profil.specialite==="Archer"?40:15)+(profil.prestige||0)*0.15),
        agilite: Math.round(30+(profil.specialite==="Stratège"?35:15)+(profil.prestige||0)*0.15),
        pv: Math.round(100+(profil.prestige||0)*0.25+(profil.bonusForce||0)*50),
        capacite: capacites[profil.specialite] || "Aucune"
    };
}
function afficherStats() {
    const s = calculerStats(monProfil);
    document.getElementById('statsBox').innerHTML = `<p>💪 Force : ${s.force}</p><p>⚡ Rapidité : ${s.rapidite}</p><p>🤸 Agilité : ${s.agilite}</p><p>❤️ PV : ${s.pv}</p><p>✨ ${s.capacite}</p>`;
}
window.travailler = async function() {
    const derniereFois = localStorage.getItem('otakus_travail_'+monId);
    const maintenant = Date.now(), attente = 45*60*1000;
    if (derniereFois && (maintenant-parseInt(derniereFois))<attente) {
        document.getElementById('messageTravail').innerText = `Reviens dans ${Math.ceil((attente-(maintenant-parseInt(derniereFois)))/60000)} min.`;
        return;
    }
    const gain = 12+Math.floor(Math.random()*8)+(monProfil.revenuTotal||0);
    monProfil.or=(monProfil.or||0)+gain;
    await updateDoc(doc(db,"membres",monId), { or: monProfil.or });
    document.getElementById('orAffiche').innerText = monProfil.or;
    document.getElementById('messageTravail').innerText = `+${gain} 🪙 !`;
    localStorage.setItem('otakus_travail_'+monId, maintenant.toString());
};
window.voirProfil = function(pseudo, clan, specialite, grade, prestige) {
    document.getElementById('panelPseudo').innerText = pseudo;
    document.getElementById('panelInfos').innerHTML = `Clan : ${clan||'Aucun'}<br>Spécialité : ${specialite||'?'}<br>Grade : ${grade||'?'}<br>Prestige : ${prestige||0} 🏆`;
    document.getElementById('panelProfil').style.display = 'block';
};
window.fermerPanel = function() { document.getElementById('panelProfil').style.display = 'none'; };
window.ouvrirParametres = function() { document.getElementById('panelParametres').style.display = 'block'; };
window.fermerParametres = function() { document.getElementById('panelParametres').style.display = 'none'; };
window.seDeconnecter = function() { localStorage.removeItem('otakus_id'); location.reload(); };
window.reinitialiserCache = function() { if (confirm("Effacer les données locales ?")) { localStorage.clear(); location.reload(); } };
window.changerPseudo = async function() {
    const nouveau = prompt("Nouveau pseudo :", monProfil.pseudo); if (!nouveau) return;
    const dejaExiste = await getDocs(query(collection(db,"membres"), where("pseudo","==",nouveau)));
    if (!dejaExiste.empty) { alert("Pseudo déjà pris."); return; }
    monProfil.pseudo = nouveau;
    await updateDoc(doc(db,"membres",monId), { pseudo: nouveau });
    document.getElementById('pseudoAffiche').innerText = nouveau;
};

const savedId = localStorage.getItem('otakus_id');
if (savedId) { document.getElementById('codeInput').value = CODE_COMMUN; seConnecter(); }
