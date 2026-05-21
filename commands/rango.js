// commands/rango.js
// Crea nuevos roles en el servidor y los otorga a usuarios.
// Solo accesible para administradores.

'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rango')
    .setDescription('Gestiona rangos/roles del servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('crear')
        .setDescription('Crea un nuevo rango/rol en el servidor.')
        .addStringOption(opt =>
          opt.setName('nombre')
            .setDescription('Nombre del rango.')
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption(opt =>
          opt.setName('color')
            .setDescription('Color en formato hexadecimal (ej: #FF5733). Por defecto: gris.')
            .setRequired(false),
        )
        .addBooleanOption(opt =>
          opt.setName('separado')
            .setDescription('¿Mostrar el rango separado en la lista de miembros? Por defecto: no.')
            .setRequired(false),
        )
        .addBooleanOption(opt =>
          opt.setName('mentionable')
            .setDescription('¿Permitir mencionar este rango? Por defecto: no.')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub
        .setName('otorgar')
        .setDescription('Otorga un rango existente a un usuario.')
        .addUserOption(opt =>
          opt.setName('usuario')
            .setDescription('El usuario al que otorgar el rango.')
            .setRequired(true),
        )
        .addRoleOption(opt =>
          opt.setName('rango')
            .setDescription('El rango a otorgar.')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('razon')
            .setDescription('Motivo (opcional).')
            .setRequired(false),
        ),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    // Verificación de permisos en tiempo de ejecución
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return interaction.reply({
        content: 'No tienes permisos para gestionar rangos.',
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'crear') {
      await handleCrear(interaction);
    } else if (subcommand === 'otorgar') {
      await handleOtorgar(interaction);
    }
  },
};

/**
 * Crea un nuevo rol en el servidor.
 */
async function handleCrear(interaction) {
  const nombre      = interaction.options.getString('nombre');
  const colorHex    = interaction.options.getString('color') ?? '#99AAB5';
  const separado    = interaction.options.getBoolean('separado') ?? false;
  const mentionable = interaction.options.getBoolean('mentionable') ?? false;

  // Validar formato del color
  const colorRegex = /^#[0-9A-Fa-f]{6}$/;
  if (!colorRegex.test(colorHex)) {
    return interaction.reply({
      content: 'El color debe estar en formato hexadecimal válido. Ejemplo: `#FF5733`',
      ephemeral: true,
    });
  }

  // Verificar que no exista ya un rol con ese nombre
  const existente = interaction.guild.roles.cache.find(
    r => r.name.toLowerCase() === nombre.toLowerCase(),
  );
  if (existente) {
    return interaction.reply({
      content: `Ya existe un rango con el nombre **${nombre}**.`,
      ephemeral: true,
    });
  }

  try {
    const nuevoRol = await interaction.guild.roles.create({
      name:        nombre,
      color:       colorHex,
      hoist:       separado,
      mentionable: mentionable,
      reason:      `Creado por ${interaction.user.tag} usando /rango crear`,
    });

    const embed = new EmbedBuilder()
      .setColor(parseInt(colorHex.replace('#', ''), 16))
      .setTitle('Rango creado')
      .addFields(
        { name: 'Nombre',       value: nuevoRol.name,              inline: true },
        { name: 'Color',        value: colorHex.toUpperCase(),     inline: true },
        { name: 'ID',           value: nuevoRol.id,                inline: true },
        { name: 'Separado',     value: separado ? 'Sí' : 'No',    inline: true },
        { name: 'Mencionable',  value: mentionable ? 'Sí' : 'No', inline: true },
      )
      .setFooter({ text: `Creado por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    console.log(`[Rango] ${interaction.user.tag} creó el rango "${nombre}" en "${interaction.guild.name}"`);

  } catch (error) {
    console.error('[Rango] Error al crear rango:', error);
    await interaction.reply({
      content: 'Ocurrió un error al crear el rango. Verifica que el bot tenga permisos para gestionar roles.',
      ephemeral: true,
    });
  }
}

/**
 * Otorga un rol existente a un usuario.
 */
async function handleOtorgar(interaction) {
  const target = interaction.options.getMember('usuario');
  const rol    = interaction.options.getRole('rango');
  const razon  = interaction.options.getString('razon') ?? 'Sin motivo especificado.';

  if (!target) {
    return interaction.reply({ content: 'No se encontró al usuario en el servidor.', ephemeral: true });
  }

  // Verificar que el bot puede gestionar ese rol (jerarquía)
  const botMember = interaction.guild.members.me;
  if (rol.position >= botMember.roles.highest.position) {
    return interaction.reply({
      content: 'No puedo otorgar ese rango porque es igual o superior al mío en la jerarquía.',
      ephemeral: true,
    });
  }

  // Verificar si el usuario ya tiene el rol
  if (target.roles.cache.has(rol.id)) {
    return interaction.reply({
      content: `**${target.user.tag}** ya tiene el rango **${rol.name}**.`,
      ephemeral: true,
    });
  }

  try {
    await target.roles.add(rol, razon);

    const embed = new EmbedBuilder()
      .setColor(rol.color || colors.success)
      .setTitle('Rango otorgado')
      .addFields(
        { name: 'Usuario', value: `${target.user.tag} (${target.id})`, inline: false },
        { name: 'Rango',   value: `${rol.name} (${rol.id})`,           inline: false },
        { name: 'Motivo',  value: razon,                                inline: false },
      )
      .setThumbnail(target.user.displayAvatarURL())
      .setFooter({ text: `Otorgado por ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    console.log(`[Rango] ${interaction.user.tag} otorgó "${rol.name}" a ${target.user.tag} en "${interaction.guild.name}"`);

  } catch (error) {
    console.error('[Rango] Error al otorgar rango:', error);
    await interaction.reply({
      content: 'Ocurrió un error al otorgar el rango.',
      ephemeral: true,
    });
  }
}
