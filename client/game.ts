// https://www.redblobgames.com/grids/hexagons/

const canvas: HTMLCanvasElement = document.querySelector('#grid');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 800;

// Fill canvas background
ctx.fillStyle = '#484848';
ctx.fillRect(0, 0, canvas.width, canvas.height);

// Mark the origin (center of canvas)
ctx.beginPath();
ctx.arc(canvas.width/2, canvas.height/2, 3, 0, 2 * Math.PI);
ctx.stroke();

// 'Pointy' hexagon orientation
const hexSize = 60;
const hexWidth = Math.sqrt(3) * hexSize;
const hexHeight = 2 * hexSize;

// Ordered pair based on pixel coordinates x & y
class PixelCoordinate {
    public x: number;
    public y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

// Ordered pair based on axial coordinates q & r
class AxialCoordinate {
    static origin = new PixelCoordinate(canvas.width / 2, canvas.height / 2);
    public q: number;
    public r: number;

    constructor(q: number, r: number) {
        this.q = q;
        this.r = r;
    }

    asPixelCoordinate() {
        return new PixelCoordinate(
            AxialCoordinate.origin.x + (this.q * hexWidth) + this.r * (hexWidth / 2),
            AxialCoordinate.origin.y + this.r * (hexHeight * 0.75)
        );
    }
}

// Draws a hexagon at the given center using the global hexagon size
function drawHexagon(center: PixelCoordinate) {

    function getHexagonCorner(center: PixelCoordinate, size: number, i: number) {
        const angleDegrees = 60 * i - 30;
        const angleRadians = Math.PI / 180 * angleDegrees;

        const x = center.x + size * Math.cos(angleRadians);
        const y = center.y + size * Math.sin(angleRadians);

        return new PixelCoordinate(x, y);
    }

    // Start path
    ctx.beginPath();

    // Begin at point 0
    const start = getHexagonCorner(center, hexSize, 0);
    ctx.moveTo(start.x, start.y);

    // Get next point and draw line to it
    for (let i = 1; i < 6; i++) {
        const point = getHexagonCorner(center, hexSize, i);
        ctx.lineTo(point.x, point.y);
    }

    // Draw line back to point 0
    ctx.lineTo(start.x, start.y);

    // Turn path into stroke
    ctx.stroke();
}


// Draw series of hexagons using axial coordinates
for (let q = 0; q < 3; q++) {
    for (let r = 0; r < 3; r++) {
        const current = new AxialCoordinate(q, r);
        drawHexagon(current.asPixelCoordinate());
    }
}


// Draw hexagons
// drawHexagon(new PixelCoordinate(canvas.width / 2, canvas.height / 2));
// drawHexagon(new PixelCoordinate(canvas.width / 2 + hexWidth, canvas.height / 2));
