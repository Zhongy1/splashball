var canvas = document.querySelector('#grid');
var ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 800;
ctx.fillStyle = '#484848';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.beginPath();
ctx.arc(canvas.width / 2, canvas.height / 2, 3, 0, 2 * Math.PI);
ctx.stroke();
var hexSize = 60;
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
        var angleDegrees = 60 * i - 30;
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
for (var q = 0; q < 3; q++) {
    for (var r = 0; r < 3; r++) {
        var current = new AxialCoordinate(q, r);
        drawHexagon(current.asPixelCoordinate());
    }
}
