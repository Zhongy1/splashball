const socket = io();

let obj = {
    name: 'xyz',
    x: 100,
    y: 50
}

socket.on('test-msg-1', (data) => {
    console.dir(data);
});

function sendMsg(msg) {
    socket.emit('test-send-1', msg);
}

function testSendObj() {
    socket.emit('test-send-1', obj);
}