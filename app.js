// app.js (versione con memoria nome utente)
const socket = io();

// Elementi del Login
const loginOverlay = document.getElementById('login-overlay');
const inputNome = document.getElementById('input-nome');
const btnJoin = document.getElementById('btn-join');

// ... (tutti gli altri 'const' per gli elementi della UI rimangono invariati)
const nomeGiocatoreEl = document.getElementById('nome-giocatore');
const squadraGiocatoreEl = document.getElementById('squadra-giocatore');
const valoreOffertaEl = document.getElementById('valore-offerta');
const ultimoOfferenteEl = document.getElementById('ultimo-offerente');
const inputOffertaEl = document.getElementById('input-offerta');
const btnOffertaEl = document.getElementById('btn-offerta');
const btnAssegnaEl = document.getElementById('btn-assegna');
const creditiRimastiEl = document.getElementById('crediti-rimasti');
const tabellaLegaBodyEl = document.querySelector('#tabella-lega tbody');
const nomeUtenteEl = document.getElementById('nome-utente');
const rosaPortieriEl = document.getElementById('rosa-portieri');
const rosaDifensoriEl = document.getElementById('rosa-difensori');
const rosaCentrocampistiEl = document.getElementById('rosa-centrocampisti');
const rosaAttaccantiEl = document.getElementById('rosa-attaccanti');
const btnEndAuction = document.getElementById('btn-end-auction');


let mioNome = '';
let sonoAdmin = false;

// NUOVA FUNZIONE: Controlla se il nome è già salvato nel browser
window.addEventListener('load', () => {
    const nomeSalvato = sessionStorage.getItem('nomeUtenteAsta');
    if (nomeSalvato) {
        mioNome = nomeSalvato;
        nomeUtenteEl.textContent = mioNome;
        socket.emit('join', mioNome);
        loginOverlay.style.display = 'none';
    }
});


// -- GESTIONE LOGIN --
btnJoin.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (nome) {
        mioNome = nome;
        // Salva il nome nella memoria del browser
        sessionStorage.setItem('nomeUtenteAsta', nome);
        nomeUtenteEl.textContent = mioNome;
        socket.emit('join', nome);
        loginOverlay.style.display = 'none';
    }
});

// -- INVIO EVENTI AL SERVER --
btnOffertaEl.addEventListener('click', () => {
    const offerta = parseInt(inputOffertaEl.value);
    if (!isNaN(offerta) && offerta > 0) {
        socket.emit('bid', offerta);
        inputOffertaEl.value = '';
    }
});

btnAssegnaEl.addEventListener('click', () => {
    if (sonoAdmin) {
        socket.emit('assign');
    } else {
        alert("Solo l'amministratore può assegnare i giocatori.");
    }
});

btnEndAuction.addEventListener('click', () => {
    if (sonoAdmin && confirm("Sei sicuro di voler terminare l'asta per tutti?")) {
        socket.emit('forceEnd');
    }
});


// -- RICEZIONE EVENTI DAL SERVER --
socket.on('updateState', (state) => {
    // ... (il resto di questa funzione rimane esattamente come prima)
    if (state.giocatoreCorrenteIndex < state.giocatori.length) {
        const giocatore = state.giocatori[state.giocatoreCorrenteIndex];
        nomeGiocatoreEl.textContent = `${giocatore.nome} (${giocatore.ruolo})`;
        squadraGiocatoreEl.textContent = giocatore.squadra;
    } else {
        nomeGiocatoreEl.textContent = "ASTA FINITA";
        squadraGiocatoreEl.textContent = "";
    }
    valoreOffertaEl.textContent = state.offertaCorrente;
    ultimoOfferenteEl.textContent = state.offerenteCorrente || '-';
    tabellaLegaBodyEl.innerHTML = '';
    state.partecipanti.forEach((p, index) => {
        const riga = document.createElement('tr');
        const nomeMostrato = p.nome + (index === 0 ? ' (Admin)' : '');
        riga.innerHTML = `<td>${nomeMostrato}</td><td>${p.crediti}</td><td>${p.rosa.length}</td>`;
        tabellaLegaBodyEl.appendChild(riga);
    });
    const mioAccount = state.partecipanti.find(p => p.nome === mioNome);
    if (mioAccount) {
        creditiRimastiEl.textContent = mioAccount.crediti;
        rosaPortieriEl.innerHTML = '';
        rosaDifensoriEl.innerHTML = '';
        rosaCentrocampistiEl.innerHTML = '';
        rosaAttaccantiEl.innerHTML = '';
        mioAccount.rosa.forEach(g => {
            const li = document.createElement('li');
            li.textContent = `${g.nome} (${g.squadra})`;
            if (g.ruolo === 'P') { rosaPortieriEl.appendChild(li); } 
            else if (g.ruolo === 'D') { rosaDifensoriEl.appendChild(li); } 
            else if (g.ruolo === 'C') { rosaCentrocampistiEl.appendChild(li); } 
            else if (g.ruolo === 'A') { rosaAttaccantiEl.appendChild(li); }
        });
        const admin = state.partecipanti[0];
        if (admin && admin.id === mioAccount.id) {
            sonoAdmin = true;
            btnAssegnaEl.style.display = 'inline-block';
            btnEndAuction.style.display = 'inline-block';
        } else {
            sonoAdmin = false;
            btnAssegnaEl.style.display = 'none';
            btnEndAuction.style.display = 'none';
        }
    }
});

// NUOVA GESTIONE: Cosa fare quando l'asta viene terminata forzatamente
socket.on('auctionEnded', (state) => {
    alert("L'asta è stata terminata dall'amministratore!");
    nomeGiocatoreEl.textContent = "ASTA TERMINATA";
    squadraGiocatoreEl.textContent = "L'amministratore ha chiuso la sessione.";
    // Disabilita i pulsanti
    btnOffertaEl.disabled = true;
    btnAssegnaEl.disabled = true;
    inputOffertaEl.disabled = true;
});
