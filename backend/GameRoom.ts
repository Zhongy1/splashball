import { MapProperties, PlayerProperties, ProjectileProperties, CartCoord, AxialCoord, DirectionVector, Color, HexCell } from '../shared/models';
import { CONFIG } from '../shared/config';
import { Broker } from './Broker';

export class GameRoom {
    public map: Map;
    public players: { [id: string]: Player };
    public projectiles: { [id: string]: Projectile };

    private gameLoop;
    private broker;

    constructor() {
        this.map = new Map();
        this.players = {};
        this.projectiles = {};
    }

    public start(broker: Broker) {
        this.broker = broker;
        this.gameLoop = setInterval(() => {

        }, CONFIG.GAME_INTERVAL);
    }
}

export class Map implements MapProperties {
    public grid: { [index: string]: { [index: string]: HexCell } };

    constructor() {
        this.generateGrid(CONFIG.RING_COUNT, CONFIG.EDGE_LENGTH);
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
}

export class Player implements PlayerProperties {
    public id: string;

    // positioning
    public coord: CartCoord;
    public cellCoord: AxialCoord;
    public direction: DirectionVector;

    // visibile details
    public name: string;
    public health: number;
    public team: Color;

    // cooldowns
    public lastShot: number;

    constructor() {

    }
}

export class Projectile implements ProjectileProperties {
    public id: string;

    // positioning
    public coord: CartCoord;

    // visibile details
    public team: Color;

    // target
    public cellCoord: AxialCoord;

    constructor() {

    }
}