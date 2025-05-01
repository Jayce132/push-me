require('dotenv').config();


const ArenaServer = require('./server/ArenaServer');
const LobbyServer = require('./server/LobbyServer');

// shared config
const gridSize       = 25;
const availableSkins = ['😂', '🤣', '😍', '😭', '😎', '😒', '😝', '😳', '🤪', '🤬', '😏', '😃', '🥺', '😨', '🥲', '🤯', '🤠', '😤', '🤥', '🤨', '🤓', '🥶', '😶‍🌫️', '🫠', '🫥', '😵‍💫', '😴', '🤡', '🤢'];
const botSkin        = '🤖';

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const MODE = process.env.MODE;
const PORT = parseInt(process.env.PORT, 10)
    || (MODE === 'lobby' ? 3001 : 3000);

if (MODE === 'lobby') {
    new LobbyServer(PORT, { gridSize, availableSkins, botSkin, clientOrigin: CLIENT_ORIGIN })
        .start();
    console.log(`→ LobbyServer started on port ${PORT}`);
}
else if (MODE === 'arena') {
    new ArenaServer(PORT, { gridSize, availableSkins, clientOrigin: CLIENT_ORIGIN })
        .start();
    console.log(`→ ArenaServer started on port ${PORT}`);
}
else {
    console.error('❌  .env must set MODE=lobby or MODE=arena');
    process.exit(1);
}
