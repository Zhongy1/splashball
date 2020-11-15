import * as socketio from 'socket.io';
import * as http from 'http';
import { GameRoom } from "./GameRoom";

export class Broker {
    private io: socketio.Server;

    constructor(public httpServer: http.Server, public gameRoom: GameRoom) {
        this.io = socketio(httpServer, {
            pingTimeout: 10000
        });
        this.initListeners();
    }

    private initListeners(): void {
        this.io.on('connection', (socket) => {
            console.log('Got a connection');
            // socket.emit('init-connection', temp.map);
        });
    }
}