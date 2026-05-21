// commands/ask.js
// Responde preguntas usando la API de Google Gemini (gratuita).
// Requiere GEMINI_API_KEY en el archivo .env

'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

if (!process.env.GEMINI_API_KEY) {
  console.warn('[Ask] ADVERTENCIA: GEMINI_API_KEY no está definida en .env. El comando /ask no funcionará.');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Hace una pregunta a la IA integrada del bot.')
    .addStringOption(opt =>
      opt
        .setName('pregunta')
        .setDescription('¿Qué quieres preguntar?')
        .setRequired(true)
        .setMaxLength(500),
    ),

  async execute(interaction) {
    if (!process.env.GEMINI_API_KEY) {
      return interaction.reply({
        content: 'El comando /ask no está configurado. Añade `GEMINI_API_KEY` al archivo `.env`.',
        ephemeral: true,
      });
    }

    const pregunta = interaction.options.getString('pregunta');
    await interaction.deferReply();

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GEMINI_API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `Eres SyncronyBot, un asistente integrado en un servidor de Discord.
Responde de forma clara, precisa y profesional.
Se conciso: maximo 3-4 parrafos.
No uses markdown excesivo.
Responde en el mismo idioma en que te hagan la pregunta.`,
            }],
          },
          contents: [{
            parts: [{ text: pregunta }],
          }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error('[Ask] Error API Gemini:', JSON.stringify(err, null, 2));
        return interaction.editReply({ content: 'Ocurrio un error al consultar la IA. Intentalo de nuevo mas tarde.' });
      }

      const data   = await response.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text ?? 'No se pudo obtener una respuesta.';

      const preguntaField = pregunta.length > 1020 ? pregunta.slice(0, 1020) + '...' : pregunta;
      const respuesta     = answer.length > 4000   ? answer.slice(0, 4000)   + '...' : answer;

      const embed = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle('Respuesta')
        .addFields({ name: 'Pregunta', value: preguntaField })
        .setDescription(respuesta)
        .setFooter({ text: `Preguntado por ${interaction.user.tag} - Powered by Gemini` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      console.log(`[Ask] ${interaction.user.tag} pregunto: "${pregunta}"`);

    } catch (error) {
      console.error('[Ask] Error:', error);
      await interaction.editReply({ content: 'Ocurrio un error al procesar tu pregunta.' });
    }
  },
};