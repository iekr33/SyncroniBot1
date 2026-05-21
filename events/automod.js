// events/automod.js
// Automoderación: detecta spam y palabras prohibidas.
// Spam: 5 mensajes en 5 segundos → timeout 10 minutos.
// Palabras prohibidas → timeout 30 minutos + mensaje eliminado.

'use strict';

const { Events, EmbedBuilder } = require('discord.js');
const { colors } = require('../config/config');

// ─── Configuración ───────────────────────────────────────────────────────────

// Lista de palabras prohibidas (modificable en tiempo real con /automod)
let PALABRAS_PROHIBIDAS = [
  'casino', 'sexo', 'politica', 'politica',
  'pornografia', 'apuestas', 'drogas',
];

// Duracion del timeout por palabras prohibidas (30 minutos)
const TIMEOUT_PALABRAS = 30 * 60 * 1000;

// Duracion del timeout por spam (10 minutos)
const TIMEOUT_SPAM = 10 * 60 * 1000;

// Configuracion anti-spam: 5 mensajes en 5 segundos
const SPAM_LIMITE  = 5;
const SPAM_VENTANA = 5000;

// Mapa para rastrear mensajes por usuario: Map<userId, timestamp[]>
const spamTracker = new Map();

// ─── Exportar funcion para actualizar palabras desde /automod ────────────────
module.exports.actualizarPalabras = function(nuevaLista) {
  PALABRAS_PROHIBIDAS = nuevaLista;
  console.log('[AutoMod] Lista de palabras prohibidas actualizada:', PALABRAS_PROHIBIDAS);
};

// ─── Evento ──────────────────────────────────────────────────────────────────

module.exports.name = Events.MessageCreate;
module.exports.once = false;

module.exports.execute = async function(message) {
  // Ignorar bots y mensajes fuera de servidores
  if (message.author.bot || !message.guild) return;

  const member = message.member;
  if (!member) return;

  // No moderar a administradores ni a quien tenga ManageMessages
  if (
    member.permissions.has('Administrator') ||
    member.permissions.has('ManageMessages')
  ) return;

  const contenido = message.content.toLowerCase();

  // ── 1. Deteccion de palabras prohibidas ──────────────────────────────────
  const palabraEncontrada = PALABRAS_PROHIBIDAS.find(p => contenido.includes(p));

  if (palabraEncontrada) {
    try {
      await message.delete();
      await aplicarTimeout(member, TIMEOUT_PALABRAS, 'Palabra prohibida detectada: ' + palabraEncontrada);

      const embed = new EmbedBuilder()
        .setColor(colors.error)
        .setTitle('Mensaje eliminado — Palabra prohibida')
        .setDescription(member.user.tag + ' ha sido silenciado por **30 minutos**.')
        .addFields(
          { name: 'Palabra detectada', value: palabraEncontrada, inline: true },
          { name: 'Canal',             value: '#' + message.channel.name, inline: true },
        )
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      console.log('[AutoMod] Palabra prohibida "' + palabraEncontrada + '" — ' + member.user.tag + ' silenciado 30min en "' + message.guild.name + '"');
    } catch (err) {
      console.error('[AutoMod] Error al gestionar palabra prohibida:', err);
    }
    return;
  }

  // ── 2. Deteccion de spam ─────────────────────────────────────────────────
  const ahora   = Date.now();
  const userId  = message.author.id;
  const tiempos = spamTracker.get(userId) ?? [];

  const recientes = tiempos.filter(t => ahora - t < SPAM_VENTANA);
  recientes.push(ahora);
  spamTracker.set(userId, recientes);

  if (recientes.length >= SPAM_LIMITE) {
    spamTracker.delete(userId);

    try {
      const mensajesCanal   = await message.channel.messages.fetch({ limit: 20 });
      const mensajesUsuario = mensajesCanal.filter(m => m.author.id === userId);
      await message.channel.bulkDelete(mensajesUsuario, true).catch(() => {});

      await aplicarTimeout(member, TIMEOUT_SPAM, 'Spam detectado: demasiados mensajes en poco tiempo.');

      const embed = new EmbedBuilder()
        .setColor(colors.warning)
        .setTitle('Spam detectado')
        .setDescription(member.user.tag + ' ha sido silenciado por **10 minutos** por enviar mensajes demasiado rapido.')
        .addFields({ name: 'Canal', value: '#' + message.channel.name, inline: true })
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
      console.log('[AutoMod] Spam — ' + member.user.tag + ' silenciado 10min en "' + message.guild.name + '"');
    } catch (err) {
      console.error('[AutoMod] Error al gestionar spam:', err);
    }
  }
};

// ─── Funcion auxiliar ────────────────────────────────────────────────────────

async function aplicarTimeout(member, duracionMs, razon) {
  if (!member.moderatable) {
    console.warn('[AutoMod] No se puede silenciar a ' + member.user.tag + ' (rol superior al bot).');
    return;
  }
  await member.timeout(duracionMs, razon);
}
