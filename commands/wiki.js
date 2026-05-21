'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('Busca información en Wikipedia o Fandom.')
    .addSubcommand(sub =>
      sub
        .setName('wikipedia')
        .setDescription('Busca en Wikipedia.')
        .addStringOption(opt =>
          opt.setName('busqueda')
            .setDescription('Término a buscar')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('idioma')
            .setDescription('Idioma (es, en...)')
            .setRequired(false),
        ),
    )
    .addSubcommand(sub =>
      sub
        .setName('fandom')
        .setDescription('Busca en Fandom.')
        .addStringOption(opt =>
          opt.setName('wiki')
            .setDescription('Nombre de la wiki (minecraft, ark, etc)')
            .setRequired(true),
        )
        .addStringOption(opt =>
          opt.setName('busqueda')
            .setDescription('Término a buscar')
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply();

    try {
      if (sub === 'wikipedia') return await wikipedia(interaction);
      if (sub === 'fandom') return await fandom(interaction);

      await interaction.editReply('Subcomando inválido.');
    } catch (err) {
      console.error(err);
      await interaction.editReply('Error procesando la wiki.');
    }
  },
};

// ---------------- UTIL ----------------

function cleanHTML(text) {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------- WIKIPEDIA ----------------

async function wikipedia(interaction) {
  const query = interaction.options.getString('busqueda');
  const lang = interaction.options.getString('idioma') || 'es';

  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

  const res = await fetch(url);
  if (!res.ok) {
    return interaction.editReply('No se encontró en Wikipedia.');
  }

  const data = await res.json();

  const embed = new EmbedBuilder()
    .setColor(colors.info)
    .setTitle(`📚 ${data.title}`)
    .setURL(data.content_urls?.desktop?.page)
    .setThumbnail(data.thumbnail?.source || null)
    .setDescription(
      `🧠 **Resumen:**\n${data.extract?.slice(0, 2000) || 'Sin información disponible.'}`
    )
    .addFields({
      name: '🔗 Enlace',
      value: data.content_urls?.desktop?.page || 'No disponible',
    })
    .setFooter({
      text: `Wikipedia (${lang.toUpperCase()}) • ${interaction.user.username}`,
    });

  await interaction.editReply({ embeds: [embed] });
}

// ---------------- FANDOM PRO ----------------

async function fandom(interaction) {
  const wiki = interaction.options.getString('wiki').toLowerCase();
  const query = interaction.options.getString('busqueda');

  const base = `https://${wiki}.fandom.com`;

  // 🔎 búsqueda
  const searchUrl =
    `${base}/api.php?action=query&list=search&srsearch=` +
    `${encodeURIComponent(query)}&format=json&origin=*`;

  const res = await fetch(searchUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!res.ok) {
    return interaction.editReply('Fandom bloqueado o no disponible.');
  }

  const data = await res.json();
  const result = data?.query?.search?.[0];

  if (!result) {
    return interaction.editReply('No se encontró nada.');
  }

  const pageUrl = `${base}/wiki/${encodeURIComponent(result.title.replace(/ /g, '_'))}`;

  // 📄 contenido completo
  const contentUrl =
    `${base}/api.php?action=parse&page=` +
    `${encodeURIComponent(result.title)}&prop=text&format=json&origin=*`;

  const contentRes = await fetch(contentUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  let text = result.snippet || 'Sin información disponible.';

  if (contentRes.ok) {
    const contentData = await contentRes.json();
    const html = contentData?.parse?.text?.['*'];

    if (html) {
      text = cleanHTML(html);
    }
  }

  // 🧠 dividir contenido
  const lines = text.split('\n').filter(l => l.trim().length > 0);

  const summary = lines.slice(0, 3).join('\n') || 'Sin resumen disponible.';
  const info = lines.slice(3, 10);

  const embed = new EmbedBuilder()
    .setColor(colors.primary)
    .setTitle(`📖 ${result.title}`)
    .setURL(pageUrl)
    .setDescription(`🧠 **Resumen:**\n${summary}`);

  // 📊 bloque de información
  if (info.length) {
    embed.addFields({
      name: '📊 Información',
      value: info
        .slice(0, 8)
        .map(i => `• ${i}`)
        .join('\n')
        .slice(0, 1024),
    });
  }

  embed.setFooter({
    text: `${wiki}.fandom.com • ${interaction.user.username}`,
  });

  await interaction.editReply({ embeds: [embed] });
}