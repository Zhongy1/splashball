
import * as express from 'express';
import * as http from 'http';
import * as serveStatic from 'serve-static';
import * as path from 'path';
import { Broker } from './backend/Broker';
import { GameRoom } from './backend/GameRoom';


const app = express();
const httpServer = http.createServer(app);


app.use(serveStatic(path.resolve(__dirname, 'public')));


const gameRoom: GameRoom = new GameRoom();
const broker: Broker = new Broker(httpServer, gameRoom);
gameRoom.start(broker);

let port = 3000;
if (process.argv.includes('-p')) {
    let tempPort: number = Number(process.argv[process.argv.indexOf('-p') + 1]);
    if (!isNaN(tempPort)) {
        port = tempPort;
    }
}

httpServer.listen(port, () => {
    console.log(`Server ready`);
});