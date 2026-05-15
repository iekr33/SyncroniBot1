// deploy-commands.js
'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { token, clientId, guildId } = require('./config/config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
  console.log(`[Deploy] Cargando archivo: ${file}`);

  try {
    const command = require(path.join(commandsPath, file));

    // 🔴 Validación REAL
    if (!command || !command.data || !command.execute) {
      console.log(`[Deploy] ❌ ${file} NO exporta data o execute`);
      continue;
    }

    commands.push(command.data.toJSON());
    console.log(`[Deploy] ✅ Preparado: /${command.data.name}`);

  } catch (err) {
    console.log(`[Deploy] ❌ Error en ${file}:`, err.message);
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log(`[Deploy] Registrando ${commands.length} comando(s)...`);

    let data;

    if (guildId) {
      data = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );

      console.log(`[Deploy] ${data.length} comando(s) en servidor (GUILD).`);
    } else {
      data = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );

      console.log(`[Deploy] ${data.length} comando(s) globales.`);
    }

  } catch (error) {
    console.error('[Deploy] ERROR CRÍTICO:', error);
  }
})();
