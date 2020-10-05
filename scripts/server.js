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
        "script-src 'self' https://peerjs.com"
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

const users = {};

const socketToRoom = {};
io.on('connection', (socket) => {
    socket.on('join room', (roomId) => {
        if (users[roomId]) {
            const length = users[roomId].length;
            if (length === 4) {
                socket.emit('room full');
                return;
            }
            users[roomId].push(socket.id);
        } else {
            users[roomId] = [socket.id];
        }
        socketToRoom[socket.id] = roomId;
        const usersInThisRoom = users[roomId].filter((id) => id !== socket.id);

        socket.emit('all users', usersInThisRoom);
    });

    socket.on('sending signal', (payload) => {
        io.to(payload.userToSignal).emit('user joined', {
            signal: payload.signal,
            callerId: payload.callerId
        });
    });

    socket.on('returning signal', (payload) => {
        io.to(payload.callerId).emit('receiving returned signal', {
            signal: payload.signal,
            id: socket.id
        });
    });

    socket.on('disconnect', () => {
        const roomId = socketToRoom[socket.id];
        let room = users[roomId];
        if (room) {
            room = room.filter((id) => id !== socket.id);
            users[roomId] = room;
        }
    });
});

app.use('*', (req, res) => {
    res.sendFile(path.resolve(DIST_DIR, 'index.html'));
});
server.listen(PORT, () =>
    console.log(`✅  Server started: http://${HOST}:${PORT}`)
);
