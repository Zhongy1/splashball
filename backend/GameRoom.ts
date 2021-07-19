import { v4 as uuidv4 } from 'uuid';
import { MapProperties, PlayerProperties, ProjectileProperties, CartCoord, AxialCoord, DirectionVector, Color, HexCell, Vector, HexCellMod, MoveKey, GameState, GameStateConfig, SpawnMode, PlayerState } from '../shared/models';
import { CONFIG } from '../shared/config';
import { Broker } from './Broker';
import { Calculator } from '../shared/Calculator';
import { Timer } from './Timer';
import { Player } from './Player';
import { Projectile } from './Projectile';
import { Map } from './Map';

export interface FireCommand {
    id: string, // playerId
    target: AxialCoord // target cell
}
export class GameRoom {
    static updateRate: number = 1000 / CONFIG.GAME_INTERVAL;

    public map: Map;
    public players: { [id: string]: Player };
    public projectiles: { [id: string]: Projectile };

    private outgoingCellMods: HexCellMod[];
    private incomingAttackCmds: FireCommand[];

    private currState: GameState;
    private stateConfig: GameStateConfig;

    private teamCurrSizes: { [color: string]: number };
    private currPlayers: number;
    private timer: Timer;

    private gameLoop;
    private broker: Broker;

    private frameRate: number;
    private previousTick: number;

    constructor() {
        this.map = new Map({ rings: CONFIG.RING_COUNT, hexEdgeLength: CONFIG.EDGE_LENGTH }, this);
        this.players = {};
        this.projectiles = {};

        this.currState = GameState.Waiting;
        this.stateConfig = {
            spawning: SpawnMode.Center,
            playerState: PlayerState.Vulnerable,
            mapInteraction: true,
            playerInteraction: false
        }

        this.teamCurrSizes = {};
        for (let i = 1; i <= Color.blue; i++) {
            this.teamCurrSizes[i] = 0;
        }
        this.currPlayers = 0;
        this.timer = new Timer();

        this.outgoingCellMods = [];
        this.incomingAttackCmds = [];

        this.frameRate = Math.round(1000 / CONFIG.GAME_INTERVAL);
        this.previousTick = 0;
    }

    public start(broker: Broker) {
        let self = this;
        this.broker = broker;
        this.doGameLoop();
    }

    private handleGameState(): void {
        switch (this.currState) {
            case GameState.Waiting:
                if (this.currPlayers >= CONFIG.MIN_PLAYERS) {
                    this.handleGameTransition(GameState.Starting);
                    this.handleGameState();
                }
                break;
            case GameState.Starting:
                if (this.currPlayers < CONFIG.MIN_PLAYERS) {
                    this.handleGameTransition(GameState.Starting);
                    this.handleGameState();
                }
                else if (this.timer.getElapsed() >= CONFIG.GAME_START_TIME) {
                    this.handleGameTransition(GameState.Ongoing);
                    this.handleGameState();
                }
                break;
            case GameState.Ongoing:
                if (this.checkOneTeamRemaining()) {
                    this.handleGameTransition(GameState.Over);
                    this.handleGameState();
                }
                break;
            case GameState.Over:
                if (this.timer.getElapsed() >= CONFIG.GAME_OVER_TIME) {
                    if (this.currPlayers < CONFIG.MIN_PLAYERS) {
                        this.handleGameTransition(GameState.Waiting);
                        this.handleGameState();
                    }
                    else {
                        this.handleGameTransition(GameState.Starting);
                        this.handleGameState();
                    }
                }
                break;
        }
    }

    private handleGameTransition(targetState: GameState): void {
        switch (this.currState) {
            case GameState.Waiting:
                if (targetState == GameState.Starting) {
                    this.timer.startTimer();
                    this.currState = GameState.Starting;
                }
                break;
            case GameState.Starting:
                if (targetState == GameState.Waiting) {
                    this.currState = GameState.Waiting;
                }
                else if (targetState == GameState.Ongoing) {
                    this.stateConfig.spawning = SpawnMode.Regional_Random;
                    this.stateConfig.playerState = PlayerState.Invulnerable;
                    this.stateConfig.playerInteraction = true;
                    this.relocatePlayers();
                    this.currState = GameState.Ongoing;
                }
                break;
            case GameState.Ongoing:
                if (targetState == GameState.Over) {
                    this.timer.startTimer();
                    this.stateConfig.playerState = PlayerState.Vulnerable;
                    this.stateConfig.playerInteraction = false;
                    this.currState = GameState.Over;
                }
                break;
            case GameState.Over:
                if (targetState == GameState.Waiting) {
                    this.stateConfig.spawning = SpawnMode.Center;
                    this.currState = GameState.Waiting;
                }
                else if (targetState == GameState.Starting) {
                    this.stateConfig.spawning = SpawnMode.Center;
                    this.currState = GameState.Starting;
                }
                break;
        }
        this.broker.handleGameState(this.currState);
    }

    private checkOneTeamRemaining(): boolean {
        let teams = Object.keys(this.teamCurrSizes);
        for (let i = 0; i < teams.length; i++) {
            if (this.teamCurrSizes[teams[i]] == 0) {
                return true;
            }
        }
        return false;
    }

    private doGameIteration(): void {
        let projIds = Object.keys(this.projectiles);
        let playerIds = Object.keys(this.players);

        // handle game state machine
        this.handleGameState();

        // spawn prjectiles
        let attackCmds = this.extractAttackCmds();
        attackCmds.forEach(cmd => {
            this.spawnProjectile(cmd);
        });

        // update projectiles, then handle if they landed
        projIds.forEach(id => {
            if (this.projectiles.hasOwnProperty(id)) {
                let projectile = this.projectiles[id];
                projectile.updateState();
                if (projectile.progress == 1) {
                    // interact with players
                    for (let playerId of playerIds) { // looping through all players is inefficient
                        if (this.players.hasOwnProperty(playerId)) {
                            this.players[playerId].takeDmg(projectile);
                        }
                    }
                    // interact with map
                    let modified = this.map.setColor(projectile.cellCoord, projectile.team, 1);
                    for (let cell of modified) {
                        this.outgoingCellMods.push(cell);
                    }
                    this.deleteProjectile(id);
                }
            }
        });

        // update players
        playerIds.forEach(id => {
            if (this.players.hasOwnProperty(id)) {
                this.players[id].updateState();
            }
        });

        // if cells are modified, call broker function to send it
        let mods = this.extractCellMods();
        if (mods.length > 0) {
            this.broker.handleMapData(mods);
        }

        // call broker function to broadcast new entity states
        this.broker.handleEntityData(this.players, this.projectiles);
    }

    private doGameLoop(): void {
        let now = Date.now();

        if (this.previousTick + CONFIG.GAME_INTERVAL <= now) {
            this.previousTick = now;

            this.doGameIteration();
        }

        if (Date.now() - this.previousTick < CONFIG.GAME_INTERVAL - 16) {
            setTimeout(this.doGameLoop.bind(this));
        } else {
            setImmediate(this.doGameLoop.bind(this));
        }
    }

    public spawnPlayer(username: string): Player {
        if (this.currPlayers == CONFIG.MAX_PLAYERS) {
            return null;
        }
        let teamColor = this.determineTeamColor();
        let player = new Player({
            id: uuidv4(),
            cellStartCoord: this.generateSpawnPoint(teamColor), // need to generate right spawn location
            name: username,
            // team: (username.length % 2 == 0) ? Color.red : Color.blue,
            team: teamColor,
            speed: CONFIG.MOVE_SPEED
        }, this);
        this.players[player.id] = player;
        this.teamCurrSizes[player.team]++;
        this.currPlayers++;
        return player;
    }

    public deletePlayer(playerId: string): void {
        if (this.players.hasOwnProperty(playerId)) {
            let player = this.players[playerId];
            this.teamCurrSizes[player.team]--;
            this.currPlayers--;
            delete this.players[playerId];
        }
    }

    public setKey(playerId: string, key: MoveKey, state: boolean): void {
        if (this.players.hasOwnProperty(playerId)) {
            switch (key) {
                case MoveKey.w:
                    this.players[playerId].setW(state);
                    break;
                case MoveKey.a:
                    this.players[playerId].setA(state);
                    break;
                case MoveKey.s:
                    this.players[playerId].setS(state);
                    break;
                case MoveKey.d:
                    this.players[playerId].setD(state);
                    break;
            }
        }
    }

    public attack(cmd: FireCommand): void {
        this.incomingAttackCmds.push(cmd);
    }

    private spawnProjectile(options: FireCommand): void {
        if (this.players.hasOwnProperty(options.id)) {
            let player = this.players[options.id];
            if (this.map.checkCellExists(options.target) && Calculator.calcCellDistance(options.target, player.cellCoord) <= CONFIG.ATTACK_RANGE) {
                let firing = player.fire();
                if (!firing) return;
                let projectile = new Projectile({
                    id: uuidv4(),
                    startCoord: {
                        x: player.coord.x,
                        y: player.coord.y
                    },
                    speed: CONFIG.PROJ_SPEED,
                    team: player.team,
                    targetCellCoord: options.target
                }, this);
                this.projectiles[projectile.id] = projectile;
            }
        }
    }

    private deleteProjectile(projId: string): void {
        if (this.projectiles.hasOwnProperty(projId)) {
            delete this.projectiles[projId];
        }
    }

    private extractAttackCmds(): FireCommand[] {
        let cmds = this.incomingAttackCmds;
        this.incomingAttackCmds = [];
        return cmds;
    }

    private extractCellMods(): HexCell[] {
        let mods = this.outgoingCellMods;
        this.outgoingCellMods = [];
        return mods;
    }

    public checkPlayerState(playerId: string): boolean {
        return this.players.hasOwnProperty(playerId);
    }

    private determineTeamColor(): Color {
        let leastTeam: Color = Color.red;
        let teamSize = this.teamCurrSizes[Color.red];
        Object.keys(this.teamCurrSizes).forEach((team) => {
            if (this.teamCurrSizes[team] < teamSize) {
                leastTeam = parseInt(team);
                teamSize = this.teamCurrSizes[team];
            }
        });
        return leastTeam;
    }

    public informTeamChange(playerId: string, team: Color): void {
        let player = this.players[playerId];
        this.teamCurrSizes[player.team]--;
        player.team = team;
        this.teamCurrSizes[player.team]++;
    }

    private generateSpawnPoint(team: Color): AxialCoord {
        switch (this.currState) {
            case GameState.Waiting:
            case GameState.Starting:
                return { q: 0, r: 0 };
            case GameState.Ongoing:
            case GameState.Over:
                if (team == Color.red) {
                    let q = -(Math.floor(Math.random() * 10 + 1));
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    return { q: q, r: -Math.round(Math.random() * (max + CONFIG.RING_COUNT)) + CONFIG.RING_COUNT }
                }
                else if (team == Color.blue) {
                    let q = Math.floor(Math.random() * 10 + 1);
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    return { q: q, r: Math.round(Math.random() * (max + CONFIG.RING_COUNT)) - CONFIG.RING_COUNT }
                }
                break;
        }
    }

    private relocatePlayers(): void {
        Object.keys(this.players).forEach(playerId => {
            let player = this.players[playerId];
            switch (player.team) {
                case Color.red: {
                    let q = -(Math.floor(Math.random() * 10 + 1));
                    let max = CONFIG.RING_COUNT - Math.abs(player.cellCoord.q);
                    let r = -Math.round(Math.random() * (max + CONFIG.RING_COUNT)) + CONFIG.RING_COUNT;
                    player.setNewLocation({ q: q, r: r });
                    break;
                }
                case Color.blue: {
                    let q = Math.floor(Math.random() * 10 + 1);
                    let max = CONFIG.RING_COUNT - Math.abs(player.cellCoord.q);
                    let r = Math.round(Math.random() * (max + CONFIG.RING_COUNT)) - CONFIG.RING_COUNT;
                    player.setNewLocation({ q: q, r: r });
                    break;
                }
            }
        })
    }
}