// import io from 'socket.io-client';
import { io } from 'socket.io-client';
import { FireCommand } from '../backend/GameRoom';
import { EntityData, GameState, MapData, ActionKey, SetupData } from '../shared/models';
import { GameInstance } from './GameInstance';
// import { Socket } from 'socket.io-client';

export class Linker {
    // public socket: SocketIOClient.Socket;
    public socket;
    private cPlayerCB;

    constructor(private gameInstance: GameInstance) {
        this.socket = io();
        this.initListeners();
    }

    private initListeners() {
        this.socket.on('connect', () => {
            console.log('connected');
        });
        this.socket.on('error', (err) => {
            console.log(err);
        })
        this.socket.on('setup-data', (data: SetupData) => {
            this.gameInstance.handleSetupData(data);
        });

        this.socket.on('map-data', (data: MapData) => {
            this.gameInstance.handleMapData(data);
        });

        this.socket.on('map-clear', () => {
            this.gameInstance.handleMapClear();
        });

        this.socket.on('entity-data', (data: EntityData) => {
            this.gameInstance.handleEntityData(data);
        });

        this.socket.on('game-state', (state: GameState, options: any) => {
            this.gameInstance.handleGameState(state, options);
        });

        this.socket.on('c-player', (playerId: string) => {
            // check if playerId is null and if it is, tell user room is full
            if (this.cPlayerCB) {
                this.cPlayerCB(playerId);
                this.cPlayerCB = null;
            }
        });
        this.socket.on('d-player', (playerId: string) => {

        });

        this.socket.on('ping', (state: boolean) => {

        });
    }

    public spawnPlayer(username: string): Promise<string> {
        let self = this;
        return new Promise((resolve, reject) => {
            self.cPlayerCB = (playerId: string) => {
                resolve(playerId);
            };
            self.socket.emit('c-player', username);
        });
    }

    public deletePlayer(username: string): any {

    }

    public setKey(playerId: string, key: ActionKey, state: boolean): void {
        if (state) {
            this.socket.emit(`${key}-dn`, playerId);
        }
        else {
            this.socket.emit(`${key}-up`, playerId);
        }
    }

    public attack(cmd: FireCommand): void {
        this.socket.emit('attack', cmd);
    }

    public checkPlayerState(playerId: string): any {
    }
}