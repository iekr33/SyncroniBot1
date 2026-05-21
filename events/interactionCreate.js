// events/interactionCreate.js
// Intercepta todas las interacciones entrantes y despacha al comando correspondiente.
'use strict';
const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  /**
   * @param {import('discord.js').Interaction} interaction
   */
  async execute(interaction) {
    // ─── Botones ─────────────────────────────────────────────────────────────
    if (interaction.isButton()) {
      if (['ticket_abrir', 'ticket_cerrar'].includes(interaction.customId)) {
        const ticketCommand = interaction.client.commands.get('ticket');
        if (!ticketCommand) return;
        try {
          await ticketCommand.handleButton(interaction);
        } catch (error) {
          console.error('[Ticket] Error al manejar botón:', error);
          const payload = { content: 'Ocurrió un error al procesar el ticket.', ephemeral: true };
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(payload).catch(console.error);
          } else {
            await interaction.reply(payload).catch(console.error);
          }
        }
      }
      return;
    }

    // ─── Slash commands ───────────────────────────────────────────────────────
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.warn(`[Interaction] Comando desconocido recibido: "${interaction.commandName}"`);
      return interaction.reply({
        content: 'Este comando no está registrado en el bot.',
        ephemeral: true,
      });
    }

    try {
      console.log(`[Command] /${interaction.commandName} ejecutado por ${interaction.user.tag} en "${interaction.guild?.name ?? 'DM'}"`);
      await command.execute(interaction);
    } catch (error) {
      console.error(`[Command] Error al ejecutar /${interaction.commandName}:`, error);
      const errorPayload = {
        content: 'Ocurrió un error al procesar este comando. Por favor, inténtalo de nuevo más tarde.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorPayload).catch(console.error);
      } else {
        await interaction.reply(errorPayload).catch(console.error);
      }
    }
  },
};