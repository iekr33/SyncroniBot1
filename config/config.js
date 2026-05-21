'use strict';

require('dotenv').config();

const required = ['DISCORD_TOKEN', 'CLIENT_ID'];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[Config] ERROR: La variable "${key}" no está definida en .env`);
    process.exit(1);
  }
}

module.exports = {
  token:    process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId:  process.env.GUILD_ID || null,

  colors: {
    primary: 0x2B2D31,
    success: 0x2ECC71,
    error:   0xE74C3C,
    warning: 0xF39C12,
    info:    0x3498DB,
  },

  maxClearMessages: 100,
};
