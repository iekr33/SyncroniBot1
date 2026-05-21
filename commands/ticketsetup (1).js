// commands/ticketsetup.js
// Publica el embed con botón para abrir tickets en un canal.
// Solo puede usarlo un administrador.
'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Publica el panel de tickets en un canal. [Admin]')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt
        .setName('canal')
        .setDescription('Canal donde se publicará el panel de tickets.')
        .setRequired(true),
    )
    .addStringOption(opt =>
      opt
        .setName('descripcion')
        .setDescription('Texto personalizado del panel (opcional).')
        .setRequired(false)
        .setMaxLength(500),
    ),

  async execute(interaction) {
    const canal       = interaction.options.getChannel('canal');
    const descripcion = interaction.options.getString('descripcion') ??
      'Si necesitas ayuda o tienes alguna consulta, abre un ticket y el equipo de soporte te atenderá en privado.';

    const embed = new EmbedBuilder()
      .setColor(colors.primary)
      .setTitle('🎫 Sistema de Tickets')
      .setDescription(descripcion)
      .setFooter({ text: 'SyncronyBot — Soporte' })
      .setTimestamp();

    const fila = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_abrir')
        .setLabel('📩 Abrir ticket')
        .setStyle(ButtonStyle.Primary),
    );

    await canal.send({ embeds: [embed], components: [fila] });

    console.log(`[Ticket] ${interaction.user.tag} publicó el panel en #${canal.name}`);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setDescription(`✅ Panel de tickets publicado en ${canal}.`),
      ],
      ephemeral: true,
    });
  },
};
