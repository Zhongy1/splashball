

export interface AxialCoord {
    q: number,
    r: number
}

export interface CartCoord { // coordinate system of html canvas (+x going right, +y going down)
    x: number,
    y: number
}

export interface DirectionVector { // although identical to CartCoord, this is for describing a unit vector. Magnitude has to equal 1 or 0 if not moving
    x: number,
    y: number
}

export interface Vector { // this is a normal vector
    x: number,
    y: number
}

export interface HexCell {
    coord: CartCoord,
    color: Color
}

export interface HexCellMod {
    cellCoord: AxialCoord,
    coord: CartCoord,
    color: Color
}

export enum Color {
    nocolor, red, blue
}

export interface MapProperties {
    grid: { [index: string]: { [index: string]: HexCell } } //grid[q][r] -> HexCell
}

export interface PlayerProperties {
    id: string,

    // positioning
    coord: CartCoord,
    cellCoord: AxialCoord,
    direction: DirectionVector,

    // visibile details
    name: string,
    health: number,
    team: Color,

    // cooldowns
    lastShot: number
}

export interface ProjectileProperties {
    id: string,

    // positioning
    coord: CartCoord,
    remOffset: Vector,

    // visibile details
    team: Color,

    // target
    cellCoord: AxialCoord
    progress: number
}

export enum MoveKey {
    w = 'w', a = 'a', s = 's', d = 'd'
}

export interface SetupData {
    map: MapProperties,
    players: PlayerProperties[],
    projectiles: ProjectileProperties[]
}

export interface MapData {
    cells: HexCellMod[]
}

export interface EntityData {
    players: PlayerProperties[],
    projectiles: ProjectileProperties[]
}