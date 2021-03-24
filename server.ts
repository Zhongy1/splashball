
import * as express from 'express';
import * as http from 'http';
import * as serveStatic from 'serve-static';
import * as path from 'path';
import * as util from 'util';
import { Temp } from './temp';
import { Broker } from './backend/Broker';
import { GameRoom } from './backend/GameRoom';


const app = express();
const httpServer = http.createServer(app);
// const io = socketio(httpServer, {
//     pingTimeout: 10000
// });


app.use(serveStatic(path.resolve(__dirname, 'public')));


const gameRoom: GameRoom = new GameRoom();
const broker: Broker = new Broker(httpServer, gameRoom);
gameRoom.start(broker);


httpServer.listen(process.env.PORT || 3000, () => {
    console.log(`Server ready`);
});

// var temp = new Temp();


// io.on('connection', (socket) => {
//     console.log('got connection');
//     socket.on('test-send-1', (data) => {
//         console.log(data);
//     });
//     socket.emit('init-connection', temp.data);
// });



// setInterval(() => {
//     io.sockets.emit('test-msg-1', 'foo');
// }, 3000);