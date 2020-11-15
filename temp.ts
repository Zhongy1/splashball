
export interface HexCell {
    coord?: CartCoord,
    color: Colors
}

export enum Colors {
    nocolor, red, blue
}

export interface AxialCoord {
    q: number,
    r: number
}

export interface CartCoord { //coordinate system of html canvas
    x: number,
    y: number
}

export interface DirectionVector {
    x: number,
    y: number
}

export class Map {
    public xDist: number;
    public yDist: number;

    public hexGrid: { [index: string]: { [index: string]: HexCell } }; //q, r

    constructor(rings: number, edgeLength: number) {
        if (rings < 0) rings = 0;
        if (edgeLength < 10) edgeLength = 10;
        this.xDist = edgeLength * 1.5;
        this.yDist = edgeLength * Math.sqrt(3) / 2;

        this.generateGrid(rings, edgeLength);
        // console.log(JSON.stringify(this.hexGrid));

        // console.log(Map.pixelToFlatHex({ x: -110, y: -4.25 }, 20));
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
                    color: Colors.nocolor
                }
                j++;
            }
        }
        for (let i = -rings; i <= rings; i++) {
            this.hexGrid[i] = {};
            generateCellColumn(i);
        }
    }

    static calcQ(x: number, size: number): number {
        return x * 2 / 3 / size;
    }
    static calcR(x: number, y: number, size: number): number {
        return (x * -1 / 3 + y * Math.sqrt(3) / 3) / size;
    }
    static calcX(q: number, size: number): number {
        return size * q * 3 / 2;
    }
    static calcY(q: number, r: number, size: number): number {
        return size * (q * Math.sqrt(3) / 2 + r * Math.sqrt(3));
    }
    static pixelToFlatHex(point: CartCoord, size: number): AxialCoord {
        return Map.axialRound(Map.calcQ(point.x, size), Map.calcR(point.x, point.y, size));
    }
    static axialRound(q: number, r: number): AxialCoord {
        let yOrig = -q - r;
        let rx = Math.round(q);
        let ry = Math.round(yOrig);
        let rz = Math.round(r);

        let xDiff = Math.abs(rx - q);
        let yDiff = Math.abs(ry - yOrig);
        let zDiff = Math.abs(rz - r);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        }
        else if (yDiff > zDiff) {
            ry = -rx - rz;
        }
        else {
            rz = -rx - ry;
        }

        return { q: rx, r: rz };
    }
}

export class Player {
    // positioning
    public coord: CartCoord;
    public cellCoord: AxialCoord;
    public velocity: DirectionVector; //vector
    public speed: number; //scalar

    // 
    public name: string;
    public health: number
    public team: Colors;

    // cooldowns
    public lastShot: number;

    constructor(public mapRef: Map, public cellEdgeLength: number) {

    }



    // private roundX(x): number {
    //     let dist = this.mapRef.xDist;
    //     let colIndex = Math.floor(x / dist);
    //     let colX = colIndex * dist;
    //     let offset = x - colX;
    //     return (offset >= dist/2) ? colX + dist : colX;
    // }
    // private roundY(y): number {
    //     let dist = this.mapRef.yDist;
    //     let rowIndex = Math.floor(y / dist);
    //     let rowY = rowIndex * dist;
    //     let offset = y - rowY;
    //     return (offset >= dist/2) ? rowY + dist : rowY;
    // }

    // public locateClosestCell() {
    //     let colIndex = Math.round(this.roundX(this.coord.x) / this.mapRef.xDist);
    //     let rowIndex = Math.round(this.roundY(this.coord.y) / this.mapRef.yDist);
    //     let closeCells: HexCell[] = [

    //     ]; // should be 3 cells in the array
    // }
    // this.cellCoord = Map.pixelToFlatHex(this.coord, this.cellEdgeLength);
}

export class Temp {
    public map: Map;

    constructor() {
        this.map = new Map(5, 20);
    }

    private foo(): void {

    }
}