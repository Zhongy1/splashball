import { ClientComponents } from ".";
import { Calculator } from "../shared/Calculator";
import { CONFIG } from "../shared/config";
import {
    ActionKey,
    AxialCoord,
    CartCoord,
    EntityData,
    GameState,
    MapData,
    MapProperties,
    PlayerProperties,
    ProjectileProperties,
    SetupData
} from "../shared/models";
import { Linker } from "./Linker";
import { GameRenderer } from "./GameRenderer";

export class GameInstance {
    public mapProps: MapProperties;
    public players: PlayerProperties[];
    public projectiles: ProjectileProperties[];

    public playerId: string;
    public myPlayer: PlayerProperties;

    private currState: GameState;

    private linker: Linker;

    private renderer: GameRenderer;
    private fps: number;

    private x: number;
    private y: number;
    // private ctx: CanvasRenderingContext2D;

    constructor(private gameCanvas: HTMLCanvasElement, private clientComponents: ClientComponents) {
        this.mapProps = {
            grid: {}
        };
        this.players = [];
        this.projectiles = [];

        this.currState = null;

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
        // Revamp later to get O(1) retrieval
        this.myPlayer = null;
        for (let i = 0; i < this.players.length; i++) {
            if (this.playerId == this.players[i].id) {
                this.myPlayer = this.players[i];
                break;
            }
        }
        // revamp ^^^
        this.renderer.renderMap(this.myPlayer);
        this.players.forEach(player => {
            this.renderer.drawPlayer(player, this.myPlayer);
        });
        this.projectiles.forEach(projectile => {
            if (projectile.progress == 1) return;
            this.renderer.drawProjectile(projectile, this.myPlayer);
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
        if (!player.paralyzed && (player.direction.x != 0 || player.direction.y != 0)) {
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
        let self = this;
        async function login(username: string): Promise<string> {
            if (!self.clientComponents.menu.value) {
                return null;
            }
            try {
                await self.linker.start(`/${self.clientComponents.menu.value}`);
            }
            catch {
                return null;
            }
            let id = await self.linker.spawnPlayer(username);
            self.clientComponents.entry.classList.add('hidden');
            self.clientComponents.submit.setAttribute('disabled', '');
            self.clientComponents.username.setAttribute('disabled', '');
            return id;
        }
        this.clientComponents.submit.addEventListener('click', () => {
            if (this.playerId) return;
            let username = this.clientComponents.username.value;
            login(username).then((id) => {
                if (id) this.playerId = id;
                else {
                    // indicate failed login
                    console.log('login failed');
                }
            });
        });
        this.clientComponents.username.addEventListener('keypress', (e) => {
            if (e.key == 'Enter') {
                if (this.playerId) return;
                let username = this.clientComponents.username.value;
                login(username).then((id) => {
                    if (id) this.playerId = id;
                    else {
                        // indicate failed login
                        console.log('login failed');
                    }
                });
            }
        });
        let isDownW, isDownA, isDownS, isDownD, isDownSpace;
        isDownW = isDownA = isDownS = isDownD = isDownSpace = false;
        document.body.addEventListener('keydown', (e) => {
            if (this.playerId) {
                switch (e.key) {
                    case ActionKey.w: {
                        if (isDownW) return;
                        isDownW = true;
                        this.linker.setKey(this.playerId, ActionKey.w, true);
                        break;
                    }
                    case ActionKey.a: {
                        if (isDownA) return;
                        isDownA = true;
                        this.linker.setKey(this.playerId, ActionKey.a, true);
                        break;
                    }
                    case ActionKey.s: {
                        if (isDownS) return;
                        isDownS = true;
                        this.linker.setKey(this.playerId, ActionKey.s, true);
                        break;
                    }
                    case ActionKey.d: {
                        if (isDownD) return;
                        isDownD = true;
                        this.linker.setKey(this.playerId, ActionKey.d, true);
                        break;
                    }
                    case ActionKey.space: {
                        if (isDownSpace) return;
                        isDownSpace = true;
                        // this.linker.setKey(this.playerId, ActionKey.space, true);
                        if (this.x != undefined && this.y != undefined) {
                            this.doAttack(this.x, this.y);
                        }
                        break;
                    }
                }
            }
        });
        document.body.addEventListener('keyup', (e) => {
            if (this.playerId) {
                switch (e.key) {
                    case ActionKey.w: {
                        isDownW = false;
                        this.linker.setKey(this.playerId, ActionKey.w, false);
                        break;
                    }
                    case ActionKey.a: {
                        isDownA = false;
                        this.linker.setKey(this.playerId, ActionKey.a, false);
                        break;
                    }
                    case ActionKey.s: {
                        isDownS = false;
                        this.linker.setKey(this.playerId, ActionKey.s, false);
                        break;
                    }
                    case ActionKey.d: {
                        isDownD = false;
                        this.linker.setKey(this.playerId, ActionKey.d, false);
                        break;
                    }
                    case ActionKey.space: {
                        isDownSpace = false;
                        // this.linker.setKey(this.playerId, ActionKey.space, false);
                        break;
                    }
                }
            }
        });
        document.body.addEventListener('click', (e) => {
            if (!this.playerId) return;
            this.doAttack(e.offsetX, e.offsetY);
        });
        document.body.addEventListener('mousemove', (e) => {
            this.x = e.offsetX;
            this.y = e.offsetY;
        });
    }

    public handleSetupData(data: SetupData) {
        // console.log('from instance');
        console.log(data);
        this.handleGameState(data.state);
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

    public handleMapClear() {
        this.renderer.generateMap(this.mapProps.grid, true);
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

    public handleGameState(state: GameState, options?: any): void {
        this.currState = state;
        switch (state) {
            case GameState.Waiting:
                //indicate waiting for players
                document.getElementById('timer-panel').children[0].innerHTML = 'Waiting for more players';
                document.getElementById('timer-panel').children[1].innerHTML = ``;
                document.getElementById('timer-panel').classList.remove('hidden');
                break;
            case GameState.Starting:
                //start timer
                let t1 = Math.ceil(CONFIG.GAME_START_TIME / 1000);
                document.getElementById('timer-panel').children[0].innerHTML = 'Starting...';
                document.getElementById('timer-panel').children[1].innerHTML = `${t1}`;
                //show timer panel
                document.getElementById('timer-panel').classList.remove('hidden');
                let int1 = setInterval(() => {
                    if (this.currState != GameState.Starting) {
                        clearInterval(int1);
                        return;
                    }
                    t1--;
                    document.getElementById('timer-panel').children[1].innerHTML = t1.toString();
                    if (t1 <= 0) {
                        clearInterval(int1);
                    }
                }, 1000);
                break;
            case GameState.Ongoing:
                //hide timer panel
                document.getElementById('timer-panel').classList.add('hidden');
                break;
            case GameState.Over:
                //start timer
                let t2 = Math.ceil(CONFIG.GAME_OVER_TIME / 1000);
                //change messaage
                document.getElementById('timer-panel').children[0].innerHTML = `Winner: ${options.winningTeam == 1 ? 'Red' : 'Blue'} Team`;
                document.getElementById('timer-panel').children[1].innerHTML = `${t2}`;
                //show timer panel
                document.getElementById('timer-panel').classList.remove('hidden');
                let int2 = setInterval(() => {
                    if (this.currState != GameState.Over) {
                        clearInterval(int2);
                        return;
                    }
                    t2--;
                    document.getElementById('timer-panel').children[1].innerHTML = t2.toString();
                    if (t2 <= 0) {
                        clearInterval(int2);
                    }
                }, 1000);
                break;
        }
    }

    public doAttack(x: number, y: number) {
        let selection: CartCoord = {
            x: x - window.innerWidth / 2,
            y: y - window.innerHeight / 2
        }
        let coordTransformed: CartCoord = {
            x: this.myPlayer.coord.x,
            y: this.myPlayer.coord.y
        }
        Calculator.rotateX(coordTransformed, -CONFIG.MAP_VIEW_ANGLE);
        // let selection: CartCoord = {
        //     x: e.offsetX - window.innerWidth / 2 + this.myPlayer.coord.x,
        //     y: e.offsetY - window.innerHeight / 2 + this.myPlayer.coord.y
        // }
        selection.x += coordTransformed.x;
        selection.y += coordTransformed.y;
        selection.z = Calculator.calcZofPoint(selection, CONFIG.MAP_VIEW_ANGLE);
        Calculator.rotateX(selection, -CONFIG.MAP_VIEW_ANGLE);
        let axialSelection: AxialCoord = Calculator.pixelToFlatHex(selection, CONFIG.EDGE_LENGTH);
        // if (this.map.checkCellExists(options.target) && Calculator.calcCellDistance(options.target, player.cellCoord) <= CONFIG.ATTACK_RANGE)
        this.linker.attack({
            id: this.playerId,
            target: axialSelection
        });
    }
}