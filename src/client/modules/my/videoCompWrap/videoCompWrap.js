import { LightningElement, api, track } from 'lwc';
import Peer from 'simple-peer';
export default class VideoCompWrap extends LightningElement {
    @api domainName;
    @api socket;
    @track peerRef = [];
    @track peers = [];
    // eslint-disable-next-line no-undef
    userVideo;
    peerConn;
    connectedCallback() {
        this.initializeSelfVideo();
        console.log(this.socket);
    }
    async renderedCallback() {
        this.userVideo = this.template.querySelector('.myVideo');
        this.userVideo.muted = true;
    }
    initializeSocket() {
        //bind the onSocketEvent method to the 'cdc' socket event to update the chart with new incoming data
        if (this.socket && !this.socketInitialized) {
            this.socket.on(
                'user-disconnected',
                this.removeVideoStream.bind(this)
            );
            this.socketInitialized = true;
        }
    }

    initializeSelfVideo() {
        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: true
            })
            .then((stream) => {
                this.userVideo.srcObject = stream;
                this.userVideo.play();
                this.socket.emit('join room', 'myroom');
                this.socket.on('all users', (users) => {
                    const localPeer = [];
                    users.forEach((userId) => {
                        const peer = this.handleCreatePeer(
                            userId,
                            this.socket.id,
                            stream
                        );
                        this.peerRef.push({
                            peerId: userId,
                            peer: peer
                        });

                        localPeer.push(peer);
                    });
                    this.peers = localPeer;
                });
                this.socket.on('user joined', (payload) => {
                    const item = this.peerRef.find(
                        (p) => p.peerId === payload.callerId
                    );
                    if (!item) {
                        const peer = this.handleAddPeer(
                            payload.signal,
                            payload.callerId,
                            stream
                        );
                        this.peerRef.push({
                            peerId: payload.callerId,
                            peer: peer
                        });
                        this.peers.push(peer);
                    }
                });
                this.socket.on('receiving returned signal', (payload) => {
                    const item = this.peerRef.find(
                        (p) => p.peerId === payload.id
                    );
                    item.peer.signal(payload.signal);
                });
            })
            .catch((error) => {
                // eslint-disable-next-line no-alert
                alert(error);
            });
    }
    handleCreatePeer(userToSignal, callerId, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream
        });

        peer.on('signal', (signal) => {
            this.socket.emit('sending signal', {
                userToSignal,
                callerId,
                signal
            });
        });
        peer.on('stream', (streamVid) => {
            this.handleVideoPlayer('temp', streamVid);
        });
        return peer;
    }

    handleAddPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream
        });
        peer.on('signal', (signal) => {
            console.log(signal);

            this.socket.emit('returning signal', { signal, callerId });
        });
        peer.on('stream', (streamVid) => {
            this.handleVideoPlayer('temp', streamVid);
        });
        peer.signal(incomingSignal);
        return peer;
    }
    handleVideoPlayer(peerId, stream) {
        let videoPlayer = this.template.querySelectorAll(`video`);
        if (videoPlayer) {
            videoPlayer[1].srcObject = stream;
            videoPlayer[1].play();
        }
    }
}
