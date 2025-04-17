// index.js
const GameServer = require('./server/GameServer');
const LobbyServer = require('./server/LobbyServer');

// Grid configuration
const gridSize = 25;

// Define available skins for human players and the bot skin.
const availableSkins = ['😭', '😫', '😳', '😨'];
const botSkin = '🤖';


const game = new GameServer(3000, { gridSize, availableSkins, botSkin });
const lobby = new LobbyServer(3001, { gridSize, availableSkins, botSkin });

game.start();
lobby.start();
