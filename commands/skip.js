// commands/skip.js
// Salta la canción actual y reproduce la siguiente en la cola.

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { serverQueues } = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta la canción actual y reproduce la siguiente.'),

  async execute(interaction) {
    const serverQueue = serverQueues.get(interaction.guild.id);

    if (!serverQueue || serverQueue.songs.length === 0) {
      return interaction.reply({ content: 'No hay ninguna canción reproduciéndose.', ephemeral: true });
    }

    if (!interaction.member.voice.channel) {
      return interaction.reply({ content: 'Debes estar en un canal de voz para usar este comando.', ephemeral: true });
    }

    const skipped = serverQueue.songs[0].title;
    serverQueue.player.stop(); // Dispara el evento Idle que reproduce la siguiente

    const embed = new EmbedBuilder()
      .setColor(colors.warning)
      .setDescription(`Canción saltada: **${skipped}**`)
      .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

    await interaction.reply({ embeds: [embed] });
    console.log(`[Skip] ${interaction.user.tag} saltó: ${skipped}`);
  },
};
