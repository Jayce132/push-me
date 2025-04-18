// index.js
const ArenaServer = require('./server/ArenaServer');
const LobbyServer = require('./server/LobbyServer');

// Grid configuration
const gridSize = 25;

// Define available skins for human players and the bot skin.
const availableSkins = ['😭', '😫', '😳', '😨'];
const botSkin = '🤖';


const arena = new ArenaServer(3000, { gridSize, availableSkins, botSkin });
const lobby = new LobbyServer(3001, { gridSize, availableSkins, botSkin });

arena.start();
lobby.start();
