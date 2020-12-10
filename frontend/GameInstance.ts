import { ClientComponents } from ".";
import { Calculator } from "../shared/Calculator";
import { CONFIG } from "../shared/config";
import { AxialCoord, CartCoord, Color, EntityData, HexCell, HexCellMod, MapData, MapProperties, MoveKey, PlayerProperties, ProjectileProperties, SetupData } from "../shared/models";
import { Linker } from "./Linker";



export class GameInstance {
    public mapProps: MapProperties;
    public players: PlayerProperties[];
    public projectiles: ProjectileProperties[];

    public playerId: string;

    private linker: Linker;

    private renderer: GameRenderer;
    private fps: number;
    // private ctx: CanvasRenderingContext2D;

    constructor(private gameCanvas: HTMLCanvasElement, private clientComponents: ClientComponents) {
        this.mapProps = {
            grid: {}
        };
        this.players = [];
        this.projectiles = [];

        this.renderer = new GameRenderer(gameCanvas, this);
        // this.setCanvasSize();
        // this.ctx = this.gameCanvas.getContext('2d');
        // window.onresize = this.setCanvasSize.bind(this);
    }

    public start(linker: Linker) {
        if (this.linker) return;
        this.linker = linker;

        this.initializeClientComponents();
        this.startGameLoop();
    }

    private startGameLoop() {
        let self = this;
        let secondsPassed: number;
        let oldTimeStamp: number;

        window.requestAnimationFrame(startIteration);
        function startIteration(timeStamp) {
            oldTimeStamp = timeStamp;
            window.requestAnimationFrame(doGameIteration);
        }
        function doGameIteration(timeStamp) {
            secondsPassed = (timeStamp - oldTimeStamp) / 1000;
            oldTimeStamp = timeStamp;
            self.fps = Math.round(1 / secondsPassed);

            self.renderFrame();
            self.renderer.renderFPS(self.fps);

            self.predictNextFrame();

            window.requestAnimationFrame(doGameIteration);
        }
    }

    private renderFrame() {
        this.renderer.clearGameCanvas();
        this.renderer.renderMap();
        this.players.forEach(player => {
            this.renderer.drawPlayer(player);
        });
        this.projectiles.forEach(projectile => {
            if (projectile.progress == 1) return;
            this.renderer.drawProjectile(projectile);
        });
    }

    private predictNextFrame() {
        this.players.forEach(player => {
            this.updatePlayer(player);
        });
        this.projectiles.forEach(projectile => {
            this.updateProjectile(projectile);
        });
    }

    private updatePlayer(player: PlayerProperties) {
        if (player.direction.x != 0 || player.direction.y != 0) {
            let nextPos: CartCoord = this.predictNextPosition(player);
            let nextAxialPos: AxialCoord = Calculator.pixelToFlatHex(player.coord, CONFIG.EDGE_LENGTH);

            if (Math.abs(nextAxialPos.q) <= CONFIG.RING_COUNT && this.mapProps.grid[nextAxialPos.q].hasOwnProperty(nextAxialPos.r)) {
                player.coord = nextPos;
                if (player.cellCoord.q != nextAxialPos.q || player.cellCoord.r != nextAxialPos.r) {
                    player.cellCoord = nextAxialPos;
                }
            }
        }
    }

    private predictNextPosition(player: PlayerProperties): CartCoord {
        let pos: CartCoord = {
            x: player.coord.x,
            y: player.coord.y
        }
        if (player.direction.x != 0) {
            pos.x += player.direction.x * CONFIG.MOVE_SPEED / this.fps;
        }
        if (player.direction.y != 0) {
            pos.y += player.direction.y * CONFIG.MOVE_SPEED / this.fps;
        }
        return pos;
    }

    private updateProjectile(projectile: ProjectileProperties) {
        if (projectile.progress < 1) {
            let d = CONFIG.PROJ_SPEED / this.fps;
            let distRemaining = Math.sqrt(Math.pow(projectile.remOffset.x, 2) + Math.pow(projectile.remOffset.y, 2));
            if (distRemaining > d) {
                let dx = projectile.remOffset.x * d / distRemaining;
                let dy = projectile.remOffset.y * d / distRemaining;

                projectile.coord.x += dx;
                projectile.coord.y += dy;
                projectile.remOffset.x -= dx;
                projectile.remOffset.y -= dy;

                let travDistance = distRemaining / (1 - projectile.progress);
                distRemaining -= d;
                projectile.progress = (travDistance - distRemaining) / travDistance;
            }
            else {
                projectile.progress = 1;
            }
        }
    }

    private initializeClientComponents() {
        this.clientComponents.submit.addEventListener('click', () => {
            if (this.playerId) return;
            let username = this.clientComponents.username.value;
            console.log(username);
            this.linker.spawnPlayer(username)
                .then(id => {
                    // console.log('Player ID: ' + id);
                    this.playerId = id;
                });
            this.clientComponents.entry.classList.add('hidden');
        });
        let isDownW, isDownA, isDownS, isDownD;
        isDownW = isDownA = isDownS = isDownD = false;
        document.body.addEventListener('keydown', (e) => {
            if (this.playerId) {
                switch (e.key) {
                    case 'w': {
                        if (isDownW) return;
                        isDownW = true;
                        this.linker.setKey(this.playerId, MoveKey.w, true);
                        break;
                    }
                    case 'a': {
                        if (isDownA) return;
                        isDownA = true;
                        this.linker.setKey(this.playerId, MoveKey.a, true);
                        break;
                    }
                    case 's': {
                        if (isDownS) return;
                        isDownS = true;
                        this.linker.setKey(this.playerId, MoveKey.s, true);
                        break;
                    }
                    case 'd': {
                        if (isDownD) return;
                        isDownD = true;
                        this.linker.setKey(this.playerId, MoveKey.d, true);
                        break;
                    }
                }
            }
        });
        document.body.addEventListener('keyup', (e) => {
            if (this.playerId) {
                switch (e.key) {
                    case 'w': {
                        isDownW = false;
                        this.linker.setKey(this.playerId, MoveKey.w, false);
                        break;
                    }
                    case 'a': {
                        isDownA = false;
                        this.linker.setKey(this.playerId, MoveKey.a, false);
                        break;
                    }
                    case 's': {
                        isDownS = false;
                        this.linker.setKey(this.playerId, MoveKey.s, false);
                        break;
                    }
                    case 'd': {
                        isDownD = false;
                        this.linker.setKey(this.playerId, MoveKey.d, false);
                        break;
                    }
                }
            }
        });
        document.body.addEventListener('click', (e) => {
            let selection: CartCoord = {
                x: e.offsetX - window.innerWidth / 2,
                y: e.offsetY - window.innerHeight / 2
            }
            selection.z = Calculator.calcZofPoint(selection, CONFIG.MAP_VIEW_ANGLE);
            Calculator.rotateX(selection, -CONFIG.MAP_VIEW_ANGLE);
            let axialSelection: AxialCoord = Calculator.pixelToFlatHex(selection, CONFIG.EDGE_LENGTH);
            // if (this.map.checkCellExists(options.target) && Calculator.calcCellDistance(options.target, player.cellCoord) <= CONFIG.ATTACK_RANGE)
            this.linker.attack({
                id: this.playerId,
                target: axialSelection
            });
        });
    }

    public handleSetupData(data: SetupData) {
        // console.log('from instance');
        console.log(data);
        this.mapProps = data.map;
        this.players = data.players;
        this.projectiles = data.projectiles;

        this.renderer.generateMap(this.mapProps.grid);
        // this.players.forEach(player => {
        //     this.renderer.drawPlayer(player);
        // })
    }

    public handleMapData(data: MapData) {
        // console.log('Received map data');
        data.cells.forEach((cell) => {
            this.mapProps.grid[cell.cellCoord.q][cell.cellCoord.r].color = cell.color;
            this.renderer.drawCell(cell);
        });
    }

    public handleEntityData(data: EntityData) {
        // console.log(data);
        this.players = data.players;
        this.projectiles = data.projectiles;

        // this.renderer.clearGameCanvas();
        // this.renderer.renderMap();
        // this.players.forEach(player => {
        //     this.renderer.drawPlayer(player);
        // });
    }
}

export class GameRenderer {

    private mainCtx: CanvasRenderingContext2D;

    private mapCanvas: HTMLCanvasElement;
    private mapCtx: CanvasRenderingContext2D;
    private mapWidth: number;

    private hexCornerPoints;

    constructor(private gameCanvas: HTMLCanvasElement, private gameInstance: GameInstance) {
        this.mainCtx = gameCanvas.getContext('2d');

        this.mapCanvas = document.createElement('canvas');
        this.mapCtx = this.mapCanvas.getContext('2d');
        this.mapWidth = (CONFIG.RING_COUNT * 2 + 1) * CONFIG.EDGE_LENGTH * Math.sqrt(3) + 10;
        console.log(this.mapWidth);
        this.mapCanvas.width = this.mapWidth
        this.mapCanvas.height = this.mapWidth;

        this.hexCornerPoints = [{ x: -CONFIG.EDGE_LENGTH, y: 0, z: 0 }, { x: -CONFIG.EDGE_LENGTH / 2, y: CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: CONFIG.EDGE_LENGTH / 2, y: CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: CONFIG.EDGE_LENGTH, y: 0, z: 0 }, { x: CONFIG.EDGE_LENGTH / 2, y: -CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }, { x: -CONFIG.EDGE_LENGTH / 2, y: -CONFIG.EDGE_LENGTH * Math.sqrt(3) / 2, z: 0 }];
        Calculator.rotateX(this.hexCornerPoints, CONFIG.MAP_VIEW_ANGLE);

        this.setCanvasSize();
        window.onresize = this.setCanvasSize.bind(this);
    }

    private setCanvasSize() {
        this.gameCanvas.width = window.innerWidth;
        this.gameCanvas.height = window.innerHeight;
    }

    public drawCell(cell: HexCell | HexCellMod) {
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
        this.mapCtx.stroke();
        if (cell.color != Color.nocolor) {
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
    }

    public generateMap(grid: { [index: string]: { [index: string]: HexCell } }) {
        this.mapCtx.strokeStyle = 'white';
        Object.keys(grid).forEach(q => {
            Object.keys(grid[q]).forEach(r => {
                this.drawCell(grid[q][r]);
            });
        });
    }

    public renderMap(player?: PlayerProperties) {
        // player = this.gameInstance.players[0];
        let offset;
        if (player) {
            offset = {
                x: (window.innerWidth - this.mapWidth) / 2 - player.coord.x,
                y: (window.innerHeight - this.mapWidth) / 2 - player.coord.y
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

    public drawPlayer(player: PlayerProperties) {
        let coordTransformed: CartCoord = {
            x: player.coord.x,
            y: player.coord.y
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
        this.mainCtx.fillRect(coordTransformed.x + window.innerWidth / 2 - 10, coordTransformed.y + window.innerHeight / 2 - 10, 20, 20);
    }

    public drawProjectile(projectile: ProjectileProperties) {
        let travDistance = Math.sqrt(Math.pow(projectile.remOffset.x, 2) + Math.pow(projectile.remOffset.y, 2)) / (1 - projectile.progress);
        let coordTransformed: CartCoord = {
            x: projectile.coord.x,
            y: projectile.coord.y,
            // z: Math.sqrt(Math.pow(200, 2) - Math.pow(200 * 2 * (projectile.progress - 0.5), 2))
            // z: 1 / 2 * (-CONFIG.GRAVITY) * Math.pow(projectile.progress * travDistance / CONFIG.PROJ_SPEED, 2) - (-CONFIG.GRAVITY * travDistance / 2 / CONFIG.PROJ_SPEED + CONFIG.PROJ_SPEED * 40 / travDistance) * (projectile.progress * travDistance / CONFIG.PROJ_SPEED) + 40
            z: (-CONFIG.GRAVITY * projectile.progress * travDistance * travDistance / 2 / CONFIG.PROJ_SPEED / CONFIG.PROJ_SPEED - CONFIG.PROJ_LAUNCH_HEIGHT) * (projectile.progress - 1)
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
        this.mainCtx.fillRect(coordTransformed.x + window.innerWidth / 2 - 5, coordTransformed.y + window.innerHeight / 2 - 5, 10, 10);
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