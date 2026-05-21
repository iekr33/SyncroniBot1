// commands/ping.js
// Comprueba la latencia del bot y la API de Discord.

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  // Definición del slash command
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Comprueba la latencia del bot y de la API de Discord.'),

  /**
   * Lógica de ejecución del comando.
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // Primera respuesta diferida para medir el round-trip
    await interaction.deferReply();

    const apiLatency  = Math.round(interaction.client.ws.ping);
    const botLatency  = Date.now() - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle('Estado de conexión')
      .addFields(
        { name: 'Latencia del bot',  value: `${botLatency} ms`,  inline: true },
        { name: 'Latencia de la API', value: `${apiLatency} ms`, inline: true },
      )
      .setFooter({ text: 'SyncronyBot' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
