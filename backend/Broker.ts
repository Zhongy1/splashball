import * as socketio from 'socket.io';
import * as http from 'http';
import { GameRoom } from "./GameRoom";
import { SetupData } from '../shared/models';

export class Broker {
    private io: socketio.Server;

    constructor(public httpServer: http.Server, public gameRoom: GameRoom) {
        this.io = socketio(httpServer, {
            pingTimeout: 10000
        });
        this.initListeners();
    }

    private generateSetupData(): SetupData {
        let ret: SetupData = {
            map: this.gameRoom.map,
            players: [],
            projectiles: []
        }
        Object.keys(this.gameRoom.players).forEach(id => {
            ret.players.push(this.gameRoom.players[id]);
        });
        Object.keys(this.gameRoom.projectiles).forEach(id => {
            ret.projectiles.push(this.gameRoom.projectiles[id]);
        });
        return ret;
    }

    private initListeners(): void {
        this.io.on('connection', (socket) => {
            console.log('Got a connection');
            socket.emit('setup-data', this.generateSetupData());
        });
        this.io.on('w-up', (playerId) => {

        });
        this.io.on('w-dn', (playerId) => {

        });
    }
}