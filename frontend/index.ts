import { GameRoomOption } from "../shared/models";
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
fetch('/game-rooms')
    .then((resp) => resp.json())
    .then((gameRoomOpts: GameRoomOption[]) => {
        gameRoomOpts.forEach(opt => {
            let option: HTMLOptionElement = document.createElement('option');
            option.setAttribute('value', opt.endpoint);
            option.innerHTML = opt.name;
            inputs.menu.add(option);
        });
        inputs.menu.disabled = false;
    });

let gameInstance: GameInstance = new GameInstance(gameCanvas, inputs);
let linker: Linker = new Linker(gameInstance);
gameInstance.start(linker);