// commands/poll.js
// Crea encuestas en el servidor con hasta 5 opciones y duración configurable.

'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { colors } = require('../config/config');

// Emojis numéricos para las opciones
const EMOJI_OPTIONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Crea una encuesta en el canal actual.')
    .addStringOption(opt =>
      opt.setName('pregunta')
        .setDescription('Pregunta de la encuesta.')
        .setRequired(true)
        .setMaxLength(200),
    )
    .addStringOption(opt =>
      opt.setName('opcion1')
        .setDescription('Primera opción.')
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption(opt =>
      opt.setName('opcion2')
        .setDescription('Segunda opción.')
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption(opt =>
      opt.setName('opcion3')
        .setDescription('Tercera opción (opcional).')
        .setRequired(false)
        .setMaxLength(100),
    )
    .addStringOption(opt =>
      opt.setName('opcion4')
        .setDescription('Cuarta opción (opcional).')
        .setRequired(false)
        .setMaxLength(100),
    )
    .addStringOption(opt =>
      opt.setName('opcion5')
        .setDescription('Quinta opción (opcional).')
        .setRequired(false)
        .setMaxLength(100),
    )
    .addIntegerOption(opt =>
      opt.setName('duracion')
        .setDescription('Duración en minutos (opcional). Si no se especifica, la encuesta no expira.')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10080), // máximo 7 días
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {
    const pregunta  = interaction.options.getString('pregunta');
    const duracion  = interaction.options.getInteger('duracion') ?? null;

    // Recoger las opciones proporcionadas
    const opciones = [
      interaction.options.getString('opcion1'),
      interaction.options.getString('opcion2'),
      interaction.options.getString('opcion3'),
      interaction.options.getString('opcion4'),
      interaction.options.getString('opcion5'),
    ].filter(Boolean);

    // Construir la descripción con emojis y opciones
    const descripcion = opciones
      .map((op, i) => `${EMOJI_OPTIONS[i]} ${op}`)
      .join('\n\n');

    const expira = duracion
      ? `Expira en ${duracion} minuto(s)`
      : 'Sin expiración';

    const embed = new EmbedBuilder()
      .setColor(colors.info)
      .setTitle(`Encuesta: ${pregunta}`)
      .setDescription(descripcion)
      .addFields(
        { name: 'Creada por', value: interaction.user.tag, inline: true },
        { name: 'Estado',     value: expira,               inline: true },
      )
      .setTimestamp();

    await interaction.reply({ content: 'Encuesta creada.', ephemeral: true });

    // Enviar la encuesta al canal
    const pollMsg = await interaction.channel.send({ embeds: [embed] });

    // Añadir reacciones en orden
    for (let i = 0; i < opciones.length; i++) {
      await pollMsg.react(EMOJI_OPTIONS[i]);
    }

    console.log(`[Poll] ${interaction.user.tag} creó encuesta en #${interaction.channel.name}: "${pregunta}"`);

    // Si hay duración, cerrar la encuesta automáticamente
    if (duracion) {
      setTimeout(async () => {
        try {
          // Refrescar el mensaje para obtener los conteos actualizados
          const updated = await pollMsg.fetch();
          const results = opciones.map((op, i) => {
            const reaction = updated.reactions.cache.get(EMOJI_OPTIONS[i]);
            const count    = reaction ? reaction.count - 1 : 0; // -1 para excluir el voto del bot
            return { opcion: op, votos: count, emoji: EMOJI_OPTIONS[i] };
          });

          // Ordenar por votos
          results.sort((a, b) => b.votos - a.votos);

          const resultDesc = results
            .map(r => `${r.emoji} **${r.opcion}** — ${r.votos} voto(s)`)
            .join('\n\n');

          const ganador = results[0].votos > 0
            ? `Resultado: **${results[0].opcion}** con ${results[0].votos} voto(s).`
            : 'No se registraron votos.';

          const resultEmbed = new EmbedBuilder()
            .setColor(colors.success)
            .setTitle(`Encuesta cerrada: ${pregunta}`)
            .setDescription(resultDesc)
            .addFields({ name: 'Conclusión', value: ganador })
            .setTimestamp();

          await pollMsg.edit({ embeds: [resultEmbed] });
          await interaction.channel.send({ embeds: [resultEmbed] });

          console.log(`[Poll] Encuesta cerrada: "${pregunta}"`);
        } catch (err) {
          console.error('[Poll] Error al cerrar encuesta:', err);
        }
      }, duracion * 60 * 1000);
    }
  },
};
