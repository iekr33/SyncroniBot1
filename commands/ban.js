// commands/ban.js
// Banea permanentemente a un miembro del servidor. Solo accesible para administradores.

'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banea a un miembro del servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('El miembro que deseas banear.')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('razon')
        .setDescription('Motivo del baneo (opcional).')
        .setRequired(false),
    )
    .addIntegerOption(option =>
      option
        .setName('borrar_mensajes')
        .setDescription('Días de historial de mensajes a eliminar (0-7). Por defecto: 0.')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // Verificación de permisos en tiempo de ejecución
    if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return interaction.reply({
        content: 'No tienes permisos para banear miembros.',
        ephemeral: true,
      });
    }

    const target       = interaction.options.getMember('usuario');
    const razon        = interaction.options.getString('razon') ?? 'Sin motivo especificado.';
    const deleteDays   = interaction.options.getInteger('borrar_mensajes') ?? 0;

    // Validaciones
    if (!target) {
      return interaction.reply({ content: 'No se encontró al usuario en el servidor.', ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'No puedes banearte a ti mismo.', ephemeral: true });
    }

    if (!target.bannable) {
      return interaction.reply({
        content: 'No puedo banear a este usuario. Puede que tenga un rol superior al mío.',
        ephemeral: true,
      });
    }

    try {
      await target.ban({ reason: razon, deleteMessageDays: deleteDays });

      const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setTitle('Miembro baneado')
        .addFields(
          { name: 'Usuario',            value: `${target.user.tag} (${target.id})`, inline: false },
          { name: 'Motivo',             value: razon,                                inline: false },
          { name: 'Mensajes eliminados', value: `Últimos ${deleteDays} día(s)`,      inline: false },
          { name: 'Ejecutado por',      value: interaction.user.tag,                 inline: false },
        )
        .setThumbnail(target.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      console.log(`[Ban] ${interaction.user.tag} baneó a ${target.user.tag} — Motivo: ${razon} (${interaction.guild.name})`);
    } catch (error) {
      console.error('[Ban] Error al banear usuario:', error);
      await interaction.reply({
        content: 'Ocurrió un error al intentar banear al usuario.',
        ephemeral: true,
      });
    }
  },
};
