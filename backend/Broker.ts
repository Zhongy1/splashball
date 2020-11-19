import * as socketio from 'socket.io';
import * as http from 'http';
import { FireCommand, GameRoom } from "./GameRoom";
import { MoveKey, SetupData } from '../shared/models';

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

            socket.on('disconnect', () => {
                //TODO
            });

            socket.on('w-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.w, false);
            });
            socket.on('w-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.w, true);
            });
            socket.on('a-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.a, false);
            });
            socket.on('a-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.a, true);
            });
            socket.on('s-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.s, false);
            });
            socket.on('s-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.s, true);
            });
            socket.on('d-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.d, false);
            });
            socket.on('d-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, MoveKey.d, true);
            });
    
            socket.on('attack', (data: FireCommand) => {
                this.gameRoom.attack(data);
            });
    
            socket.on('c-player', (username: string) => {
                let player = this.gameRoom.spawnPlayer(username);
                socket.emit('c-player',player.id);
            });
            socket.on('d-player', (playerId: string) => {
                this.gameRoom.deletePlayer(playerId);
            });
    
            socket.on('ping', (playerId: string) => {
    
            });

        });

    }
}