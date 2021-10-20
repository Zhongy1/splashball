import { Server } from 'socket.io';
import * as http from 'http';
import * as _ from 'lodash';
import { FireCommand, GameRoom } from "./GameRoom";
import { GameState, HexCell, HexCellMod, MapData, MapProperties, ActionKey, PlayerProperties, ProjectileProperties, SetupData } from '../shared/models';
import { Calculator } from '../shared/Calculator';
import { CONFIG } from '../shared/config';
import { Player } from './Player';
import { Projectile } from './Projectile';

export class Broker {
    private io: Server;

    constructor(public httpServer: http.Server, public gameRoom: GameRoom) {
        this.io = new Server(httpServer, {
            path: '/'
        });
        this.initListeners();
    }

    private generateSetupData(): SetupData {
        let mapProps: MapProperties = {
            grid: this.gameRoom.map.grid
        }
        let ret: SetupData = {
            state: this.gameRoom.currState,
            map: mapProps,
            players: [],
            projectiles: []
        }
        Object.keys(this.gameRoom.players).forEach(id => {
            let player = this.gameRoom.players[id];
            ret.players.push({
                id: player.id,
                cellCoord: player.cellCoord,
                coord: player.coord,
                direction: player.direction,
                name: player.name,
                health: player.health,
                team: player.team,
                lastShot: player.lastShot,
                invulnerable: player.invulnerable,
                paralyzed: player.paralyzed
            });
        });
        Object.keys(this.gameRoom.projectiles).forEach(id => {
            let projectile = this.gameRoom.projectiles[id];
            ret.projectiles.push({
                id: id,
                coord: projectile.coord,
                remOffset: projectile.remOffset,
                team: projectile.team,
                cellCoord: projectile.cellCoord,
                progress: projectile.progress
            });
        });
        return ret;
    }

    private initListeners(): void {
        this.io.on('connection', (socket) => {
            let playerIds: string[] = [];

            console.log('Got a connection');
            socket.emit('setup-data', this.generateSetupData());
            // this.handleMapData([]);
            // this.handleEntityData({}, {});

            socket.on('disconnect', () => {
                console.log('Disconnect: ' + socket.id);
                playerIds.forEach((id) => {
                    this.gameRoom.deletePlayer(id);
                });
            });

            socket.on('w-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.w, false);
            });
            socket.on('w-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.w, true);
            });
            socket.on('a-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.a, false);
            });
            socket.on('a-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.a, true);
            });
            socket.on('s-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.s, false);
            });
            socket.on('s-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.s, true);
            });
            socket.on('d-up', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.d, false);
            });
            socket.on('d-dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.d, true);
            });
            socket.on(' -up', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.space, false);
            });
            socket.on(' -dn', (playerId: string) => {
                this.gameRoom.setKey(playerId, ActionKey.space, true);
            });

            socket.on('attack', (data: FireCommand) => {
                this.gameRoom.attack(data);
            });

            socket.on('c-player', (username: string) => {
                let player = this.gameRoom.spawnPlayer(username);
                if (player) {
                    playerIds.push(player.id);
                    socket.emit('c-player', player.id);
                }
                else {
                    socket.emit('c-player', null);
                }
            });
            socket.on('d-player', (playerId: string) => {
                this.gameRoom.deletePlayer(playerId);
            });

            socket.on('ping', (playerId: string) => {

            });

        });

    }

    public handleMapData(data: HexCell[]): void {
        let cells: HexCellMod[] = [];
        data.forEach((cell) => {
            cells.push({
                cellCoord: Calculator.pixelToFlatHex(cell.coord, CONFIG.EDGE_LENGTH),
                coord: cell.coord,
                color: cell.color
            });
        });
        let mapData: MapData = {
            cells: cells
        }
        this.io.emit('map-data', mapData);
    }

    public handleEntityData(players: { [id: string]: Player }, projectiles: { [id: string]: Projectile }): void {
        let plyrs: PlayerProperties[] = [];
        let projs: ProjectileProperties[] = [];
        Object.keys(players).forEach((id) => {
            let player = players[id];
            plyrs.push({
                id: player.id,
                cellCoord: player.cellCoord,
                coord: player.coord,
                direction: player.direction,
                name: player.name,
                health: player.health,
                team: player.team,
                lastShot: player.lastShot,
                invulnerable: player.invulnerable,
                paralyzed: player.paralyzed
            });
        });
        Object.keys(projectiles).forEach((id) => {
            let projectile = projectiles[id];
            projs.push({
                id: id,
                coord: projectile.coord,
                remOffset: projectile.remOffset,
                team: projectile.team,
                cellCoord: projectile.cellCoord,
                progress: projectile.progress
            });
        });
        this.io.emit('entity-data', {
            players: plyrs,
            projectiles: projs
        });
    }

    public handleGameState(state: GameState, options: any = {}): void {
        this.io.emit('game-state', state, options);
    }

    public handleMapClear(): void {
        this.io.emit('map-clear');
    }
}