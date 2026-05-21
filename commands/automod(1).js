// commands/automod.js
// Permite a los administradores gestionar la lista de palabras prohibidas en tiempo real.

'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../config/config');

// Importar la lista de palabras desde el evento para mantenerlas sincronizadas
const automodEvent = require('../events/automod');

// Acceso directo a la lista exportada (ver nota al final del archivo)
let palabrasProhibidas = [
  'casino', 'sexo', 'politica', 'política',
  'pornografía', 'pornografia', 'apuestas', 'drogas',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Gestiona la lista de palabras prohibidas.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('lista')
        .setDescription('Muestra las palabras prohibidas actualmente.'),
    )
    .addSubcommand(sub =>
      sub
        .setName('añadir')
        .setDescription('Añade una palabra a la lista de prohibidas.')
        .addStringOption(opt =>
          opt.setName('palabra')
            .setDescription('Palabra a prohibir.')
            .setRequired(true),
        ),
    )
    .addSubcommand(sub =>
      sub
        .setName('eliminar')
        .setDescription('Elimina una palabra de la lista de prohibidas.')
        .addStringOption(opt =>
          opt.setName('palabra')
            .setDescription('Palabra a eliminar de la lista.')
            .setRequired(true),
        ),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'No tienes permisos para gestionar la automoderación.', ephemeral: true });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'lista') {
      const embed = new EmbedBuilder()
        .setColor(colors.info)
        .setTitle('Palabras prohibidas activas')
        .setDescription(
          palabrasProhibidas.length > 0
            ? palabrasProhibidas.map(p => `- \`${p}\``).join('\n')
            : 'No hay palabras prohibidas configuradas.',
        )
        .setFooter({ text: `Total: ${palabrasProhibidas.length} palabra(s)` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const palabra = interaction.options.getString('palabra').toLowerCase().trim();

    if (sub === 'añadir') {
      if (palabrasProhibidas.includes(palabra)) {
        return interaction.reply({ content: `La palabra \`${palabra}\` ya está en la lista.`, ephemeral: true });
      }
      palabrasProhibidas.push(palabra);

      // Sincronizar con el evento de automoderación
      automodEvent.actualizarPalabras(palabrasProhibidas);

      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setDescription(`Palabra \`${palabra}\` añadida a la lista de prohibidas.`)
        .setFooter({ text: `Modificado por ${interaction.user.tag}` });

      console.log(`[AutoMod] ${interaction.user.tag} añadió la palabra prohibida: "${palabra}"`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'eliminar') {
      if (!palabrasProhibidas.includes(palabra)) {
        return interaction.reply({ content: `La palabra \`${palabra}\` no está en la lista.`, ephemeral: true });
      }
      palabrasProhibidas = palabrasProhibidas.filter(p => p !== palabra);

      // Sincronizar con el evento de automoderación
      automodEvent.actualizarPalabras(palabrasProhibidas);

      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setDescription(`Palabra \`${palabra}\` eliminada de la lista de prohibidas.`)
        .setFooter({ text: `Modificado por ${interaction.user.tag}` });

      console.log(`[AutoMod] ${interaction.user.tag} eliminó la palabra prohibida: "${palabra}"`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },
};
