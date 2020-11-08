// Entry point file for running the paintball front end

import io from 'socket.io-client';
import Grid from './Grid';

// Initialize canvas and socket
const canvas: HTMLCanvasElement = document.querySelector('#grid');
const ctx = canvas.getContext('2d');
const socket = io();

// On successful connection
socket.on('connect', () => console.log('connected'));

// Received init data
socket.on('init-connection', data => {
    const grid = new Grid(data.hexGrid, 20, -60);   // shapeL should be sent by the server
    grid.draw(ctx);
});


// https://www.redblobgames.com/grids/hexagons/
