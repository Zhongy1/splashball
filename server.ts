
import * as express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as http from 'http';
import * as serveStatic from 'serve-static';
import * as path from 'path';
// import { Broker } from './backend/Broker';
// import { GameRoom } from './backend/GameRoom';
import { spawn, fork } from 'child_process';
import { CONFIG } from './shared/config';
import { GameRoomOption } from './shared/models';

let gameRoomOptions: GameRoomOption[] = [];
for (let i = 1; i <= CONFIG.NUM_GAME_ROOMS; i++) {
    gameRoomOptions.push({
        name: `Game Room ${i}`,
        endpoint: `gr-${i}`
    });
}

const app = express();
const httpServer = http.createServer(app);


app.use(serveStatic(path.resolve(__dirname, 'public')));
app.get('/game-rooms', (req, res) => res.json(gameRoomOptions));


let port = 3000;
if (process.argv.includes('-p')) {
    let tempPort: number = Number(process.argv[process.argv.indexOf('-p') + 1]);
    if (!isNaN(tempPort)) {
        port = tempPort;
    }
}

httpServer.listen(port, () => {
    console.log(`\x1b[34m\x1b[1m[Master]\x1b[0m Http server started on port ${port}`);
    spawnWorkers(CONFIG.NUM_GAME_ROOMS);
});

function spawnWorkers(num: Number): void {
    for (let i = 0; i < num; i++) {
        let p = port + i + 1;
        let worker = fork('worker.ts', ['-p', `${p}`]);

        app.use(`/gr-${i + 1}`, createProxyMiddleware(`/gr-${i + 1}`, {
            target: `http://localhost:${p}`,
            ws: true,
            logLevel: 'silent'
        }));
    }
}