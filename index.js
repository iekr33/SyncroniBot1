'use strict';

require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const path = require('path');
const fs   = require('fs');
const { token } = require('./config/config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates, // ← NECESARIO para detectar canales de voz
  ],
});

client.commands = new Collection();

// =========================
// CARGAR COMANDOS
// =========================
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if (!command.data || !command.execute) {
    console.warn(`[Loader] El archivo "${file}" no exporta "data" o "execute". Se omite.`);
    continue;
  }

  client.commands.set(command.data.name, command);
  console.log(`[Loader] Comando cargado: /${command.data.name}`);
}

// =========================
// CARGAR EVENTOS
// =========================
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }

  console.log(`[Loader] Evento registrado: ${event.name}`);
}

// =========================
// MANEJO DE ERRORES
// =========================
process.on('unhandledRejection', error => {
  console.error('[Process] Promesa rechazada no controlada:', error);
});

// =========================
// LOGIN DEL BOT
// =========================
client.login(token).catch(error => {
  console.error('[Login] No se pudo iniciar sesión en Discord:', error.message);
  process.exit(1);
});