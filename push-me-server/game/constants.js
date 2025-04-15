// game/constants.js
// Grid configuration
const gridSize = 25;

// Define available skins for human players and the bot skin.
const availableSkins = ['😭', '😫', '😳', '😨'];
const botSkin = '🤖';

// Store connected players (humans and bot).
const players = {};

module.exports = {
    gridSize,
    availableSkins,
    botSkin,
    players,
};
