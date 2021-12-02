import { AxialCoord, CartCoord } from "./models";


export class Calculator {
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

    static calcCellDistance(t1: AxialCoord, t2: AxialCoord): number {
        let x = t2.q - t1.q;
        let z = t2.r - t1.r;
        let y = -x - z;
        return Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
    }

    static pixelToFlatHex(point: CartCoord, size: number): AxialCoord {
        return Calculator.axialRound(Calculator.calcQ(point.x, size), Calculator.calcR(point.x, point.y, size));
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

    static rotateX(points: CartCoord | CartCoord[], degrees: number): void {
        if (!points) return;
        let rad = degrees * Math.PI / 180;
        if (Array.isArray(points)) {
            points.forEach(point => {
                let y = point.y;
                let z = point.z || 0;
                point.y = y * Math.cos(rad) + z * Math.sin(rad);
                if (point.z != null) {
                    point.z = -y * Math.sin(rad) + z * Math.cos(rad);
                }
            });
        }
        else {
            let y = points.y;
            let z = points.z || 0;
            points.y = y * Math.cos(rad) + z * Math.sin(rad);
            if (points.z != undefined) {
                points.z = -y * Math.sin(rad) + z * Math.cos(rad);
            }
        }
    }

    static calcZofPoint(point: CartCoord, degrees: number): number {
        return Math.sign(point.y) * Math.sqrt(Math.pow(point.y / Math.cos(degrees * Math.PI / 180), 2) - Math.pow(point.y, 2));
    }
}