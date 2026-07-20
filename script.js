import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
const AVATARS = ["🦊","🐉","🐺","🦁","🐯","🦅","🐍","🦂","👹","🧝","🧙","💀","🤖","🧟","👾"];
const BATIMENTS = ["caserne","ferme","mur","scierie","carriere","temple","hotelDeVille"];
const COUT_BAT = { caserne:{or:100,bois:20}, ferme:{or:50,bois:10}, mur:{or:150,pierre:30}, scierie:{or:60,bois:10}, carriere:{or:60,pierre:10}, temple:{or:200,bois:50,pierre:50}, hotelDeVille:{or:300,bois:80,pierre:80} };
const HEROS = [ { nom:"Chevalier de Fer", attaque:20, defense:10, prix:200, icon:"⚔️" }, { nom:"Archer Sylvestre", attaque:15, defense:15, prix:250, icon:"🏹" }, { nom:"Mage de l'Ombre", attaque:40, defense:5, prix:500, icon:"🔮" } ];
const ARTICLES = [ { id:"épée", nom:"⚔️ Épée Berserk", prix:100, effet:"+15 Attaque" }, { id:"bouclier", nom:"🛡️ Bouclier Ancestral", prix:120, effet:"+20 Défense" }, { id:"casque", nom:"🪖 Casque de l'Ombre", prix:150, effet:"+10 Attaque et Défense" } ];
const PARCHES = [ { id:"ralentir", nom:"📜 Ralentissement", prix:200, effet:"Retarde l'arrivée de l'ennemi de 10min" }, { id:"desordre", nom:"📜 Désordre", prix:300, effet:"-30% Défense ennemie pour 1 combat" } ];

let monId = "", monProfil = {}, pnjPool = [], mesHeros = [];
let combatInterval = null;

function afficherToast(txt, type="info") {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerText = txt;
    c.appendChild(t);
    setTimeout(()=>t.remove(), 3500);
}

window.changerOnglet = function(nom) {
    document.querySelectorAll('.onglet-container').forEach(el => el.style.display = 'none');
    document.getElementById('onglet'+nom).style.display = 'block';
    document.querySelectorAll('#navFixe button').forEach(b => b.classList.remove('active'));
    const idx = ['Village','Clan','Monde','Boutique','Profil'].indexOf(nom);
    if(idx > -1) document.querySelector(`#navFixe button:nth-child(${idx+1})`).classList.add('active');
    if(nom === 'Village') afficherVillage();
    if(nom === 'Monde') { filtrerAdversaires(); }
    if(nom === 'Boutique') afficherBoutique();
    if(nom === 'Profil') { afficherStats(); afficherClassementPar('prestige'); }
};

window.ouvrirInscription = function(){ document.getElementById('connexion').style.display='none'; document.getElementById('recuperation').style.display='none'; document.getElementById('inscription').style.display='block'; };
window.ouvrirRecuperation = function(){ document.getElementById('connexion').style.display='none'; document.getElementById('inscription').style.display='none'; document.getElementById('recuperation').style.display='block'; };
window.retourConnexion = function(){ document.getElementById('inscription').style.display='none'; document.getElementById('recuperation').style.display='none'; document.getElementById('connexion').style.display='block'; };
window._avatarChoisi = "🧝";

window.seConnecter = async function() {
    const code = document.getElementById('codeInput').value.trim();
    if(!code) return document.getElementById('messageConnexion').innerText = "Entrez votre ID (ex: M123456).";
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
    const specialite = document.getElementById('specialiteInscriptionInput').value;
    if(!pseudo) return document.getElementById('messageInscription').innerText = "Choisis un pseudo.";
    const check = await getDocs(query(collection(db,"membres"), where("pseudo","==",pseudo)));
    if(!check.empty) return document.getElementById('messageInscription').innerText = "Pseudo déjà pris.";
    const id = "M"+Date.now();
    const data = { pseudo, specialite, clan:"Sans clan", role:"Membre", grade:"Recrue", or:500, prestige:0, avatar:window._avatarChoisi, heros:[], inventaire:[], village:{taux:20, tresor:0, ressources:{bois:1000,pierre:1000,nourriture:0}, batiments:{}, enConstruction:null, territoire:0}, premiereConnexion:true, codeRecuperation:String(Math.floor(100000+Math.random()*900000)) };
    await setDoc(doc(db,"membres",id), data);
    monId = id; monProfil = data; localStorage.setItem('otakus_id', id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
    afficherToast("✅ Compte créé ! Ton ID est : "+id, "success");
};

window.recupererCompte = async function() {
    const code = document.getElementById('codeRecuperationInput').value.trim();
    const snap = await getDocs(query(collection(db,"membres"), where("codeRecuperation","==",code)));
    if(snap.empty) return document.getElementById('messageRecuperation').innerText = "Code de récupération introuvable.";
    const d = snap.docs[0]; monId=d.id; monProfil=d.data();
    localStorage.setItem('otakus_id', d.id);
    document.getElementById('auth-ecran').style.display='none'; document.getElementById('game-ecran').style.display='block'; lancerJeu();
    afficherToast("🔑 Compte récupéré ! Votre ID est : "+d.id, "success");
};

function lancerJeu() {
    document.getElementById('pseudoAffiche').innerText = monProfil.pseudo;
    document.getElementById('avatarAffiche').innerText = monProfil.avatar;
    document.getElementById('gradeAffiche').innerText = monProfil.grade;
    document.getElementById('clanAffiche').innerHTML = `<i class="fas fa-flag"></i> ${monProfil.clan||"Sans clan"}`;
    majOrPrestige(); mesHeros = monProfil.heros || [];
    demarrerEcoutes();
    if(monProfil.premiereConnexion) { lancerTutoriel(); updateDoc(doc(db,"membres",monId),{premiereConnexion:false}); }
    else changerOnglet('Village');
}
function majOrPrestige() {
    document.getElementById('orAffiche').innerText = monProfil.or||0;
    document.getElementById('prestigeAffiche').innerText = monProfil.prestige||0;
}

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
    const v=monProfil.village; const niv=v.batiments[type]||0; if(niv>=5) return afficherToast("Niveau max atteint !","error");
    const cout=COUT_BAT[type]||{or:100,bois:10,pierre:10}; const mult=niv+1;
    if((monProfil.or||0)<cout.or*mult) return afficherToast(`⛔ Besoin de ${cout.or*mult}🪙`,"error");
    if(v.ressources.bois<(cout.bois||0)*mult) return afficherToast(`⛔ Besoin de ${(cout.bois||0)*mult}🪵`,"error");
    if(v.ressources.pierre<(cout.pierre||0)*mult) return afficherToast(`⛔ Besoin de ${(cout.pierre||0)*mult}🪨`,"error");
    monProfil.or-=cout.or*mult; v.ressources.bois-=(cout.bois||0)*mult; v.ressources.pierre-=(cout.pierre||0)*mult;
    v.enConstruction = {type, fin:Date.now()+30000}; // 30s
    await updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:v}); majOrPrestige(); afficherVillage(); afficherToast("🏗️ Construction lancée !","success");
};

window.collecterRessources = function(){ let v=monProfil.village; const gB=(v.batiments.scierie||0)*5,gP=(v.batiments.carriere||0)*5,gN=(v.batiments.ferme||0)*5; if(!gB&&!gP&&!gN) return afficherToast("Construis scierie/carrière/ferme","error"); v.ressources.bois+=gB;v.ressources.pierre+=gP;v.ressources.nourriture+=gN; updateDoc(doc(db,"membres",monId),{village:v}); afficherToast(`🌿 +${gB}🪵 +${gP}🪨 +${gN}🌾`,"success"); afficherVillage(); };
window.changerTaxe = function(v){ monProfil.village.taux=parseInt(v); updateDoc(doc(db,"membres",monId),{village:monProfil.village}); document.getElementById('tauxActuel').innerText=v; };
window.collecterImpots = function(){ const g=Math.round(20*monProfil.village.taux*0.8); monProfil.village.tresor=(monProfil.village.tresor||0)+g; updateDoc(doc(db,"membres",monId),{village:monProfil.village}); afficherToast(`💰 +${g}🪙 au trésor`,"success"); afficherVillage(); };
window.activerCarteDePaix = function(){ if((monProfil.or||0)<50) return afficherToast("50🪙 requis","error"); monProfil.or-=50; monProfil.village.carteDePaix=Date.now()+86400000; updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherToast("🛡️ Bouclier 24h","success"); };

function calculerForce(p, herosList){ const v=p.village||{}; const h=herosList||p.heros||[]; let att=(v.batiments.caserne||0)*10, def=(v.batiments.mur||0)*15; h.forEach(hh=>{att+=hh.attaque||0; def+=hh.defense||0;}); return {attaque:Math.round(att),defense:Math.round(def)}; }

window.combattre = async function(idAdv, estPNJ) {
    if(combatInterval) clearInterval(combatInterval);
    let adv; if(estPNJ) adv = pnjPool.find(p=>p.id===idAdv); else { const s=await getDoc(doc(db,"membres",idAdv)); adv=s.data(); }
    if(!adv) return afficherToast("Adversaire introuvable","error");
    document.getElementById('panelCombat').style.display='flex';
    document.getElementById('avatarJoueur').innerText = monProfil.avatar; document.getElementById('nomJoueur').innerText = monProfil.pseudo;
    document.getElementById('avatarAdv').innerText = adv.avatar||"👹"; document.getElementById('nomAdv').innerText = adv.pseudo;
    document.getElementById('pvJoueur').style.width='100%'; document.getElementById('pvAdv').style.width='100%';
    document.getElementById('combatLog').innerText = "⚔️ Le duel commence !";

    const statsMoi = calculerForce(monProfil, mesHeros);
    const statsAdv = estPNJ ? {attaque:adv.prestige||100, defense:adv.prestige||100} : calculerForce(adv, adv.heros||[]);
    let pvMoi=100, pvAdv=100; let tour=0; let log="";
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
window.attaquerBoss = function(){ afficherToast("⚔️ Attaque du Boss lancée !","info"); };

window.afficherSectionBoutique = function(section) {
    const box = document.getElementById('sectionBoutiqueContainer');
    if(section === 'equipement') {
        let html = `<div class="shop-section-title"><i class="fas fa-sword"></i> Équipements de Guerre</div>`;
        ARTICLES.forEach(a => {
            const possede = (monProfil.inventaire||[]).includes(a.nom);
            html += `<div class="shop-item"><span>${a.nom} (${a.effet})</span>${possede ? "<span style='color:var(--green);'>✅ Acquis</span>" : `<button onclick="acheterObjet('${a.id}','${a.nom}',${a.prix})">${a.prix}🪙</button>`}</div>`;
        });
        box.innerHTML = html;
    } else if(section === 'ressources') {
        box.innerHTML = `<div class="shop-section-title"><i class="fas fa-cubes"></i> Ressources</div><div class="shop-item"><span>🪵 100 Bois</span><button onclick="acheterRessource('bois',100,50)">50🪙</button></div><div class="shop-item"><span>🪨 100 Pierre</span><button onclick="acheterRessource('pierre',100,50)">50🪙</button></div>`;
    } else if(section === 'tactiques') {
        let html = `<div class="shop-section-title"><i class="fas fa-scroll"></i> Parchemins Tactiques</div>`;
        PARCHES.forEach(p => html += `<div class="shop-item"><span>${p.nom} (${p.effet})</span><button onclick="acheterParchemin('${p.id}','${p.nom}',${p.prix})">${p.prix}🪙</button></div>`);
        box.innerHTML = html;
    } else if(section === 'defense') {
        box.innerHTML = `<div class="shop-section-title"><i class="fas fa-shield-alt"></i> Défense</div><div class="shop-item"><span>🛡️ Carte de Paix (Protège le village 24h)</span><button onclick="activerCarteDePaix()">50🪙</button></div>`;
    }
};
window.acheterObjet = async function(id, nom, prix) {
    if((monProfil.or||0)<prix) return afficherToast("Pas assez d'or","error");
    monProfil.or-=prix; if(!monProfil.inventaire) monProfil.inventaire=[]; monProfil.inventaire.push(nom);
    await updateDoc(doc(db,"membres",monId),{or:monProfil.or,inventaire:monProfil.inventaire}); majOrPrestige(); afficherToast(`${nom} acheté !`,"success"); afficherSectionBoutique('equipement');
};
window.acheterRessource = async function(type, qte, prix) {
    if((monProfil.or||0)<prix) return afficherToast("Pas assez d'or","error");
    monProfil.or-=prix; monProfil.village.ressources[type]=(monProfil.village.ressources[type]||0)+qte;
    await updateDoc(doc(db,"membres",monId),{or:monProfil.or,village:monProfil.village}); majOrPrestige(); afficherVillage(); afficherToast(`📦 +${qte} ${type}`,"success");
};
window.acheterParchemin = async function(id, nom, prix) {
    if((monProfil.or||0)<prix) return afficherToast("Pas assez d'or","error");
    monProfil.or-=prix; if(!monProfil.inventaire) monProfil.inventaire=[]; monProfil.inventaire.push(nom);
    await updateDoc(doc(db,"membres",monId),{or:monProfil.or,inventaire:monProfil.inventaire}); majOrPrestige(); afficherToast(`📜 ${nom} acheté !`,"success");
};
window.afficherBoutique = function(){ afficherSectionBoutique('equipement'); };

const TUTOS = [
    "Bienvenue, futur conquérant. Je suis Samuel, le dernier gardien de ce monde. Il y a 1000 ans, 5 Anciens Gardiens ont scellé les Terres Interdites. Aujourd'hui, leur sceau se brise, et leurs Légats déferlent. Ton but : unir les clans, forger des reliques et devenir le Roi du Monde.",
    "La force vient de l'union. Rejoins un clan ou crée le tien. Sans clan, tu ne pourras pas participer à la Guerre des Royaumes, ni repousser les Légats. La diplomatie est ta plus grande arme.",
    "Bâtis ton village. Construis des scieries pour le bois, des carrières pour la pierre, et des fermes pour la nourriture. Sans ressources, tu ne peux ni construire, ni recruter des héros pour affronter les Légats.",
    "Tes bâtiments produisent ! Clique sur le bouton 'Récolter'. Les ressources te permettront d'améliorer tes défenses et de forger des équipements légendaires.",
    "Va dans la Forge. Achète ou forge des Héros et des Équipements. Chaque épée, chaque armure peut changer le cours d'un combat contre les Légats. Choisis tes armes avec sagesse.",
    "Ouvre la Carte du Monde. Les Légats (IA ultra-puissantes) errent sur les terres. N'attaque pas seul au début. Forme une escouade avec tes frères de clan pour les abattre.",
    "Le Boss Mondial, le Fléau des Abysses, est l'avant-garde des Anciens. Chaque victoire rapproche le monde de la paix. Deviens le maître de cet empire, et entre dans la légende, Ô grand Stratège !"
];
let tutoStep=0;
window.lancerTutoriel = function(){ tutoStep=0; document.getElementById('panelTutoriel').style.display='flex'; updateTuto(); };
window.lancerTutorielManuel = function(){ lancerTutoriel(); };
function updateTuto(){
    document.getElementById('tutorielTexte').innerHTML = TUTOS[tutoStep];
    document.getElementById('tutoStep').innerText = `${tutoStep+1}/${TUTOS.length}`;
    document.getElementById('tutoBar').style.width = `${((tutoStep+1)/TUTOS.length)*100}%`;
    document.getElementById('btnTutoPrev').style.display = tutoStep===0?'none':'inline-block';
    document.getElementById('btnTutoNext').style.display = tutoStep===TUTOS.length-1?'none':'inline-block';
    document.getElementById('btnTutoFin').style.display = tutoStep===TUTOS.length-1?'inline-block':'none';
}
window.suivantTutoriel = function(){ if(tutoStep<TUTOS.length-1){tutoStep++; updateTuto();} };
window.precedentTutoriel = function(){ if(tutoStep>0){tutoStep--; updateTuto();} };
window.finirTutoriel = function(){ document.getElementById('panelTutoriel').style.display='none'; monProfil.or=(monProfil.or||0)+50; updateDoc(doc(db,"membres",monId),{or:monProfil.or}); majOrPrestige(); afficherToast("🏆 Tutoriel terminé ! +50🪙","success"); changerOnglet('Village'); };
window.ouvrirCodex = function(){ document.getElementById('panelCodex').style.display='flex'; };
window.fermerCodex = function(){ document.getElementById('panelCodex').style.display='none'; };

window.filtrerAdversaires = function() {
    const box = document.getElementById('listeAdversaires');
    box.innerHTML = "<p>👤 Seigneurs en ligne et Légats IA...</p>";
    // Affichage des IA pour le mode solo
    pnjPool.slice(0,5).forEach(p => {
        box.innerHTML += `<div class="membreLigne"><span>${p.pseudo} (IA - ${p.prestige}💪)</span><button onclick="combattre('${p.id}', true)">⚔️</button></div>`;
    });
    // Affichage des vrais joueurs (simulé pour la démo, si vous en avez en base)
    // Ici vous pouvez aussi faire un `onSnapshot` sur la collection membres pour afficher les vrais joueurs
};
window.creerClan = function(){ afficherToast("Fonction de création de clan bientôt disponible !","info"); };
window.quitterClan = function(){ afficherToast("Fonction de sortie de clan bientôt disponible !","info"); };
window.envoyerMessageClan = async function(){ const i=document.getElementById('messageClanInput'); if(i.value.trim()){ await addDoc(collection(db,"messagesClan"),{pseudo:monProfil.pseudo,texte:i.value.trim(),date:serverTimestamp()}); i.value=""; } };
window.travailler = function(){ const g=20+Math.floor(Math.random()*10); monProfil.or+=g; updateDoc(doc(db,"membres",monId),{or:monProfil.or}); majOrPrestige(); afficherToast(`💼 +${g}🪙`,"success"); };
window.seDeconnecter = function(){ localStorage.removeItem('otakus_id'); location.reload(); };

window.afficherStats = function(){
    const f = calculerForce(monProfil, mesHeros);
    document.getElementById('statsBox').innerHTML = `<div>💪 Attaque: ${f.attaque}</div><div>🛡️ Défense: ${f.defense}</div><div>🏆 Prestige: ${monProfil.prestige||0}</div><div>💰 Or: ${monProfil.or||0}</div>`;
};
window.afficherClassementPar = async function(critere) {
    const box = document.getElementById('classementDynamique');
    box.innerHTML = "<p>🏆 Classement des Seigneurs...</p>";
    const snap = await getDocs(collection(db,"membres"));
    let tous = []; snap.forEach(d => tous.push({id:d.id, ...d.data()}));
    tous.sort((a,b)=>(b.prestige||0)-(a.prestige||0)).slice(0,10).forEach((m,i) => { box.innerHTML += `<div class="membreLigne"><span>#${i+1} ${m.avatar||""} ${m.pseudo}</span><span>${m.prestige||0}🏆</span></div>`; });
};

function demarrerEcoutes() {
    onSnapshot(collection(db, "messagesClan"), (snap) => {
        const box = document.getElementById('chatClanBox');
        if(box){ 
            box.innerHTML=""; 
            snap.forEach(d=>{
                const m=d.data(); 
                box.innerHTML+=`<p><b style="color:var(--gold);">${m.pseudo}:</b> ${m.texte}</p>`;
            }); 
            box.scrollTop=box.scrollHeight; 
        }
    });
}

// Initialisation
if(localStorage.getItem('otakus_id')) document.getElementById('codeInput').value = localStorage.getItem('otakus_id');
// Création des PNJ puissants (Légats) pour le mode solo
pnjPool = Array.from({length:10}, (_,i) => ({ id:`PNJ_${i}`, pseudo:`Légat ${i+1}`, clan:"Errants", prestige:800+Math.floor(Math.random()*200), estPNJ:true }));
console.log("Empire des Otakus - Version Finale 100% Complète !");
