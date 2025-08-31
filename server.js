// server.js (versione con skip giocatore)
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

    socket.on('join', (nome) => {
        let utenteEsistente = astaState.partecipanti.find(p => p.nome === nome);
        if (utenteEsistente) {
            utenteEsistente.id = socket.id;
            console.log(`${nome} si è riconnesso.`);
        } else {
            const nuovoUtente = { id: socket.id, nome: nome, crediti: 500, rosa: [] };
            astaState.partecipanti.push(nuovoUtente);
            console.log(`${nome} si è unito all'asta.`);
        }
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

    // NUOVA FUNZIONALITÀ: Salta il giocatore corrente
    socket.on('skipPlayer', () => {
        const admin = astaState.partecipanti[0];
        // Controlla che sia l'admin e che non ci siano offerte
        if (admin && socket.id === admin.id && astaState.offertaCorrente === 0) {
            console.log(`Giocatore saltato dall'admin: ${admin.nome}`);
            astaState.giocatoreCorrenteIndex++; // Passa al prossimo giocatore
            io.emit('updateState', astaState); // Invia lo stato aggiornato a tutti
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
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
