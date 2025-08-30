// app.js (versione multiplayer)
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
const creditiRimastiEl = document.getElementById('crediti-rimasti');
const rosaPersonaleEl = document.getElementById('rosa-personale');
const tabellaLegaBodyEl = document.querySelector('#tabella-lega tbody');
const nomeUtenteEl = document.getElementById('nome-utente');

let mioNome = '';
let sonoAdmin = false;

// -- GESTIONE LOGIN --
btnJoin.addEventListener('click', () => {
    const nome = inputNome.value.trim();
    if (nome) {
        mioNome = nome;
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


// -- RICEZIONE EVENTI DAL SERVER --
socket.on('updateState', (state) => {
    // Aggiorna info giocatore
    if (state.giocatoreCorrenteIndex < state.giocatori.length) {
        const giocatore = state.giocatori[state.giocatoreCorrenteIndex];
        nomeGiocatoreEl.textContent = `${giocatore.nome} (${giocatore.ruolo})`;
        squadraGiocatoreEl.textContent = giocatore.squadra;
    } else {
        nomeGiocatoreEl.textContent = "ASTA FINITA";
        squadraGiocatoreEl.textContent = "";
    }
    
    // Aggiorna info asta
    valoreOffertaEl.textContent = state.offertaCorrente;
    ultimoOfferenteEl.textContent = state.offerenteCorrente || '-';

    // Aggiorna tabella lega
    tabellaLegaBodyEl.innerHTML = '';
    state.partecipanti.forEach((p, index) => {
        const riga = document.createElement('tr');
        // Il primo che si collega è l'admin
        const nomeMostrato = p.nome + (index === 0 ? ' (Admin)' : '');
        riga.innerHTML = `<td>${nomeMostrato}</td><td>${p.crediti}</td><td>${p.rosa.length}</td>`;
        tabellaLegaBodyEl.appendChild(riga);
    });

    // Aggiorna dati personali
    const mioAccount = state.partecipanti.find(p => p.nome === mioNome);
    if (mioAccount) {
        creditiRimastiEl.textContent = mioAccount.crediti;
        rosaPersonaleEl.innerHTML = '';
        mioAccount.rosa.forEach(g => {
            const li = document.createElement('li');
            li.textContent = `${g.nome} (${g.ruolo}) - ${g.squadra}`;
            rosaPersonaleEl.appendChild(li);
        });
        
        // Controlla se sono l'admin
        const admin = state.partecipanti[0];
        if (admin && admin.id === mioAccount.id) {
            sonoAdmin = true;
            btnAssegnaEl.style.display = 'inline-block';
        } else {
            sonoAdmin = false;
            btnAssegnaEl.style.display = 'none'; // Nascondi il pulsante se non sei admin
        }
    }
});