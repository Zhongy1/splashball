import { Calculator } from "../shared/Calculator";
import { CONFIG } from "../shared/config";
import { AxialCoord, CartCoord, Color, HexCell, HexCellMod, MapProperties } from "../shared/models";
import { GameRoom } from "./GameRoom";


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

    public clearMap(): HexCellMod[] {
        return this.setColor({ q: 0, r: 0 }, Color.nocolor, CONFIG.RING_COUNT);
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