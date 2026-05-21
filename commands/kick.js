// commands/kick.js
// Expulsa a un miembro del servidor. Solo accesible para administradores.

'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Expulsa a un miembro del servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('El miembro que deseas expulsar.')
        .setRequired(true),
    )
    .addStringOption(option =>
      option
        .setName('razon')
        .setDescription('Motivo de la expulsión (opcional).')
        .setRequired(false),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // Verificación de permisos en tiempo de ejecución
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        content: 'No tienes permisos para expulsar miembros.',
        ephemeral: true,
      });
    }

    const target = interaction.options.getMember('usuario');
    const razon  = interaction.options.getString('razon') ?? 'Sin motivo especificado.';

    // Validaciones previas
    if (!target) {
      return interaction.reply({ content: 'No se encontró al usuario en el servidor.', ephemeral: true });
    }

    if (target.id === interaction.user.id) {
      return interaction.reply({ content: 'No puedes expulsarte a ti mismo.', ephemeral: true });
    }

    if (!target.kickable) {
      return interaction.reply({
        content: 'No puedo expulsar a este usuario. Puede que tenga un rol superior al mío.',
        ephemeral: true,
      });
    }

    try {
      await target.kick(razon);

      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('Miembro expulsado')
        .addFields(
          { name: 'Usuario',    value: `${target.user.tag} (${target.id})`, inline: false },
          { name: 'Motivo',     value: razon,                                inline: false },
          { name: 'Ejecutado por', value: interaction.user.tag,             inline: false },
        )
        .setThumbnail(target.user.displayAvatarURL())
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

      console.log(`[Kick] ${interaction.user.tag} expulsó a ${target.user.tag} — Motivo: ${razon} (${interaction.guild.name})`);
    } catch (error) {
      console.error('[Kick] Error al expulsar usuario:', JSON.stringify(error, null, 2));
      await interaction.reply({
        content: 'Ocurrió un error al intentar expulsar al usuario.',
        ephemeral: true,
      });
    }
  },
};