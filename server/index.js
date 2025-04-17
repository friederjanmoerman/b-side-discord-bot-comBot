import express from 'express';
import dotenv from 'dotenv';
import { Client, GatewayIntentBits } from 'discord.js';
import { getNFTHolding } from './verifyWallet.js';
import * as verify from './interactions/verifyCommand.js';
import { handleInteraction } from './interactions/handleVerifyModal.js';

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,             
      GatewayIntentBits.GuildMembers,       
      GatewayIntentBits.GuildMessages,     
      GatewayIntentBits.MessageContent     
    ]
  });
  

// ✅ Event listeners after client is declared
client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand() && interaction.commandName === 'verify') {
    await verify.execute(interaction);
  }

  if (interaction.isButton() || interaction.isModalSubmit()) {
    await handleInteraction(interaction, client);
  }
});

client.on('messageCreate', async (message) => {
  if (!message.author.bot) {
    await verify.handleMessage(message, client);
  }
});

// Express endpoint
app.post('/verify', async (req, res) => {
  const { discordId, wallet } = req.body;

  try {
    const balance = await getNFTHolding(wallet);
    const num = BigInt(balance.toString());

    if (num <= 0n) return res.status(403).json({ holder: false, nftsHolding: 0 });

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);
    await member.roles.add(process.env.ROLE_ID);

    return res.json({
      holder: true,
      message: 'Role assigned',
      nftsHolding: num.toString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Error' });
  }
});

// Start Express + login bot
app.listen(port, () => console.log(`Server running on port ${port}`));
client.login(process.env.DISCORD_BOT_TOKEN);
