// server.js (versione con gestione riconnessioni)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname));

let calciatori = [];
try {
    const data = fs.readFileSync('calciatori.json', 'utf8');
    calciatori = JSON.parse(data);
} catch (err) {
    console.error("Errore nel leggere calciatori.json:", err);
}

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

    socket.emit('updateState', astaState);

    // LOGICA DI JOIN MIGLIORATA
    socket.on('join', (nome) => {
        // Cerca se un utente con lo stesso nome è già presente (magari disconnesso)
        let utenteEsistente = astaState.partecipanti.find(p => p.nome === nome);

        if (utenteEsistente) {
            // Se l'utente esiste, è una RICONNESSIONE. Aggiorniamo il suo socket ID.
            utenteEsistente.id = socket.id; // Ri-associa il vecchio utente al nuovo socket
            console.log(`${nome} si è riconnesso.`);
        } else {
            // Se non esiste, è un NUOVO UTENTE.
            const nuovoUtente = { id: socket.id, nome: nome, crediti: 500, rosa: [] };
            astaState.partecipanti.push(nuovoUtente);
            console.log(`${nome} si è unito all'asta.`);
        }
        
        // Invia lo stato aggiornato a tutti
        io.emit('updateState', astaState);
    });

    socket.on('bid', (offerta) => {
        const utente = astaState.partecipanti.find(p => p.id === socket.id);
        if (utente && offerta > astaState.offertaCorrente && offerta <= utente.crediti) {
            astaState.offertaCorrente = offerta;
            astaState.offerenteCorrente = utente.nome;
            io.emit('updateState', astaState);
        }
    });
    
    socket.on('assign', () => {
        const admin = astaState.partecipanti[0];
        if (admin && socket.id === admin.id && astaState.offertaCorrente > 0) {
            const vincitore = astaState.partecipanti.find(p => p.nome === astaState.offerenteCorrente);
            if(vincitore){
                const giocatoreVinto = astaState.giocatori[astaState.giocatoreCorrenteIndex];
                
                vincitore.crediti -= astaState.offertaCorrente;
                vincitore.rosa.push(giocatoreVinto);
                
                astaState.giocatoreCorrenteIndex++;
                astaState.offertaCorrente = 0;
                astaState.offerenteCorrente = null;
                
                io.emit('updateState', astaState);
            }
        }
    });

    socket.on('forceEnd', () => {
        const admin = astaState.partecipanti[0];
        if (admin && socket.id === admin.id) {
            console.log(`Asta terminata forzatamente dall'admin: ${admin.nome}`);
            io.emit('auctionEnded', astaState);
        }
    });

    socket.on('disconnect', () => {
        console.log('Un utente si è disconnesso:', socket.id);
        // NON rimuoviamo l'utente dalla lista, così può riconnettersi
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
