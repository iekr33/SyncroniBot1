// events/ready.js
// Se ejecuta una sola vez cuando el bot se conecta correctamente a Discord.

'use strict';

const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true, // Este evento solo debe dispararse una vez

  /**
   * @param {import('discord.js').Client} client
   */
  execute(client) {
    console.log('─────────────────────────────────────────');
    console.log(`[Ready] SyncronyBot conectado como: ${client.user.tag}`);
    console.log(`[Ready] Servidores activos: ${client.guilds.cache.size}`);
    console.log('─────────────────────────────────────────');

    // Establece la actividad visible del bot en Discord
    client.user.setPresence({
      activities: [{ name: 'Gestionando el servidor', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
