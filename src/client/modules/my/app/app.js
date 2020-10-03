import { LightningElement, track } from 'lwc';

export default class App extends LightningElement {
    @track socket;
    socketReady = false;
    domainName = window.location.hostname;

    connectedCallback() {
        this.openSocket();
    }

    disconnectedCallback() {
        this.closeSocket();
    }
    async openSocket() {
        let connectionUrl = 'https://video-conferencing-node.herokuapp.com';
        console.log(connectionUrl);
        const io = await require('socket.io-client');
        this.socket = io(connectionUrl);
        this.socket.on('connect', () => {
            console.log('Connection Started');
            this.socketReady = true;
        });
    }
    handleWebSocketConn(event) {
        console.log(event);
    }

    async closeSocket() {
        this.socket.close();
        this.socket = null;
    }
}
