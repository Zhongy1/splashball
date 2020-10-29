
export interface HexCell {
    coord?: HexCartCoord,
    color: CellColor
}

export enum CellColor {
    nocolor, red, blue
}

export interface HexAxialCoord {
    q: number,
    r: number
}

export interface HexCartCoord { //coordinate system of html canvas
    x: number,
    y: number
}

export class Map {
    public hexGrid: { [index: string]: { [index: string]: HexCell } }; //q, r

    constructor(rings: number, edgeLength: number) {
        if (rings < 0) rings = 0;
        if (edgeLength < 10) edgeLength = 10;
        this.generateGrid(rings, edgeLength);
    }

    private generateGrid(rings: number, edgeLength: number) {
        this.hexGrid = {};
        let hexGrid = this.hexGrid;
        function generateCellColumn(qIndex: number) {
            let cellDiagSF = edgeLength * Math.sqrt(3) * Math.sin(Math.PI / 6);
            let cellVertSF = edgeLength * Math.sqrt(3);
            if (qIndex < 0) {
                var start = -rings - qIndex;
                var end = rings;
            }
            else if (qIndex >= 0) {
                var start = -rings;
                var end = rings - qIndex;
            }
            let yStart = cellDiagSF * qIndex - cellVertSF * start;
            let j = 0;
            for (let i = start; i <= end; i++) {
                hexGrid[qIndex][i] = {
                    coord: {
                        x: edgeLength * 1.5 * i,
                        y: yStart + j * cellVertSF
                    },
                    color: CellColor.nocolor
                }
            }
        }
        for (let i = -rings; i <= rings; i++) {
            this.hexGrid[i] = {};
            generateCellColumn(i);
        }
    }
}

export class Temp {
    public map: Map;

    constructor() {
        this.map = new Map(3, 50);
    }

    private foo(): void {

    }
}