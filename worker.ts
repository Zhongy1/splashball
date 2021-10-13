import * as express from 'express';
import * as http from 'http';
import { Broker } from './backend/Broker';
import { GameRoom } from './backend/GameRoom';


if (process.argv.includes('-p')) {
    let tempPort: number = Number(process.argv[process.argv.indexOf('-p') + 1]);
    if (!isNaN(tempPort)) {
        var port = tempPort;
    }
}

if (!port) {
    throw "\x1b[31m\x1b[1m[Worker]\x1b[0m No port specified for worker. Aborting!"
}


const app = express();
const httpServer = http.createServer(app);


const gameRoom: GameRoom = new GameRoom();
const broker: Broker = new Broker(httpServer, gameRoom);
gameRoom.start(broker);

httpServer.listen(port, () => {
    console.log(`\x1b[32m\x1b[1m[Worker]\x1b[0m Game room spawned on port ${port}`);
});