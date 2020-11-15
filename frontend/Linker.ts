import { io } from 'socket.io-client';
import { SetupData } from '../shared/models';

export class Linker {
    public socket;

    constructor() {
        this.socket = io();
        this.initListeners();
    }

    private initListeners() {
        this.socket.on('connect', () => {
            console.log('connected');
        });
        this.socket.on('setup-data', (data: SetupData) => {

        });
    }
}