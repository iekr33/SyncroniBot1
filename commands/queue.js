// commands/queue.js
// Muestra la cola de canciones actual.

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');
const { serverQueues } = require('./play');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de canciones actual.'),

  async execute(interaction) {
    const serverQueue = serverQueues.get(interaction.guild.id);

    if (!serverQueue || serverQueue.songs.length === 0) {
      return interaction.reply({ content: 'La cola está vacía.', ephemeral: true });
    }

    const current = serverQueue.songs[0];
    const upcoming = serverQueue.songs.slice(1, 11); // Mostrar máximo 10 siguientes

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle('Cola de reproducción')
      .addFields({
        name: 'Reproduciendo ahora',
        value: `**${current.title}** (${current.duration}) — Solicitado por ${current.requestedBy}`,
      });

    if (upcoming.length > 0) {
      const list = upcoming
        .map((s, i) => `**${i + 1}.** ${s.title} (${s.duration}) — ${s.requestedBy}`)
        .join('\n');
      embed.addFields({ name: `Próximas canciones (${upcoming.length})`, value: list });
    }

    if (serverQueue.songs.length > 11) {
      embed.setFooter({ text: `Y ${serverQueue.songs.length - 11} más en la cola...` });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
