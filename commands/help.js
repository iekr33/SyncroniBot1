// commands/help.js
// Muestra la lista de comandos disponibles con su descripción.
'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

/** Lista estática de comandos. Se actualiza manualmente al agregar nuevos comandos. */
const COMMAND_LIST = [
  { name: '/ask',      description: 'Hace una pregunta a la IA integrada del bot.' },
  { name: '/ban',      description: 'Banea a un miembro del servidor. [Admin]' },
  { name: '/clear',    description: 'Elimina un número determinado de mensajes del canal. [Admin]' },
  { name: '/help',     description: 'Muestra este panel de ayuda.' },
  { name: '/kick',     description: 'Expulsa a un miembro del servidor. [Admin]' },
  { name: '/pause',    description: 'Pausa o reanuda la canción actual.' },
  { name: '/ping',     description: 'Muestra la latencia del bot y de la API de Discord.' },
  { name: '/play',     description: 'Reproduce una canción o añádela a la cola.' },
  { name: '/poll',     description: 'Crea una encuesta en el canal.' },
  { name: '/queue',    description: 'Muestra la cola de reproducción actual.' },
  { name: '/rango',    description: 'Muestra tu rango o el de otro miembro.' },
  { name: '/resumen',  description: 'Genera un resumen de los últimos mensajes del canal.' },
  { name: '/skip',     description: 'Salta a la siguiente canción de la cola.' },
  { name: '/stop',     description: 'Detiene la reproducción y vacía la cola.' },
  { name: '/traducir', description: 'Traduce un mensaje al idioma que quieras usando IA.' },
  { name: '/wiki',     description: 'Busca información en Wikipedia.' },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles en SyncronyBot.'),
  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const fields = COMMAND_LIST.map(cmd => ({
      name:   cmd.name,
      value:  cmd.description,
      inline: false,
    }));
    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle('SyncronyBot — Panel de ayuda')
      .setDescription('A continuación se listan todos los comandos disponibles.')
      .addFields(fields)
      .setFooter({ text: 'Los comandos marcados con [Admin] requieren permisos de administrador.' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};