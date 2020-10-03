// Simple Express server setup to serve the build output
// Simple Express server setup to serve for local testing/dev API server
const compression = require('compression');
const helmet = require('helmet');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const { v4: uuidV4 } = require('uuid');
app.use(helmet());
app.use(compression());

const HOST = process.env.API_HOST || 'localhost';
const PORT = process.env.API_PORT || 3002;

app.get('/api/v1/endpoint', (req, res) => {
    res.json({ success: true });
});
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

server.listen(PORT, () =>
    console.log(
        `✅  API Server started: http://${HOST}:${PORT}/api/v1/endpoint`
    )
);
