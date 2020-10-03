// Simple Express server setup to serve the build output
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const path = require('path');

const app = express();
var cors = require('cors');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
app.use(cors());
app.use(helmet());
app.use(compression());

app.use(function (req, res, next) {
    res.setHeader(
        'Content-Security-Policy',
        "script-src 'self' https://peerjs.92k.de"
    );
    return next();
});

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3001;
const DIST_DIR = './dist';

app.use(express.static(DIST_DIR));

app.get('/roomIdGen', (req, res) => {
    res.json({ roomId: uuidV4() });
});

io.on('connection', (socket) => {
    console.log('Client Connected :' + socket.id);
    socket.on('join-room', (roomId, userId) => {
        socket.join(roomId);
        socket.to(roomId).broadcast.emit('user-connected', userId);
        socket.on('disconnect', () => {
            socket.to(roomId).broadcast.emit('user-disconnected', userId);
        });
    });
});

app.use('*', (req, res) => {
    res.sendFile(path.resolve(DIST_DIR, 'index.html'));
});
server.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
);
