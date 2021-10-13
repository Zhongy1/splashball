import { GameInstance } from "./GameInstance";
import { Linker } from "./Linker";

export interface ClientComponents {
    entry: HTMLDivElement
    username: HTMLInputElement,
    submit: HTMLButtonElement,
    menu: HTMLSelectElement
}

let gameCanvas: HTMLCanvasElement = document.getElementById('game') as HTMLCanvasElement;
let inputs: ClientComponents = {
    entry: document.querySelector('.entry-screen') as HTMLDivElement,
    username: document.getElementById('username') as HTMLInputElement,
    submit: document.getElementById('submit') as HTMLButtonElement,
    menu: document.getElementById('menu') as HTMLSelectElement
}
let gameInstance: GameInstance = new GameInstance(gameCanvas, inputs);
let linker: Linker = new Linker(gameInstance);
gameInstance.start(linker);