// Simple Express server setup to serve for local testing/dev API server
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var cors = require('cors');
const { v4: uuidV4 } = require('uuid');
app.use(helmet());
app.use(compression());
app.use(cors());
const HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.API_PORT || 3002;

app.use(function (req, res, next) {
    res.setHeader(
        'Content-Security-Policy',
        "script-src 'self' https://peerjs.com"
    );
    return next();
});
app.get('/api/v1/endpoint', (req, res) => {
    res.json({ success: true });
});
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

server.listen(PORT, () =>
    console.log(
        `✅  API Server started: http://${HOST}:${PORT}/api/v1/endpoint`
    )
);
