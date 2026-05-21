// commands/play.js
// Reproduce música de YouTube en un canal de voz.
// Soporta URL directa y búsqueda por nombre.

'use strict';

const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
} = require('@discordjs/voice');

const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const prism = require('prism-media');
const ffmpeg = require('ffmpeg-static');
const fs = require('fs');

const { colors } = require('../config/config');

// =========================
// COOKIES YOUTUBE
// =========================
const cookieFile = fs.readFileSync('./cookies.txt', 'utf8');

const cookies = [];

cookieFile.split('\n').forEach(line => {

  if (!line || line.startsWith('#')) return;

  const parts = line.split('\t');

  if (parts.length < 7) return;

  cookies.push({
    domain: parts[0],
    path: parts[2],
    secure: parts[3] === 'TRUE',
    expirationDate: parseInt(parts[4]),
    name: parts[5],
    value: parts[6],
  });
});

const agent = ytdl.createAgent(cookies);

// Cola de reproducción por servidor
const serverQueues = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción de YouTube en tu canal de voz.')
    .addStringOption(option =>
      option
        .setName('cancion')
        .setDescription('URL de YouTube o nombre para buscar.')
        .setRequired(true),
    ),

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   */
  async execute(interaction) {

    const input = interaction.options.getString('cancion');

    // Obtener miembro actualizado
    const member = await interaction.guild.members.fetch(interaction.user.id);

    // Verificar canal de voz
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: 'Debes estar en un canal de voz para usar este comando.',
        ephemeral: true,
      });
    }

    // Verificar permisos
    const permissions = voiceChannel.permissionsFor(interaction.client.user);

    if (
      !permissions.has(PermissionsBitField.Flags.Connect) ||
      !permissions.has(PermissionsBitField.Flags.Speak)
    ) {
      return interaction.reply({
        content: 'No tengo permisos para conectarme o hablar en tu canal de voz.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {

      let videoUrl;
      let videoTitle;
      let videoDuration;

      const isUrl =
        input.startsWith('https://') ||
        input.startsWith('http://');

      // =========================
      // URL DIRECTA
      // =========================
      if (isUrl) {

        if (!ytdl.validateURL(input)) {
          return interaction.editReply({
            content: 'La URL proporcionada no es válida.',
          });
        }

        const info = await ytdl.getBasicInfo(input, {
          agent,
        });

        videoUrl = input;
        videoTitle = info.videoDetails.title;
        videoDuration = formatDuration(
          parseInt(info.videoDetails.lengthSeconds)
        );

      } else {

        // =========================
        // BÚSQUEDA
        // =========================
        const results = await yts(input);

        if (!results.videos.length) {
          return interaction.editReply({
            content: `No se encontraron resultados para: **${input}**`,
          });
        }

        const video = results.videos[0];

        videoUrl = video.url;
        videoTitle = video.title;
        videoDuration = video.timestamp;
      }

      // =========================
      // OBTENER O CREAR COLA
      // =========================
      let serverQueue = serverQueues.get(interaction.guild.id);

      const song = {
        url: videoUrl,
        title: videoTitle,
        duration: videoDuration,
        requestedBy: interaction.user.tag,
      };

      // =========================
      // AÑADIR A COLA EXISTENTE
      // =========================
      if (serverQueue) {

        serverQueue.songs.push(song);

        const embed = new EmbedBuilder()
          .setColor(colors.info)
          .setTitle('Añadido a la cola')
          .setDescription(`**${videoTitle}**`)
          .addFields(
            {
              name: 'Duración',
              value: videoDuration,
              inline: true,
            },
            {
              name: 'Posición en cola',
              value: `${serverQueue.songs.length}`,
              inline: true,
            },
          )
          .setFooter({
            text: `Solicitado por ${interaction.user.tag}`,
          })
          .setTimestamp();

        return interaction.editReply({
          embeds: [embed],
        });
      }

      // =========================
      // CREAR NUEVA COLA
      // =========================
      serverQueue = {
        songs: [song],
        player: createAudioPlayer(),
        connection: null,
      };

      serverQueues.set(interaction.guild.id, serverQueue);

      // =========================
      // CONECTAR AL CANAL
      // =========================
      serverQueue.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      // Esperar conexión
      await entersState(
        serverQueue.connection,
        VoiceConnectionStatus.Ready,
        10_000
      );

      // Suscribir player
      serverQueue.connection.subscribe(serverQueue.player);

      // =========================
      // DESCONECTADO
      // =========================
      serverQueue.connection.on(
        VoiceConnectionStatus.Disconnected,
        async () => {

          try {

            await Promise.race([
              entersState(
                serverQueue.connection,
                VoiceConnectionStatus.Signalling,
                5_000
              ),
              entersState(
                serverQueue.connection,
                VoiceConnectionStatus.Connecting,
                5_000
              ),
            ]);

          } catch {

            serverQueue.connection.destroy();
            serverQueues.delete(interaction.guild.id);
          }
        }
      );

      // =========================
      // SIGUIENTE CANCIÓN
      // =========================
      serverQueue.player.on(AudioPlayerStatus.Idle, () => {

        serverQueue.songs.shift();

        if (serverQueue.songs.length > 0) {

          playSong(serverQueue);

        } else {

          setTimeout(() => {

            if (serverQueue.songs.length === 0) {

              serverQueue.connection.destroy();
              serverQueues.delete(interaction.guild.id);
            }

          }, 30_000);
        }
      });

      // =========================
      // ERRORES PLAYER
      // =========================
      serverQueue.player.on('error', error => {
        console.error('[PLAYER ERROR]', error);

        serverQueue.songs.shift();

        if (serverQueue.songs.length > 0) {
          playSong(serverQueue);
        }
      });

      // =========================
      // INICIAR REPRODUCCIÓN
      // =========================
      playSong(serverQueue);

      const embed = new EmbedBuilder()
        .setColor(colors.success)
        .setTitle('Reproduciendo ahora')
        .setDescription(`**${videoTitle}**`)
        .addFields(
          {
            name: 'Duración',
            value: videoDuration,
            inline: true,
          },
          {
            name: 'Canal',
            value: voiceChannel.name,
            inline: true,
          },
        )
        .setFooter({
          text: `Solicitado por ${interaction.user.tag}`,
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
      });

      console.log(
        `[Play] ${interaction.user.tag} reprodujo: ${videoTitle}`
      );

    } catch (error) {

      console.error('[Play] Error:', error);

      serverQueues.delete(interaction.guild.id);

      await interaction.editReply({
        content:
          'Ocurrió un error al intentar reproducir la canción.',
      });
    }
  },
};

// =========================
// REPRODUCIR CANCIÓN
// =========================
function playSong(serverQueue) {

  const song = serverQueue.songs[0];

  if (!song) return;

  console.log(`[Play] Reproduciendo: ${song.title}`);

  const stream = ytdl(song.url, {
    filter: 'audioonly',
    quality: 'highestaudio',
    highWaterMark: 1 << 25,
    agent,
  });

  // Errores del stream
  stream.on('error', err => {
    console.error('[STREAM ERROR]', err);
  });

  // FFmpeg
  const transcoder = new prism.FFmpeg({
    executable: ffmpeg,
    args: [
      '-analyzeduration', '0',
      '-loglevel', '0',
      '-i', 'pipe:0',
      '-f', 's16le',
      '-ar', '48000',
      '-ac', '2',
      'pipe:1',
    ],
  });

  const resource = createAudioResource(
    stream.pipe(transcoder)
  );

  serverQueue.player.play(resource);
}

// =========================
// FORMATEAR DURACIÓN
// =========================
function formatDuration(seconds) {

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return `${m}:${String(s).padStart(2, '0')}`;
}

// Exportar cola
module.exports.serverQueues = serverQueues;