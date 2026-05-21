const { SlashCommandBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const IDIOMAS = {
  'español': 'español',
  'inglés': 'inglés',
  'francés': 'francés',
  'alemán': 'alemán',
  'italiano': 'italiano',
  'portugués': 'portugués',
  'japonés': 'japonés',
  'chino': 'chino (simplificado)',
  'ruso': 'ruso',
  'árabe': 'árabe',
  'coreano': 'coreano',
  'catalán': 'catalán',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('traducir')
    .setDescription('Traduce un mensaje al idioma que quieras usando IA')
    .addStringOption(option =>
      option
        .setName('texto')
        .setDescription('El texto que quieres traducir')
        .setRequired(true)
        .setMaxLength(2000)
    )
    .addStringOption(option =>
      option
        .setName('idioma')
        .setDescription('Idioma de destino (por defecto: inglés)')
        .setRequired(false)
        .addChoices(
          ...Object.entries(IDIOMAS).map(([name, value]) => ({ name, value }))
        )
    )
    .addStringOption(option =>
      option
        .setName('desde')
        .setDescription('Idioma de origen (por defecto: detección automática)')
        .setRequired(false)
        .addChoices(
          ...Object.entries(IDIOMAS).map(([name, value]) => ({ name, value }))
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const texto = interaction.options.getString('texto');
    const idiomaDestino = interaction.options.getString('idioma') ?? 'inglés';
    const idiomaOrigen = interaction.options.getString('desde') ?? null;

    const origenTexto = idiomaOrigen
      ? `del ${idiomaOrigen}`
      : 'detectando el idioma automáticamente';

    const prompt = idiomaOrigen
      ? `Traduce el siguiente texto del ${idiomaOrigen} al ${idiomaDestino}. Responde ÚNICAMENTE con la traducción, sin explicaciones, sin notas, sin comillas.\n\nTexto: ${texto}`
      : `Traduce el siguiente texto al ${idiomaDestino}. Detecta automáticamente el idioma de origen. Responde ÚNICAMENTE con la traducción, sin explicaciones, sin notas, sin comillas.\n\nTexto: ${texto}`;

    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
      const result = await model.generateContent(prompt);
      const traduccion = result.response.text().trim();

      await interaction.editReply({
        embeds: [
          {
            color: 0x5865f2,
            author: {
              name: `${interaction.user.displayName} — Traducción`,
              icon_url: interaction.user.displayAvatarURL({ dynamic: true }),
            },
            fields: [
              {
                name: `📝 Original (${origenTexto})`,
                value: `\`\`\`${texto}\`\`\``,
              },
              {
                name: `🌐 Traducción al ${idiomaDestino}`,
                value: `\`\`\`${traduccion}\`\`\``,
              },
            ],
            footer: {
              text: 'Traducido con Gemini 2.5 Pro',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (error) {
      console.error('[traducir] Error al llamar a Gemini:', error);

      await interaction.editReply({
        embeds: [
          {
            color: 0xed4245,
            title: '❌ Error al traducir',
            description:
              'No se pudo completar la traducción. Inténtalo de nuevo en unos segundos.',
            footer: { text: error.message ?? 'Error desconocido' },
          },
        ],
      });
    }
  },
};
