import { Calculator } from "../shared/Calculator";
import { CONFIG } from "../shared/config";
import {
    CartCoord,
    Color,
    HexCell,
    HexCellMod,
    PlayerProperties,
    ProjectileProperties,
    Sprites,
    TeamColors
} from "../shared/models";
import { GameInstance } from "./GameInstance";

export class GameRenderer {

    private mainCtx: CanvasRenderingContext2D;

    private mapCanvas: HTMLCanvasElement;
    private mapCtx: CanvasRenderingContext2D;
    private mapWidth: number;

    private hexCornerPoints;

    private sprites: Sprites;

    constructor(private gameCanvas: HTMLCanvasElement, private gameInstance: GameInstance) {
        this.mainCtx = gameCanvas.getContext('2d');

        this.mapCanvas = document.createElement('canvas');
        this.mapCtx = this.mapCanvas.getContext('2d');
        this.mapWidth = (CONFIG.RING_COUNT * 2 + 1) * CONFIG.EDGE_LENGTH * Math.sqrt(3) + 10;
        this.mapCanvas.width = this.mapWidth;
        this.mapCanvas.height = this.mapWidth;
        // document.body.appendChild(this.mapCanvas);

        this.hexCornerPoints = [{ x: -CONFIG.EDGE_LENGTH, y: 0, z: 0 }, { x: -CONFIG.EDGE_LENGTH / 2, y: CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: CONFIG.EDGE_LENGTH / 2, y: CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: CONFIG.EDGE_LENGTH, y: 0, z: 0 }, { x: CONFIG.EDGE_LENGTH / 2, y: -CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: -CONFIG.EDGE_LENGTH / 2, y: -CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }];
        Calculator.rotateX(this.hexCornerPoints, CONFIG.MAP_VIEW_ANGLE);

        this.setCanvasSize();
        window.onresize = this.setCanvasSize.bind(this);

        this.prerenderSprites();
    }

    private setCanvasSize() {
        this.gameCanvas.width = window.innerWidth;
        this.gameCanvas.height = window.innerHeight;
    }

    private prerenderSprites() {
        this.sprites = {
            'a-t': new Image(),
            'a-tr': new Image(),
            'a-r': new Image(),
            'a-br': new Image(),
            'a-b': new Image(),
            'a-bl': new Image(),
            'a-l': new Image(),
            'a-tl': new Image(),
            't-red': new Image(),
            't-blue': new Image()
        }
        this.sprites['a-t'].src = '/images/arrow-t.png';
        this.sprites['a-tr'].src = '/images/arrow-tr.png';
        this.sprites['a-r'].src = '/images/arrow-r.png';
        this.sprites['a-br'].src = '/images/arrow-br.png';
        this.sprites['a-b'].src = '/images/arrow-b.png';
        this.sprites['a-bl'].src = '/images/arrow-bl.png';
        this.sprites['a-l'].src = '/images/arrow-l.png';
        this.sprites['a-tl'].src = '/images/arrow-tl.png';
        this.sprites['t-red'].src = '/images/r_square.png';
        this.sprites['t-blue'].src = '/images/b_square.png';
    }

    public drawCell(cell: HexCell | HexCellMod, clear?: boolean) {
        let coordTransformed: CartCoord = {
            x: cell.coord.x,
            y: cell.coord.y
        }
        Calculator.rotateX(coordTransformed, CONFIG.MAP_VIEW_ANGLE);
        this.mapCtx.moveTo(coordTransformed.x + this.hexCornerPoints[0].x + this.mapWidth / 2, coordTransformed.y + this.hexCornerPoints[0].y + this.mapWidth / 2);
        this.mapCtx.beginPath();
        this.hexCornerPoints.forEach(point => {
            this.mapCtx.lineTo(coordTransformed.x + point.x + this.mapWidth / 2, coordTransformed.y + point.y + this.mapWidth / 2);
        });
        this.mapCtx.lineTo(coordTransformed.x + this.hexCornerPoints[0].x + this.mapWidth / 2, coordTransformed.y + this.hexCornerPoints[0].y + this.mapWidth / 2);
        if (clear) {
            this.mapCtx.fillStyle = 'black';
            this.mapCtx.fill();
        }
        else if (cell.color != Color.nocolor) {
            switch (cell.color) {
                case Color.red: {
                    this.mapCtx.fillStyle = 'pink';
                    this.mapCtx.fill();
                    break;
                }
                case Color.blue: {
                    this.mapCtx.fillStyle = 'lightblue';
                    this.mapCtx.fill();
                    break;
                }
            }
        }
        this.mapCtx.stroke();
    }

    public generateMap(grid: { [index: string]: { [index: string]: HexCell } }, clearMap?: boolean) {
        this.mapCtx.strokeStyle = 'white';
        Object.keys(grid).forEach(q => {
            Object.keys(grid[q]).forEach(r => {
                if (clearMap) {
                    this.drawCell(grid[q][r], clearMap);
                }
                else {
                    this.drawCell(grid[q][r]);
                }
            });
        });
    }

    public renderMap(player?: PlayerProperties) {
        // player = this.gameInstance.players[0];
        let offset;
        if (player) {
            let coordTransformed: CartCoord = {
                x: player.coord.x,
                y: player.coord.y
            }
            Calculator.rotateX(coordTransformed, CONFIG.MAP_VIEW_ANGLE);
            offset = {
                x: (window.innerWidth - this.mapWidth) / 2 - coordTransformed.x,
                y: (window.innerHeight - this.mapWidth) / 2 - coordTransformed.y
            }
        }
        else {
            offset = {
                x: (window.innerWidth - this.mapWidth) / 2,
                y: (window.innerHeight - this.mapWidth) / 2
            }
        }
        this.mainCtx.drawImage(this.mapCanvas, offset.x, offset.y);
    }

    public drawPlayer(player: PlayerProperties, myPlayer?: PlayerProperties) {
        if (myPlayer) {
            var coordTransformed: CartCoord = {
                x: player.coord.x - myPlayer.coord.x,
                y: player.coord.y - myPlayer.coord.y
            }
        }
        else {
            var coordTransformed: CartCoord = {
                x: player.coord.x,
                y: player.coord.y
            }
        }
        Calculator.rotateX(coordTransformed, CONFIG.MAP_VIEW_ANGLE);
        // this.mainCtx.fillStyle = 'red';
        switch (player.team) {
            case Color.red: {
                this.mainCtx.fillStyle = 'red';
                break;
            }
            case Color.blue: {
                this.mainCtx.fillStyle = 'blue';
                break;
            }
        }
        let center = {
            x: coordTransformed.x + window.innerWidth / 2,
            y: coordTransformed.y + window.innerHeight / 2
        }

        // draw player model; handle invulneravility visual effect
        if (player.invulnerable) {
            let t = Date.now();
            let tms = t % (CONFIG.SPAWN_SHIELD_DURATION / 5);
            if (Math.floor(t / (CONFIG.SPAWN_SHIELD_DURATION / 5)) % 2 == 0) {
                this.mainCtx.globalAlpha = tms / (CONFIG.SPAWN_SHIELD_DURATION / 5);
                this.mainCtx.drawImage(this.sprites['t-' + TeamColors[player.team]], center.x - 15, center.y - 15, 30, 30);
                this.mainCtx.globalAlpha = 1;
            }
            else {
                this.mainCtx.globalAlpha = 1 - tms / (CONFIG.SPAWN_SHIELD_DURATION / 5);
                this.mainCtx.drawImage(this.sprites['t-' + TeamColors[player.team]], center.x - 15, center.y - 15, 30, 30);
                this.mainCtx.globalAlpha = 1;
            }
        }
        else {
            this.mainCtx.drawImage(this.sprites['t-' + TeamColors[player.team]], center.x - 15, center.y - 15, 30, 30);
        }

        //draw arrows
        let dir: string = 'b';
        let dirVec: CartCoord = {
            x: player.direction.x,
            y: player.direction.y
        }
        if (dirVec.x == -1) {
            dir = 'l';
        }
        else if (dirVec.x == 1) {
            dir = 'r';
        }
        else if (dirVec.y == -1) {
            dir = 't';
        }
        else if (dirVec.y == 1) {
            dir = 'b';
        }
        else if (Math.sign(dirVec.x) == 1) {
            if (Math.sign(dirVec.y) == -1) {
                dir = 'tr';
            }
            else if (Math.sign(dirVec.y) == 1) {
                dir = 'br';
            }
        }
        else if (Math.sign(dirVec.x) == -1) {
            if (Math.sign(dirVec.y) == -1) {
                dir = 'tl';
            }
            else if (Math.sign(dirVec.y) == 1) {
                dir = 'bl';
            }
        }
        this.mainCtx.drawImage(this.sprites['a-' + dir], center.x - 20, center.y - 20, 40, 40);

        // draw health bar
        this.mainCtx.fillStyle = 'purple';
        this.mainCtx.fillRect(center.x - 17, center.y - 27, 34, 9);
        if (player.health == 2) {
            this.mainCtx.fillStyle = 'lime';
            this.mainCtx.fillRect(center.x - 15, center.y - 25, 30, 5);
        }
        else {
            this.mainCtx.fillStyle = 'lime';
            this.mainCtx.fillRect(center.x - 15, center.y - 25, 30, 5);
            this.mainCtx.fillStyle = 'red';
            this.mainCtx.fillRect(center.x, center.y - 25, 15, 5);
        }

        // draw username
        this.mainCtx.font = '18px Arial';
        this.mainCtx.fillStyle = 'purple';
        let txtWidth = this.mainCtx.measureText(player.name).width;
        this.mainCtx.fillText(player.name, center.x - txtWidth / 2, center.y + 30);
    }

    public drawProjectile(projectile: ProjectileProperties, myPlayer?: PlayerProperties) {
        let travDistance = Math.sqrt(Math.pow(projectile.remOffset.x, 2) + Math.pow(projectile.remOffset.y, 2)) / (1 - projectile.progress);
        if (myPlayer) {
            var coordTransformed: CartCoord = {
                x: projectile.coord.x - myPlayer.coord.x,
                y: projectile.coord.y - myPlayer.coord.y,
                z: (-CONFIG.GRAVITY * projectile.progress * travDistance * travDistance / 2 / CONFIG.PROJ_SPEED / CONFIG.PROJ_SPEED - CONFIG.PROJ_LAUNCH_HEIGHT) * (projectile.progress - 1)
            }
        }
        else {
            var coordTransformed: CartCoord = {
                x: projectile.coord.x,
                y: projectile.coord.y,
                // z: Math.sqrt(Math.pow(200, 2) - Math.pow(200 * 2 * (projectile.progress - 0.5), 2))
                // z: 1 / 2 * (-CONFIG.GRAVITY) * Math.pow(projectile.progress * travDistance / CONFIG.PROJ_SPEED, 2) - (-CONFIG.GRAVITY * travDistance / 2 / CONFIG.PROJ_SPEED + CONFIG.PROJ_SPEED * 40 / travDistance) * (projectile.progress * travDistance / CONFIG.PROJ_SPEED) + 40
                z: (-CONFIG.GRAVITY * projectile.progress * travDistance * travDistance / 2 / CONFIG.PROJ_SPEED / CONFIG.PROJ_SPEED - CONFIG.PROJ_LAUNCH_HEIGHT) * (projectile.progress - 1)
            }
        }
        Calculator.rotateX(coordTransformed, CONFIG.MAP_VIEW_ANGLE);

        switch (projectile.team) {
            case Color.red: {
                this.mainCtx.fillStyle = 'red';
                break;
            }
            case Color.blue: {
                this.mainCtx.fillStyle = 'blue';
                break;
            }
        }
        // this.mainCtx.fillRect(coordTransformed.x + window.innerWidth / 2 - 5, coordTransformed.y + window.innerHeight / 2 - 5, 10, 10);
        this.mainCtx.moveTo(coordTransformed.x + window.innerWidth / 2, coordTransformed.y + window.innerHeight / 2);
        this.mainCtx.beginPath();
        this.mainCtx.arc(coordTransformed.x + window.innerWidth / 2, coordTransformed.y + window.innerHeight / 2, 5, 0, 2 * Math.PI);
        this.mainCtx.fill();
    }

    public clearGameCanvas() {
        this.mainCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    public renderFPS(fps: number) {
        this.mainCtx.font = '25px Arial';
        this.mainCtx.fillStyle = 'white';
        this.mainCtx.fillText("FPS: " + fps, 10, 30);
    }

}