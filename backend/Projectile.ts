import { AxialCoord, CartCoord, Color, ProjectileProperties, Vector } from "../shared/models";
import { GameRoom } from "./GameRoom";


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
        else {
            this.progress = 1;
        }
    }
}