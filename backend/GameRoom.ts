import { v4 as uuidv4 } from 'uuid';
import { MapProperties, PlayerProperties, ProjectileProperties, CartCoord, AxialCoord, DirectionVector, Color, HexCell, Vector, HexCellMod, ActionKey, GameState, GameStateConfig, SpawnMode, PlayerState, TimedAction, TimedActionType } from '../shared/models';
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
    private timedActions: { [key: string]: TimedAction[] };

    public currState: GameState;
    private stateConfig: GameStateConfig;

    private teamCurrSizes: { [color: string]: number };
    private currPlayers: number;
    private timer: Timer;

    private broker: Broker;

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
        this.timedActions = {};

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
                }
                break;
            case GameState.Starting:
                if (this.currPlayers < CONFIG.MIN_PLAYERS) {
                    this.handleGameTransition(GameState.Starting);
                }
                else if (this.timer.getElapsed() >= CONFIG.GAME_START_TIME) {
                    this.handleGameTransition(GameState.Ongoing);
                }
                break;
            case GameState.Ongoing:
                if (this.checkOneTeamRemaining()) {
                    this.handleGameTransition(GameState.Over);
                }
                break;
            case GameState.Over:
                if (this.timer.getElapsed() >= CONFIG.GAME_OVER_TIME) {
                    if (this.currPlayers < CONFIG.MIN_PLAYERS) {
                        this.handleGameTransition(GameState.Waiting);
                    }
                    else {
                        this.handleGameTransition(GameState.Starting);
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
                    this.map.clearMap();
                    this.broker.handleMapClear();
                    this.clearProjectiles();
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
                    this.timer.startTimer();
                    this.stateConfig.spawning = SpawnMode.Center;
                    this.currState = GameState.Starting;
                }
                this.resetTeams();
                break;
        }
        let options = {};
        if (this.currState == GameState.Over) {
            options['winningTeam'] = (this.teamCurrSizes[Color.red] > this.teamCurrSizes[Color.blue]) ? Color.red : Color.blue;
        }
        this.broker.handleGameState(this.currState, options);
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
                    if (this.currState == GameState.Ongoing) { // Player interactions only while game is ongoing
                        for (let playerId of playerIds) { // looping through all players is inefficient
                            if (this.players.hasOwnProperty(playerId)) {
                                this.players[playerId].takeDmg(projectile);
                            }
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

    private checkTimedActions(t: number): void {
        let playerIds = Object.keys(this.timedActions);
        for (let playerId of playerIds) {
            if (this.timedActions.hasOwnProperty(playerId)) {
                let actions = this.timedActions[playerId];
                let i = 0;
                while (i < actions.length) {
                    let a = actions[i];
                    switch (a.type) {
                        case TimedActionType.Invulnerability:
                            if (t - a.startTime > CONFIG.SPAWN_SHIELD_DURATION) {
                                if (this.players.hasOwnProperty(playerId)) {
                                    this.players[playerId].invulnerable = false;
                                }
                                actions.splice(i, 1);
                            }
                            else i++;
                            break;
                        case TimedActionType.Paralysis:
                            if (t - a.startTime > CONFIG.TEAM_CHANGE_PARALYSIS) {
                                if (this.players.hasOwnProperty(playerId)) {
                                    this.players[playerId].paralyzed = false;
                                }
                                actions.splice(i, 1);
                            }
                            else i++;
                            break;
                        default:
                            actions.splice(i, 1);
                            break;
                    }
                }
                if (actions.length == 0) {
                    delete this.timedActions[playerId];
                }
            }
        }
    }

    private doGameLoop(): void {
        let now = Date.now();

        if (this.previousTick + CONFIG.GAME_INTERVAL <= now) {
            this.previousTick = now;

            this.checkTimedActions(now);
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
            speed: CONFIG.MOVE_SPEED,
            invulnerable: (this.currState == GameState.Ongoing) ? true : false
        }, this);
        this.players[player.id] = player;
        if (!this.timedActions.hasOwnProperty(player.id)) {
            this.timedActions[player.id] = [{
                type: TimedActionType.Invulnerability,
                startTime: Date.now()
            }];
        }
        else {
            this.timedActions[player.id].push({
                type: TimedActionType.Invulnerability,
                startTime: Date.now()
            });
        }
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

    public setKey(playerId: string, key: ActionKey, state: boolean): void {
        if (this.players.hasOwnProperty(playerId)) {
            switch (key) {
                case ActionKey.w:
                    this.players[playerId].setW(state);
                    break;
                case ActionKey.a:
                    this.players[playerId].setA(state);
                    break;
                case ActionKey.s:
                    this.players[playerId].setS(state);
                    break;
                case ActionKey.d:
                    this.players[playerId].setD(state);
                    break;
                case ActionKey.space:
                    // console.log('backend space key received');
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
        // convert to actual hexcell eventually. possibly just remove the cellCoord property from HexCellMod to get HexCell
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

    public informTeamChange(player: Player, team: Color): void;
    public informTeamChange(playerId: string, team: Color): void;
    public informTeamChange(playerIdObj: any, team: Color): void {
        if (typeof playerIdObj === 'string') {
            playerIdObj = this.players[playerIdObj];
        }
        playerIdObj.paralyzed = true;
        if (!this.timedActions.hasOwnProperty(playerIdObj.id)) {
            this.timedActions[playerIdObj.id] = [{
                type: TimedActionType.Paralysis,
                startTime: Date.now()
            }];
        }
        else {
            let tA = this.timedActions[playerIdObj.id];
            let set = false;
            for (let i = 0; i < tA.length; i++) {
                if (tA[i].type == TimedActionType.Paralysis) {
                    tA[i].startTime = Date.now();
                    set = true;
                    break;
                }
            }
            if (!set) {
                this.timedActions[playerIdObj.id].push({
                    type: TimedActionType.Paralysis,
                    startTime: Date.now()
                });
            }
        }
        this.teamCurrSizes[playerIdObj.team]--;
        playerIdObj.team = team;
        this.teamCurrSizes[playerIdObj.team]++;
    }

    private generateSpawnPoint(team: Color): AxialCoord {
        switch (this.currState) {
            case GameState.Waiting:
            case GameState.Starting:
                return { q: 0, r: 0 };
            case GameState.Ongoing:
            case GameState.Over:
                if (team == Color.red) {
                    let q = -(Math.floor(Math.random() * CONFIG.RING_COUNT + 1));
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    return { q: q, r: -Math.round(Math.random() * (max + CONFIG.RING_COUNT)) + CONFIG.RING_COUNT }
                }
                else if (team == Color.blue) {
                    let q = Math.floor(Math.random() * CONFIG.RING_COUNT + 1);
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    return { q: q, r: Math.round(Math.random() * (max + CONFIG.RING_COUNT)) - CONFIG.RING_COUNT }
                }
                break;
        }
    }

    private relocatePlayers(): void {
        // TODO: Improve this so that it's not identical to generateSpawnPoint
        Object.keys(this.players).forEach(playerId => {
            let player = this.players[playerId];
            switch (player.team) {
                case Color.red: {
                    let q = -(Math.floor(Math.random() * CONFIG.RING_COUNT + 1));
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    let r = -Math.round(Math.random() * (max + CONFIG.RING_COUNT)) + CONFIG.RING_COUNT;
                    player.setNewLocation({ q: q, r: r });
                    break;
                }
                case Color.blue: {
                    let q = Math.floor(Math.random() * CONFIG.RING_COUNT + 1);
                    let max = CONFIG.RING_COUNT - Math.abs(q);
                    let r = Math.round(Math.random() * (max + CONFIG.RING_COUNT)) - CONFIG.RING_COUNT;
                    player.setNewLocation({ q: q, r: r });
                    break;
                }
            }
        });
    }

    private clearProjectiles(): void {
        Object.keys(this.projectiles).forEach((projId) => {
            if (this.projectiles.hasOwnProperty(projId)) {
                delete this.projectiles[projId];
            }
        });
    }

    private resetTeams(): void {
        let even = true;
        Object.keys(this.players).forEach(playerId => {
            // TODO: Improve in the future
            let player = this.players[playerId];
            player.health = 2;
            let team = (even) ? Color.red : Color.blue;
            this.informTeamChange(player, team);
            even = !even;
        });
    }
}