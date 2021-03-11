import { GameInstance } from "./GameInstance";
import { Linker } from "./Linker";

export interface ClientComponents {
    entry: HTMLDivElement
    username: HTMLInputElement,
    submit: HTMLButtonElement
}

let gameCanvas: HTMLCanvasElement = document.getElementById('game') as HTMLCanvasElement;
let inputs: ClientComponents = {
    entry: document.querySelector('.entry-screen') as HTMLDivElement,
    username: document.getElementById('username') as HTMLInputElement,
    submit: document.getElementById('submit') as HTMLButtonElement
}
let gameInstance: GameInstance = new GameInstance(gameCanvas, inputs);
let linker: Linker = new Linker(gameInstance);
gameInstance.start(linker);
// linker.spawnPlayer('Alex')
//     .then((id)=>{
//         console.log(id);
//     },(err)=>{
//         console.log(err);
//     });