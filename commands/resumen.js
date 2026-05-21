// commands/resumen.js
// Resume automáticamente los últimos N mensajes del canal usando Gemini AI.

'use strict';

const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resumen')
    .setDescription('Genera un resumen de los últimos mensajes del canal usando IA.')
    .addIntegerOption(opt =>
      opt
        .setName('cantidad')
        .setDescription('Número de mensajes a resumir (10-100). Por defecto: 50.')
        .setRequired(false)
        .setMinValue(10)
        .setMaxValue(100),
    ),

  async execute(interaction) {
    if (!process.env.GEMINI_API_KEY) {
      return interaction.reply({
        content: 'Este comando requiere `GEMINI_API_KEY` en el archivo `.env`.',
        ephemeral: true,
      });
    }

    const cantidad = interaction.options.getInteger('cantidad') ?? 50;

    await interaction.deferReply();

    try {
      const mensajes = await interaction.channel.messages.fetch({
        limit: cantidad,
      });

      if (!mensajes.size) {
        return interaction.editReply({
          content: 'No hay mensajes en este canal para resumir.',
        });
      }

      const texto = mensajes
        .filter(m => !m.author.bot)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map(m => {
          const hora = new Date(m.createdTimestamp).toLocaleTimeString(
            'es-ES',
            { hour: '2-digit', minute: '2-digit' },
          );
          return `[${hora}] ${m.author.username}: ${m.content}`;
        })
        .join('\n');

      if (!texto.trim()) {
        return interaction.editReply({
          content: 'No hay mensajes de usuarios (solo bots) en este rango.',
        });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

      // 🔥 MODELOS CON FALLBACK (incluye Gemini 2.5 Pro)
      const MODELS = [
        process.env.GEMINI_MODEL,
        'gemini-2.5-pro',
        'gemini-2.5-pro-preview',
        'gemini-1.5-pro',
        'gemini-1.5-flash',
      ].filter(Boolean);

      let resumen = null;
      let modelUsed = null;

      for (const modelName of MODELS) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
          });

          const prompt = `
Eres un asistente que resume conversaciones de Discord.

Reglas:
- Máximo 4-5 puntos
- Claro, objetivo y neutral
- En español
- Sin markdown excesivo
- No inventes información

Conversación (${mensajes.size} mensajes):

${texto}
          `.trim();

          const result = await model.generateContent(prompt);
          const response = await result.response;

          resumen = response.text();
          modelUsed = modelName;
          break; // si funciona, salimos del loop

        } catch (err) {
          console.warn(`[Gemini] Falló modelo ${modelName}:`, err.message);
        }
      }

      if (!resumen) {
        throw new Error('Ningún modelo de Gemini pudo generar el resumen.');
      }

      const embed = new EmbedBuilder()
        .setColor(colors.primary || '#5865F2')
        .setTitle(`Resumen de los últimos ${mensajes.size} mensajes`)
        .setDescription(resumen.slice(0, 4000))
        .addFields(
          {
            name: 'Canal',
            value: `#${interaction.channel.name}`,
            inline: true,
          },
          {
            name: 'Mensajes',
            value: `${mensajes.size}`,
            inline: true,
          },
        )
        .setFooter({
          text: `Solicitado por ${interaction.user.tag} • ${modelUsed}`,
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[Resumen] Error:', error);

      await interaction.editReply({
        content: '❌ Ocurrió un error al generar el resumen.',
      });
    }
  },
};