
function rotateX(points, degrees) {
    if (!points) return;
    let rad = degrees * Math.PI / 180;
    points.forEach(point => {
        // let radius = calcRadius(point.z, point.y);
        // let angle = calcAngle(point.z, point.y) + rad;
        // point.y = radius * Math.sin(angle);
        // point.z = radius * Math.cos(angle);
        let y = point.y;
        let z = point.z;
        point.y = y * Math.cos(rad) + z * Math.sin(rad);
        point.z = -y * Math.sin(rad) + z * Math.cos(rad);
    });
}

function rotateXWithoutZ(points, degrees) {
    if (!points) return;
    let rad = degrees * Math.PI / 180;
    points.forEach(point => {
        let y = point.y;
        point.y = y * Math.cos(rad);
    });
}

function convertDataTo2DArray(hexGrid) {
    let cellCoords = [];
    Object.keys(hexGrid).forEach((qIndex) => {
        Object.keys(hexGrid[qIndex]).forEach((rIndex) => {
            cellCoords.push(hexGrid[qIndex][rIndex].coord);
        });
    });
    return JSON.parse(JSON.stringify(cellCoords));
}
var canvas = document.querySelector('#grid');
var ctx = canvas.getContext('2d');

let shapeL = 20;
let hexPoints = [{ x: -shapeL, y: 0, z: 0 }, { x: -shapeL / 2, y: shapeL * Math.sqrt(3) / 2, z: 0 }, { x: shapeL / 2, y: shapeL * Math.sqrt(3) / 2, z: 0 }, { x: shapeL, y: 0, z: 0 }, { x: shapeL / 2, y: -shapeL * Math.sqrt(3) / 2, z: 0 }, { x: -shapeL / 2, y: -shapeL * Math.sqrt(3) / 2, z: 0 }];

const socket = io();

socket.on('connect', () => {
    console.log('connected');
});
socket.on('init-connection', (data) => {
    let cellCoords = convertDataTo2DArray(data.hexGrid);
    rotateXWithoutZ(cellCoords, -60);
    rotateXWithoutZ(hexPoints, -60);
    // Object.keys(data.hexGrid).forEach(qIndex => {
    //     Object.keys(data.hexGrid[qIndex]).forEach(rIndex => {
    //         let coord = data.hexGrid[qIndex][rIndex].coord;
    //         drawHexagon({ x: coord.x + 400, y: coord.y + 400 });
    //     });
    // });
    ctx.strokeStyle = 'blue';
    cellCoords.forEach(coord => {
        drawShape2d({ x: coord.x + 400, y: coord.y + 400 }, hexPoints);
    });
});


function drawShape2d(offset, points) {
    if (!points || points.length < 2) return;
    ctx.moveTo(offset.x + points[0].x, offset.y + points[0].y);
    ctx.beginPath();
    points.forEach(point => {
        ctx.lineTo(offset.x + point.x, offset.y + point.y);
    });
    ctx.lineTo(offset.x + points[0].x, offset.y + points[0].y);
    ctx.stroke();
}

canvas.width = 800;
canvas.height = 800;
ctx.fillStyle = '#484848';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.beginPath();
ctx.arc(canvas.width / 2, canvas.height / 2, 3, 0, 2 * Math.PI);
ctx.stroke();
var hexSize = 20;
var hexWidth = Math.sqrt(3) * hexSize;
var hexHeight = 2 * hexSize;
var PixelCoordinate = (function () {
    function PixelCoordinate(x, y) {
        this.x = x;
        this.y = y;
    }
    return PixelCoordinate;
}());
var AxialCoordinate = (function () {
    function AxialCoordinate(q, r) {
        this.q = q;
        this.r = r;
    }
    AxialCoordinate.prototype.asPixelCoordinate = function () {
        return new PixelCoordinate(AxialCoordinate.origin.x + (this.q * hexWidth) + this.r * (hexWidth / 2), AxialCoordinate.origin.y + this.r * (hexHeight * 0.75));
    };
    AxialCoordinate.origin = new PixelCoordinate(canvas.width / 2, canvas.height / 2);
    return AxialCoordinate;
}());
function drawHexagon(center) {
    function getHexagonCorner(center, size, i) {
        var angleDegrees = 60 * i - 30 + 30;
        var angleRadians = Math.PI / 180 * angleDegrees;
        var x = center.x + size * Math.cos(angleRadians);
        var y = center.y + size * Math.sin(angleRadians);
        return new PixelCoordinate(x, y);
    }
    ctx.beginPath();
    var start = getHexagonCorner(center, hexSize, 0);
    ctx.moveTo(start.x, start.y);
    for (var i = 1; i < 6; i++) {
        var point = getHexagonCorner(center, hexSize, i);
        ctx.lineTo(point.x, point.y);
    }
    ctx.lineTo(start.x, start.y);
    ctx.stroke();
}
// for (var q = 0; q < 3; q++) {
//     for (var r = 0; r < 3; r++) {
//         var current = new AxialCoordinate(q, r);
//         drawHexagon(current.asPixelCoordinate());
//     }
// }
