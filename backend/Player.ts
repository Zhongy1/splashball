import { Calculator } from "../shared/Calculator";
import { CONFIG } from "../shared/config";
import { AxialCoord, CartCoord, Color, DirectionVector, GameState, PlayerProperties, ProjectileProperties } from "../shared/models";
import { GameRoom } from "./GameRoom";
import { Map } from "./Map";


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
        if (this.team != projectile.team && this.gameRoom.currState == GameState.Ongoing) {
            if (this.cellCoord.q == projectile.cellCoord.q && this.cellCoord.r == projectile.cellCoord.r) {
                this.health -= 2;
            }
            else if (Calculator.calcCellDistance(this.cellCoord, projectile.cellCoord) == 1) {
                this.health--;
            }
            else return;
            if (this.health <= 0) {
                this.gameRoom.informTeamChange(this.id, (this.team == Color.red) ? Color.blue : Color.red);
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

    public setNewLocation(coord: AxialCoord): void {
        this.cellCoord.q = coord.q;
        this.cellCoord.r = coord.r;
        this.coord.x = Calculator.calcX(coord.q, CONFIG.EDGE_LENGTH);
        this.coord.y = Calculator.calcY(coord.q, coord.r, CONFIG.EDGE_LENGTH);
    }
}