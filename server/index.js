import express from 'express';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import * as verify from './interactions/verifyCommand.js';
import { handleInteraction } from './interactions/handleVerifyModal.js';

dotenv.config();

const app = express();
const port = process.env.PORT;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand() && interaction.commandName === 'verify') {
      await verify.execute(interaction);
    }
  
    if (interaction.isButton() || interaction.isModalSubmit()) {
      await handleInteraction(interaction, client);
    }
  });

client.on('messageCreate', async (message) => {
  await verify.handleMessage(message, client);
});

app.use(express.json());

app.listen(port, () => console.log(`Server running on port ${port}`));

client.login(process.env.DISCORD_BOT_TOKEN);
