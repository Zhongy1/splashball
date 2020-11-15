import socketio

# standard Python
sio = socketio.Client()


@sio.event
def connect():
    print("I'm connected!")


@sio.on('init-connection')
def on_message(data):
    print(data)


sio.connect('http://localhost:3000')
