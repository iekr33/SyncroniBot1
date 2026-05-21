// commands/ticket.js
// Sistema de tickets: abre ticket con /ticket o botón, cierra con botón.
// Requiere que el rol TICKET_STAFF_ROLE_ID esté definido en .env
'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const { colors } = require('../config/config');

// ─── Configuración ───────────────────────────────────────────────────────────
const STAFF_ROLE_ID      = process.env.TICKET_STAFF_ROLE_ID;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const LOG_CHANNEL_ID     = process.env.TICKET_LOG_CHANNEL_ID;
// ─────────────────────────────────────────────────────────────────────────────

async function crearTicket(guild, member, motivo) {
  const nombreCanal = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  const existente = guild.channels.cache.find(
    c => c.name === nombreCanal && c.topic?.startsWith('TICKET_OWNER:'),
  );
  if (existente) return { canal: null, existente };

  // ⚠️ Usar siempre IDs en string, nunca objetos de rol/miembro
  const permissionOverwrites = [
    {
      id:   guild.id,          // guild.id == @everyone
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id:    member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    },
    {
      id:    guild.client.user.id,   // ID del bot, siempre disponible
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
    },
  ];

  if (STAFF_ROLE_ID) {
    permissionOverwrites.push({
      id:    STAFF_ROLE_ID,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
    });
  }

  const canal = await guild.channels.create({
    name:   nombreCanal,
    type:   ChannelType.GuildText,
    topic:  `TICKET_OWNER:${member.id}`,
    parent: TICKET_CATEGORY_ID ?? null,
    permissionOverwrites,
  });

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle('🎫 Ticket abierto')
    .setDescription(
      `Hola ${member}, el equipo de soporte te atenderá en breve.\n\n` +
      (motivo ? `**Motivo:** ${motivo}\n\n` : '') +
      'Cuando se resuelva tu consulta, cierra el ticket con el botón de abajo.',
    )
    .setFooter({ text: `Abierto por ${member.user.tag}` })
    .setTimestamp();

  const fila = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_cerrar')
      .setLabel('🔒 Cerrar ticket')
      .setStyle(ButtonStyle.Danger),
  );

  await canal.send({
    content:    STAFF_ROLE_ID ? `<@&${STAFF_ROLE_ID}>` : '',
    embeds:     [embed],
    components: [fila],
  });

  return { canal, existente: null };
}

// ─── Comando /ticket ──────────────────────────────────────────────────────────
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Abre un ticket de soporte privado.')
    .addStringOption(opt =>
      opt
        .setName('motivo')
        .setDescription('Describe brevemente tu consulta (opcional).')
        .setRequired(false)
        .setMaxLength(200),
    ),

  async execute(interaction) {
    const motivo = interaction.options.getString('motivo') ?? '';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { canal, existente } = await crearTicket(interaction.guild, interaction.member, motivo);

    if (existente) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.warning ?? 0xfee75c)
            .setDescription(`Ya tienes un ticket abierto: ${existente}`),
        ],
      });
    }

    if (LOG_CHANNEL_ID) {
      const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
      logCh?.send({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.info)
            .setTitle('📋 Nuevo ticket')
            .addFields(
              { name: 'Usuario', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
              { name: 'Canal',   value: `${canal}`, inline: true },
              { name: 'Motivo',  value: motivo || 'Sin especificar' },
            )
            .setTimestamp(),
        ],
      });
    }

    console.log(`[Ticket] ${interaction.user.tag} abrió ${canal.name}`);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.primary)
          .setDescription(`✅ Tu ticket ha sido creado: ${canal}`),
      ],
    });
  },

  // ─── Manejador de botones ─────────────────────────────────────────────────
  async handleButton(interaction) {

    // Botón: abrir ticket desde el panel
    if (interaction.customId === 'ticket_abrir') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const { canal, existente } = await crearTicket(interaction.guild, interaction.member, '');

      if (existente) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.warning ?? 0xfee75c)
              .setDescription(`Ya tienes un ticket abierto: ${existente}`),
          ],
        });
      }

      if (LOG_CHANNEL_ID) {
        const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        logCh?.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.info)
              .setTitle('📋 Nuevo ticket')
              .addFields(
                { name: 'Usuario', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
                { name: 'Canal',   value: `${canal}`, inline: true },
                { name: 'Motivo',  value: 'Abierto desde el panel' },
              )
              .setTimestamp(),
          ],
        });
      }

      console.log(`[Ticket] ${interaction.user.tag} abrió ${canal.name} (botón)`);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.primary)
            .setDescription(`✅ Tu ticket ha sido creado: ${canal}`),
        ],
      });
    }

    // Botón: cerrar ticket
    if (interaction.customId === 'ticket_cerrar') {
      const canal   = interaction.channel;
      const topic   = canal.topic ?? '';
      const ownerId = topic.replace('TICKET_OWNER:', '');

      const esOwner = interaction.user.id === ownerId;
      const esStaff = STAFF_ROLE_ID
        ? interaction.member.roles.cache.has(STAFF_ROLE_ID)
        : interaction.member.permissions.has(PermissionFlagsBits.ManageChannels);

      if (!esOwner && !esStaff) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.error ?? 0xed4245)
              .setDescription('❌ No tienes permiso para cerrar este ticket.'),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.error ?? 0xed4245)
            .setDescription('🔒 Cerrando ticket en 5 segundos...'),
        ],
      });

      if (LOG_CHANNEL_ID) {
        const logCh = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
        logCh?.send({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.error ?? 0xed4245)
              .setTitle('🔒 Ticket cerrado')
              .addFields(
                { name: 'Canal',       value: canal.name,            inline: true },
                { name: 'Cerrado por', value: interaction.user.tag,  inline: true },
              )
              .setTimestamp(),
          ],
        });
      }

      console.log(`[Ticket] ${interaction.user.tag} cerró ${canal.name}`);

      setTimeout(() => canal.delete().catch(() => {}), 5000);
    }
  },
};