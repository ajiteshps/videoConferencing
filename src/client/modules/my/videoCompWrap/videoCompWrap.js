import { LightningElement, api, track } from 'lwc';
export default class VideoCompWrap extends LightningElement {
    @api domainName;
    roomId;
    @api socket;
    socketInitialized = false;
    @track userConnectedInfo = [];
    // eslint-disable-next-line no-undef
    @track myPeer;
    call;
    connectedCallback() {
        let urlParam = new URLSearchParams(window.location.search);
        // eslint-disable-next-line no-undef
        this.myPeer = new Peer(`ajiteshps${new Date().getTime()}`);
        console.log(this.myPeer);
        if (urlParam.has('roomId')) {
            this.roomId = urlParam.get('roomId');
            this.myPeer.on('open', this.handleRoomJoining.bind(this));
        } else {
            this.myPeer.on('open', this.handleRoomCreation.bind(this));
        }
    }
    async renderedCallback() {
        if (!this.socketInitialized && this.socket) {
            this.initializeSocket();
        }
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
                let videoElement = this.template.querySelector(
                    `.${this.userConnectedInfo[0].userId}`
                );
                videoElement.srcObject = stream;
                videoElement.muted = true;
                videoElement.addEventListener('loadedmetadata', () => {
                    videoElement.play();
                });
                this.socket.on(
                    'user-connected',
                    this.connectToNewUser.bind(this, stream)
                );
                this.myPeer.on('call', (call) => {
                    console.log(call);
                    call.answer(stream);
                    call.on('stream', (userVideoStream) => {
                        this.addNewUserToListHelper(call.peer);
                        this.addVideoStream(call.peer, userVideoStream);
                    });
                    call.on('close', () => {
                        this.removeVideoStream(call.peer);
                    });
                });
            })
            .catch((error) => {
                // eslint-disable-next-line no-alert
                alert(error);
            });
    }

    connectToNewUser(stream, peerId) {
        console.log('New User connected');
        console.log('stream', stream);
        console.log('peerId', peerId);
        if (stream && peerId) {
            const call = this.myPeer.call(peerId, stream);
            call.on('stream', this.addVideoStream.bind(this, peerId));
            call.on('close', () => {
                this.removeVideoStream(this, peerId);
            });
        }
    }

    addVideoStream(peerId, userVideoStream) {
        console.log('peerId', peerId);
        console.log('userVideoStream', userVideoStream);
        if (peerId && userVideoStream) {
            this.addNewUserToListHelper(peerId);
            setTimeout(
                this.handleNewUserStream.bind(this, userVideoStream, peerId),
                3000
            );
        }
    }
    addNewUserToListHelper(peerId) {
        console.log(peerId);
        let userAlreadyPresentCheck = this.userConnectedInfo.find(
            (ele) => ele.userId === peerId
        );
        if (!userAlreadyPresentCheck) {
            this.userConnectedInfo.push({ userId: peerId });
        }
    }

    handleNewUserStream(userVideoStream, peerId) {
        console.log(peerId);
        console.log(userVideoStream);
        let videoElement = this.template.querySelector(`.${peerId}`);
        videoElement.srcObject = userVideoStream;
        videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play();
        });
    }
    removeVideoStream(peerId) {
        let removeIndex = this.userConnectedInfo.findIndex(
            (ele) => ele.userId === peerId
        );
        if (removeIndex > -1) {
            this.userConnectedInfo.splice(removeIndex, 1);
        }
    }

    async handleRoomCreation(peerId) {
        console.log('self peer', peerId);
        this.userConnectedInfo.push({ userId: peerId });
        let res = await fetch('/roomIdGen');
        let resJson = await res.json();
        this.roomId = resJson.roomId;
        console.log(this.roomId);
        this.initializeSelfVideo();
        this.socket.emit('join-room', this.roomId, peerId);
    }
    async handleRoomJoining(peerId) {
        this.userConnectedInfo.push({ userId: peerId });
        this.initializeSelfVideo();
        this.socket.emit('join-room', this.roomId, peerId);
    }
}
