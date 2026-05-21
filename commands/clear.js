// commands/clear.js
// Elimina en masa mensajes de un canal de texto. Exclusivo para administradores.

'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { colors, maxClearMessages } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina un número determinado de mensajes del canal actual.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(option =>
      option
        .setName('cantidad')
        .setDescription(`Número de mensajes a eliminar (1 - ${maxClearMessages}).`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(maxClearMessages),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad');

    // Verificación de permisos en tiempo de ejecución (doble capa de seguridad)
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: 'No tienes permisos para usar este comando.',
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // bulk delete solo funciona con mensajes menores a 14 días
      const deleted = await interaction.channel.bulkDelete(cantidad, true);

      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle('Mensajes eliminados')
        .setDescription(`Se han eliminado **${deleted.size}** mensaje(s) correctamente.`)
        .setFooter({ text: `Ejecutado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

      console.log(`[Clear] ${interaction.user.tag} eliminó ${deleted.size} mensaje(s) en #${interaction.channel.name} (${interaction.guild.name})`);
    } catch (error) {
      console.error('[Clear] Error al eliminar mensajes:', error);

      await interaction.editReply({
        content: 'Ocurrió un error al intentar eliminar los mensajes. Asegúrate de que los mensajes no sean de hace más de 14 días.',
      });
    }
  },
};
