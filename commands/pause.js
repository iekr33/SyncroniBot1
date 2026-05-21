// commands/pause.js
// Pausa o reanuda la canción actual.

'use strict';

const { SlashCommandBuilder, EmbedBuilder, AudioPlayerStatus } = require('discord.js');
const { AudioPlayerStatus: PlayerStatus } = require('@discordjs/voice');
const { colors } = require('../config/config');
const { serverQueues } = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa o reanuda la canción actual.'),

  async execute(interaction) {
    const serverQueue = serverQueues.get(interaction.guild.id);

    if (!serverQueue || serverQueue.songs.length === 0) {
      return interaction.reply({ content: 'No hay ninguna canción reproduciéndose.', ephemeral: true });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    }

    const player = serverQueue.player;

    if (player.state.status === PlayerStatus.Playing) {
      player.pause();
      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setDescription('Reproducción pausada. Usa `/pause` de nuevo para reanudar.')
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });
      return interaction.reply({ embeds: [embed] });
    }

    if (player.state.status === PlayerStatus.Paused) {
      player.unpause();
      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setDescription(`Reproducción reanudada: **${serverQueue.songs[0].title}**`)
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });
      return interaction.reply({ embeds: [embed] });
    }

    await interaction.reply({ content: 'No hay ninguna canción activa en este momento.', ephemeral: true });
  },
};
