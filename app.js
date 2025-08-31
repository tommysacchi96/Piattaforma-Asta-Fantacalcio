// app.js (versione con pulsante "Non Assegnato")
const socket = io();

// Elementi del Login
const loginOverlay = document.getElementById('login-overlay');
const inputNome = document.getElementById('input-nome');
const btnJoin = document.getElementById('btn-join');

// Elementi della UI
const nomeGiocatoreEl = document.getElementById('nome-giocatore');
const squadraGiocatoreEl = document.getElementById('squadra-giocatore');
const valoreOffertaEl = document.getElementById('valore-offerta');
const ultimoOfferenteEl = document.getElementById('ultimo-offerente');
const inputOffertaEl = document.getElementById('input-offerta');
const btnOffertaEl = document.getElementById('btn-offerta');
const btnAssegnaEl = document.getElementById('btn-assegna');
const btnSkipEl = document.getElementById('btn-skip'); // NUOVO
const creditiRimastiEl = document.getElementById('crediti-rimasti');
const tabellaLegaBodyEl = document.querySelector('#tabella-lega tbody');
const nomeUtenteEl = document.getElementById('nome-utente');
const rosaPortieriEl = document.getElementById('rosa-portieri');
const rosaDifensoriEl = document.getElementById('rosa-difensori');
const rosaCentrocampistiEl = document.getElementById('rosa-centrocampisti');
const rosaAttaccantiEl = document.getElementById('rosa-attaccanti');
// Rimuoviamo il riferimento al pulsante "Termina Asta" che non usiamo
// const btnEndAuction = document.getElementById('btn-end-auction'); 

let mioNome = '';
let sonoAdmin = false;

window.addEventListener('load', () => {
    const nomeSalvato = sessionStorage.getItem('nomeUtenteAsta');
    if (nomeSalvato) {
        mioNome = nomeSalvato;
        nomeUtenteEl.textContent = mioNome;
        socket.emit('join', mioNome);
        loginOverlay.style.display = 'none';
    }
});

btnJoin.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (nome) {
        mioNome = nome;
        sessionStorage.setItem('nomeUtenteAsta', nome);
        nomeUtenteEl.textContent = mioNome;
        socket.emit('join', nome);
        loginOverlay.style.display = 'none';
    }
});

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

// NUOVO: Event listener per il pulsante "Non Assegnato"
btnSkipEl.addEventListener('click', () => {
    if (sonoAdmin) {
        socket.emit('skipPlayer');
    } else {
        alert("Solo l'amministratore può saltare un giocatore.");
    }
});

socket.on('updateState', (state) => {
    if (state.giocatoreCorrenteIndex < state.giocatori.length) {
        const giocatore = state.giocatori[state.giocatoreCorrenteIndex];
        nomeGiocatoreEl.textContent = `${giocatore.nome} (${giocatore.ruolo})`;
        squadraGiocatoreEl.textContent = giocatore.squadra;
    } else {
        nomeGiocatoreEl.textContent = "ASTA FINITA";
        squadraGiocatoreEl.textContent = "";
        btnOffertaEl.disabled = true;
        btnAssegnaEl.disabled = true;
        btnSkipEl.disabled = true; // NUOVO
        inputOffertaEl.disabled = true;
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
            btnSkipEl.style.display = 'inline-block'; // NUOVO
        } else {
            sonoAdmin = false;
            btnAssegnaEl.style.display = 'none';
            btnSkipEl.style.display = 'none'; // NUOVO
        }
    }
});

socket.on('auctionEnded', () => {
    alert("L'asta è stata terminata dall'amministratore!");
    nomeGiocatoreEl.textContent = "ASTA TERMINATA";
    squadraGiocatoreEl.textContent = "L'amministratore ha chiuso la sessione.";
    btnOffertaEl.disabled = true;
    btnAssegnaEl.disabled = true;
    btnSkipEl.disabled = true; // NUOVO
    inputOffertaEl.disabled = true;
});
