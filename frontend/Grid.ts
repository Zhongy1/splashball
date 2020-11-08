import PixelCoordinate from './PixelCoordinate';

export default class HexGrid {
    public cellCoords: PixelCoordinate[];
    public hexPoints: PixelCoordinate[];

    constructor(data, shapeL: number, rotation: number) {
        // Flatten data from server and rotate coordinates
        this.cellCoords = this.flatten(data)
                              .map(coord => this.rotateXWithoutZ(coord, rotation));

        // Calculate and rotate hex points
        this.hexPoints = [
            { x: -shapeL, y: 0 },
            { x: -shapeL / 2, y: shapeL * Math.sqrt(3) / 2 },
            { x: shapeL / 2, y: shapeL * Math.sqrt(3) / 2 },
            { x: shapeL, y: 0 },
            { x: shapeL / 2, y: -shapeL * Math.sqrt(3) / 2 },
            { x: -shapeL / 2, y: -shapeL * Math.sqrt(3) / 2 }
        ].map(point => this.rotateXWithoutZ(point, rotation));
    }

    private flatten(data): PixelCoordinate[] {
        let cellCoords = [];

        Object.keys(data).forEach(q => {
            Object.keys(data[q]).forEach(r => {
                cellCoords.push({ ...data[q][r].coord });
            });
        });

        return cellCoords;
    }

    private rotateXWithoutZ(point: PixelCoordinate, degrees: number): PixelCoordinate {
        const rad = degrees * Math.PI / 180;
        return {
            x: point.x,
            y: point.y * Math.cos(rad)
        };
    }

    public draw(ctx: CanvasRenderingContext2D): void {
        // DEBUG: shade in canvas background
        ctx.fillStyle = '#484848';
        ctx.fillRect(0, 0, 800, 800);

        // DEBUG: mark the origin (center of canvas)
        ctx.beginPath();
        ctx.arc(800/2, 800/2, 3, 0, 2 * Math.PI);
        ctx.stroke();

        // Draw each hexagon
        this.cellCoords.forEach(coord => {
            const offset = { x: coord.x + 400, y: coord.y + 400 };

            ctx.beginPath();
            ctx.moveTo(offset.x + this.hexPoints[0].x, offset.y + this.hexPoints[0].y);

            this.hexPoints.forEach(point => {
                ctx.lineTo(offset.x + point.x, offset.y + point.y);
            });

            ctx.lineTo(offset.x + this.hexPoints[0].x, offset.y + this.hexPoints[0].y);
            ctx.stroke();
        });
    }
}
