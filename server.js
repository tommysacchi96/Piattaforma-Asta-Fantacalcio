// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servi i file statici (html, css, js client)
app.use(express.static(__dirname));

let calciatori = [];
try {
    const data = fs.readFileSync('calciatori.json', 'utf8');
    calciatori = JSON.parse(data);
} catch (err) {
    console.error("Errore nel leggere calciatori.json:", err);
}

// Stato centrale dell'asta
const astaState = {
    giocatori: calciatori,
    partecipanti: [],
    giocatoreCorrenteIndex: 0,
    offertaCorrente: 0,
    offerenteCorrente: null,
    astaInPausa: true
};

io.on('connection', (socket) => {
    console.log('Un utente si è connesso:', socket.id);

    // Invia lo stato attuale al nuovo utente
    socket.emit('updateState', astaState);

    socket.on('join', (nome) => {
        if (!astaState.partecipanti.find(p => p.id === socket.id)) {
            const nuovoUtente = { id: socket.id, nome: nome, crediti: 500, rosa: [] };
            astaState.partecipanti.push(nuovoUtente);
            console.log(`${nome} si è unito all'asta.`);
            io.emit('updateState', astaState); // Invia lo stato aggiornato a tutti
        }
    });

    socket.on('bid', (offerta) => {
        const utente = astaState.partecipanti.find(p => p.id === socket.id);
        if (utente && offerta > astaState.offertaCorrente && offerta <= utente.crediti) {
            astaState.offertaCorrente = offerta;
            astaState.offerenteCorrente = utente.nome;
            io.emit('updateState', astaState);
        }
    });
    
    // Solo l'admin (il primo che si collega) può assegnare
    socket.on('assign', () => {
        const admin = astaState.partecipanti[0];
        if (admin && socket.id === admin.id && astaState.offertaCorrente > 0) {
            const vincitore = astaState.partecipanti.find(p => p.nome === astaState.offerenteCorrente);
            const giocatoreVinto = astaState.giocatori[astaState.giocatoreCorrenteIndex];
            
            vincitore.crediti -= astaState.offertaCorrente;
            vincitore.rosa.push(giocatoreVinto);
            
            astaState.giocatoreCorrenteIndex++;
            astaState.offertaCorrente = 0;
            astaState.offerenteCorrente = null;
            
            io.emit('updateState', astaState);
        }
    });

    socket.on('disconnect', () => {
        console.log('Un utente si è disconnesso:', socket.id);
        // Opzionale: gestire la disconnessione degli utenti
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});