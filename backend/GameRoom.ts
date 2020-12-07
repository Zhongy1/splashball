import { v4 as uuidv4 } from 'uuid';
import { MapProperties, PlayerProperties, ProjectileProperties, CartCoord, AxialCoord, DirectionVector, Color, HexCell, Vector, HexCellMod, MoveKey } from '../shared/models';
import { CONFIG } from '../shared/config';
import { Broker } from './Broker';
import { Calculator } from '../shared/Calculator';

export interface FireCommand {
    id: string, // playerId
    target: AxialCoord // target cell
}
export class GameRoom {
    static updateRate: number = 1000 / CONFIG.GAME_INTERVAL;

    public map: Map;
    public players: { [id: string]: Player };
    public projectiles: { [id: string]: Projectile };

    private outgoingCellMods: HexCellMod[];
    private incomingAttackCmds: FireCommand[];

    private gameLoop;
    private broker: Broker;

    constructor() {
        this.map = new Map({ rings: CONFIG.RING_COUNT, hexEdgeLength: CONFIG.EDGE_LENGTH }, this);
        this.players = {};
        this.projectiles = {};

        this.outgoingCellMods = [];
        this.incomingAttackCmds = [];
    }

    public start(broker: Broker) {
        let self = this;
        this.broker = broker;
        function doGameIteration() {
            let projIds = Object.keys(self.projectiles);
            let playerIds = Object.keys(self.players);

            // spawn prjectiles
            let attackCmds = self.extractAttackCmds();
            attackCmds.forEach(cmd => {
                self.spawnProjectile(cmd);
            });

            // update projectiles, then handle if they landed
            projIds.forEach(id => {
                if (self.projectiles.hasOwnProperty(id)) {
                    let projectile = self.projectiles[id];
                    projectile.updateState();
                    if (projectile.progress == 1) {
                        // interact with players
                        for (let playerId of playerIds) { // looping through all players is inefficient
                            if (self.players.hasOwnProperty(playerId)) {
                                self.players[playerId].takeDmg(projectile);
                            }
                        }
                        // interact with map
                        let modified = self.map.setColor(projectile.cellCoord, projectile.team, 1);
                        for (let cell of modified) {
                            self.outgoingCellMods.push(cell);
                        }
                        self.deleteProjectile(id);
                    }
                }
            });

            // update players
            playerIds.forEach(id => {
                if (self.players.hasOwnProperty(id)) {
                    self.players[id].updateState();
                }
            });

            // if cells are modified, call broker function to send it
            let mods = self.extractCellMods();
            if (mods.length > 0) {
                self.broker.handleMapData(mods);
            }

            // call broker function to broadcast new entity states
            self.broker.handleEntityData(self.players, self.projectiles);
        }
        this.gameLoop = setInterval(doGameIteration, CONFIG.GAME_INTERVAL);
    }

    public spawnPlayer(username: string): Player {
        let player = new Player({
            id: uuidv4(),
            cellStartCoord: { q: 0, r: 0 },
            name: username,
            team: (username.length % 2 == 0) ? Color.red : Color.blue,
            speed: CONFIG.MOVE_SPEED
        }, this);
        this.players[player.id] = player;
        return player;
    }

    public deletePlayer(playerId: string): void {
        if (this.players.hasOwnProperty(playerId)) {
            delete this.players[playerId];
        }
    }

    public setKey(playerId: string, key: MoveKey, state: boolean): void {
        if (this.players.hasOwnProperty(playerId)) {
            switch (key) {
                case MoveKey.w:
                    this.players[playerId].setW(state);
                    break;
                case MoveKey.a:
                    this.players[playerId].setA(state);
                    break;
                case MoveKey.s:
                    this.players[playerId].setS(state);
                    break;
                case MoveKey.d:
                    this.players[playerId].setD(state);
                    break;
            }
        }
    }

    public attack(cmd: FireCommand): void {
        this.incomingAttackCmds.push(cmd);
    }

    private spawnProjectile(options: FireCommand): void {
        if (this.players.hasOwnProperty(options.id)) {
            let player = this.players[options.id];
            if (this.map.checkCellExists(options.target) && Calculator.calcCellDistance(options.target, player.cellCoord) <= CONFIG.ATTACK_RANGE) {
                let firing = player.fire();
                if (!firing) return;
                let projectile = new Projectile({
                    id: uuidv4(),
                    startCoord: {
                        x: player.coord.x,
                        y: player.coord.y
                    },
                    speed: CONFIG.PROJ_SPEED,
                    team: player.team,
                    targetCellCoord: options.target
                }, this);
                this.projectiles[projectile.id] = projectile;
            }
        }
    }

    private deleteProjectile(projId: string): void {
        if (this.projectiles.hasOwnProperty(projId)) {
            delete this.projectiles[projId];
        }
    }

    private extractAttackCmds(): FireCommand[] {
        let cmds = this.incomingAttackCmds;
        this.incomingAttackCmds = [];
        return cmds;
    }

    private extractCellMods(): HexCell[] {
        let mods = this.outgoingCellMods;
        this.outgoingCellMods = [];
        return mods;
    }

    public checkPlayerState(playerId: string): boolean {
        return this.players.hasOwnProperty(playerId);
    }
}

export interface MapOptions {
    rings: number,
    hexEdgeLength: number
}
export class Map implements MapProperties {
    public grid: { [index: string]: { [index: string]: HexCell } };

    private rings: number;
    private hexEdgeLength: number;

    constructor(private options: MapOptions, private gameRoom: GameRoom) {
        this.rings = Math.abs(options.rings);
        this.hexEdgeLength = (Math.abs(options.hexEdgeLength) >= 5) ? Math.abs(options.hexEdgeLength) : 5;
        this.generateGrid(this.rings, this.hexEdgeLength);
    }

    private generateGrid(rings: number, edgeLength: number) {
        this.grid = {};
        let hexGrid = this.grid;
        function generateCellColumn(qIndex: number) {
            let cellDiagSF = edgeLength * Math.sqrt(3) * Math.sin(Math.PI / 6);
            let cellVertSF = edgeLength * Math.sqrt(3);
            if (qIndex < 0) {
                var start = -rings - qIndex;
                var end = rings;
                var yStart = cellDiagSF * qIndex + cellVertSF * start;
            }
            else if (qIndex >= 0) {
                var start = -rings;
                var end = rings - qIndex;
                var yStart = cellDiagSF * qIndex + cellVertSF * start;
            }
            let j = 0;
            for (let i = start; i <= end; i++) {
                hexGrid[qIndex][i] = {
                    coord: {
                        x: edgeLength * 1.5 * qIndex,
                        y: yStart + cellVertSF * j
                    },
                    color: Color.nocolor
                }
                j++;
            }
        }
        for (let i = -rings; i <= rings; i++) {
            this.grid[i] = {};
            generateCellColumn(i);
        }
    }

    private setCellColor(q: number, r: number, color: Color): boolean {
        if (Math.abs(q) <= this.rings && this.grid[q].hasOwnProperty(r) && this.grid[q][r].color != color) {
            this.grid[q][r].color = color;
            return true;
        }
        return false;
    }
    public setColor(coord: AxialCoord, color: Color, range: number = 0): HexCellMod[] {
        let modified: HexCellMod[] = [];
        let qStart = coord.q - range;
        let qEnd = coord.q + range;
        let i = 0;
        for (let qIndex = qStart; qIndex <= qEnd; qIndex++) {
            let rStart;
            let rEnd;
            if (qIndex < coord.q) {
                rStart = coord.r - i;
                rEnd = coord.r + range;
            }
            else {
                rStart = coord.r - range;
                // rEnd = coord.r + range - (i - 2);
                rEnd = coord.r + range * 2 - i;
            }
            for (let rIndex = rStart; rIndex <= rEnd; rIndex++) {
                if (this.setCellColor(qIndex, rIndex, color)) {
                    let cell = this.grid[qIndex][rIndex];
                    modified.push({
                        cellCoord: {
                            q: qIndex,
                            r: rIndex
                        },
                        coord: cell.coord,
                        color: cell.color
                    });
                }
            }
            i++;
        }
        return modified;
    }

    public checkCellExists(cellCoord: AxialCoord): boolean {
        return Math.abs(cellCoord.q) <= this.rings && this.grid[cellCoord.q].hasOwnProperty(cellCoord.r);
    }

    public identifyCellCoord(coord: CartCoord): AxialCoord {
        return Calculator.pixelToFlatHex(coord, this.hexEdgeLength);
    }

    public getCellCartCoord(axCoord: AxialCoord): CartCoord {
        if (this.checkCellExists(axCoord)) {
            let cellCoord = this.grid[axCoord.q][axCoord.r].coord;
            let coord: CartCoord = {
                x: cellCoord.x,
                y: cellCoord.y
            }
            return coord;
        }
        return null;
    }
}

export interface PlayerOptions {
    id: string,
    cellStartCoord: AxialCoord,
    name: string,
    team: Color,
    speed: number
}
export class Player implements PlayerProperties {
    public id: string;

    // positioning
    public coord: CartCoord;
    public cellCoord: AxialCoord;
    public direction: DirectionVector;
    private speed: number;

    // visibile details
    public name: string;
    public health: number;
    public team: Color;

    // cooldowns
    public lastShot: number;

    private w: boolean;
    private a: boolean;
    private s: boolean;
    private d: boolean;
    private directionChanged: boolean;

    constructor(private options: PlayerOptions, private gameRoom: GameRoom) {
        this.id = options.id;
        this.cellCoord = options.cellStartCoord;
        this.coord = { x: Calculator.calcX(this.cellCoord.q, CONFIG.EDGE_LENGTH), y: Calculator.calcY(this.cellCoord.q, this.cellCoord.r, CONFIG.EDGE_LENGTH) };
        this.direction = { x: 0, y: 0 };
        this.speed = options.speed;
        this.name = options.name;
        this.health = 2;
        this.team = options.team;
        this.lastShot = 0;

        this.w = this.a = this.s = this.d = this.directionChanged = false;
    }

    public setW(state: boolean): void {
        if (state) {
            this.s = false;
            this.w = true;
        }
        else if (this.w) {
            this.w = false;
        }
        else return;
        if (!this.directionChanged) {
            this.directionChanged = true;
        }
    }
    public setA(state: boolean): void {
        if (state) {
            this.d = false;
            this.a = true;
        }
        else if (this.a) {
            this.a = false;
        }
        else return;
        if (!this.directionChanged) {
            this.directionChanged = true;
        }
    }
    public setS(state: boolean): void {
        if (state) {
            this.w = false;
            this.s = true;
        }
        else if (this.s) {
            this.s = false;
        }
        else return;
        if (!this.directionChanged) {
            this.directionChanged = true;
        }
    }
    public setD(state: boolean): void {
        if (state) {
            this.a = false;
            this.d = true;
        }
        else if (this.d) {
            this.d = false;
        }
        else return;
        if (!this.directionChanged) {
            this.directionChanged = true;
        }
    }
    public fire(): boolean {
        let time = Date.now();
        if (time >= this.lastShot + CONFIG.ABILITY_COOLDOWN) {
            this.lastShot = time;
            return true;
        }
        else {
            return false;
        }
    }
    public takeDmg(projectile: ProjectileProperties): void {
        if (this.team != projectile.team) {
            if (this.cellCoord.q == projectile.cellCoord.q && this.cellCoord.r == projectile.cellCoord.r) {
                this.health -= 2;
            }
            else if (Calculator.calcCellDistance(this.cellCoord, projectile.cellCoord) == 1) {
                this.health--;
            }
            else return;
            if (this.health <= 0) {
                this.team = (this.team == Color.red) ? Color.blue : Color.red;
                this.health = 2;
            }
        }
    }
    public updateState(): void {
        // if wasd changed
        if (this.directionChanged) {
            this.setDirection();
        }

        // if moving
        if (this.direction.x != 0 || this.direction.y != 0) {
            let mapRef: Map = this.gameRoom.map;
            let nextPos: CartCoord = this.predictNextPosition();
            let nextAxialPos: AxialCoord = mapRef.identifyCellCoord(nextPos);
            // ensure not going off map
            if (mapRef.checkCellExists(nextAxialPos)) {
                this.coord = nextPos;
                if (this.cellCoord.q != nextAxialPos.q || this.cellCoord.r != nextAxialPos.r) {
                    this.cellCoord = nextAxialPos;
                }
            }
        }
    }

    private setDirection(): void {
        if (this.w) {
            this.direction.y = -1;
        }
        else if (this.s) {
            this.direction.y = 1;
        }
        else {
            this.direction.y = 0;
        }
        if (this.a) {
            if (this.direction.y != 0) {
                this.direction.y *= Math.SQRT1_2;
                this.direction.x = -Math.SQRT1_2;
            }
            else {
                this.direction.x = -1;
            }
        }
        else if (this.d) {
            if (this.direction.y != 0) {
                this.direction.y *= Math.SQRT1_2;
                this.direction.x = Math.SQRT1_2;
            }
            else {
                this.direction.x = 1;
            }
        }
        else {
            this.direction.x = 0;
        }
        this.directionChanged = false;
    }

    private predictNextPosition(): CartCoord {
        let pos: CartCoord = {
            x: this.coord.x,
            y: this.coord.y
        }
        if (this.direction.x != 0) {
            pos.x += this.direction.x * this.speed / GameRoom.updateRate;
        }
        if (this.direction.y != 0) {
            pos.y += this.direction.y * this.speed / GameRoom.updateRate;
        }
        return pos;
    }
}

export interface ProjectileOptions {
    id: string,
    startCoord: CartCoord,
    speed: number,
    team: Color,
    targetCellCoord: AxialCoord
}
export class Projectile implements ProjectileProperties {
    public id: string;

    // positioning
    public coord: CartCoord;
    public remOffset: Vector;
    private distRemaining: number;
    private speed: number;
    private travDistance: number;

    // visibile details
    public team: Color;

    // target
    public cellCoord: AxialCoord;
    public progress: number;

    constructor(private options: ProjectileOptions, private gameRoom: GameRoom) {
        this.id = options.id;
        this.coord = options.startCoord;
        this.speed = options.speed;
        this.team = options.team;
        this.cellCoord = options.targetCellCoord;
        this.progress = 0;
        this.calcInitOffset();
    }

    private calcInitOffset(): void {
        let cellCartCoord: CartCoord = this.gameRoom.map.getCellCartCoord(this.cellCoord);
        this.remOffset = {
            x: cellCartCoord.x - this.coord.x,
            y: cellCartCoord.y - this.coord.y
        };
        this.travDistance = Math.sqrt(Math.pow(this.remOffset.x, 2) + Math.pow(this.remOffset.y, 2));
        this.distRemaining = this.travDistance;
    }

    public updateState(): void {
        if (this.distRemaining != 0) {
            let d = this.speed / GameRoom.updateRate;
            if (this.distRemaining > d) {
                let dx = this.remOffset.x * d / this.distRemaining; // unit vector this.remOffset/this.distRemaining
                let dy = this.remOffset.y * d / this.distRemaining;

                this.coord.x += dx;
                this.coord.y += dy;
                this.remOffset.x -= dx;
                this.remOffset.y -= dy;

                this.distRemaining = Math.sqrt(Math.pow(this.remOffset.x, 2) + Math.pow(this.remOffset.y, 2));
                this.progress = (this.travDistance - this.distRemaining) / this.travDistance;
            }
            else {
                this.coord = this.gameRoom.map.getCellCartCoord(this.cellCoord);
                this.remOffset = { x: 0, y: 0 };
                this.distRemaining = 0;
                this.progress = 1;
            }
        }
    }
}