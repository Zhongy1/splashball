import * as socketio from 'socket.io';
import * as http from 'http';
import { FireCommand, GameRoom, Player, Projectile } from "./GameRoom";
import { HexCell, HexCellMod, MapData, MapProperties, MoveKey, PlayerProperties, ProjectileProperties, SetupData } from '../shared/models';
import { Calculator } from '../shared/Calculator';
import { CONFIG } from '../shared/config';

export class Broker {
    private io: socketio.Server;

    constructor(public httpServer: http.Server, public gameRoom: GameRoom) {
        this.io = socketio(httpServer, {
            pingTimeout: 10000
        });
        this.initListeners();
    }

    private generateSetupData(): SetupData {
        let mapProps: MapProperties = {
            grid: this.gameRoom.map.grid
        }
        let ret: SetupData = {
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
                lastShot: player.lastShot
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
                playerIds.push(player.id);
                socket.emit('c-player', player.id);
            });
            socket.on('d-player', (playerId: string) => {
                this.gameRoom.deletePlayer(playerId);
            });

            socket.on('ping', (playerId: string) => {

            });

        });

    }

    public handleMapData(data: HexCell[]) {
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

    public handleEntityData(players: { [id: string]: Player }, projectiles: { [id: string]: Projectile }) {
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
                lastShot: player.lastShot
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
}