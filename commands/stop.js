// commands/stop.js
// Detiene la reproducción, vacía la cola y desconecta el bot del canal de voz.

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { serverQueues } = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Detiene la música y desconecta el bot del canal de voz.'),

  async execute(interaction) {
    const serverQueue = serverQueues.get(interaction.guild.id);

    if (!serverQueue) {
      return interaction.reply({ content: 'No hay ninguna canción reproduciéndose.', ephemeral: true });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    }

    serverQueue.songs = [];
    serverQueue.player.stop();
    serverQueue.connection.destroy();
    serverQueues.delete(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setColor(colors.error)
      .setDescription('Reproducción detenida. El bot se ha desconectado del canal de voz.')
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    console.log(`[Stop] ${interaction.user.tag} detuvo la reproducción en "${interaction.guild.name}"`);
  },
};
