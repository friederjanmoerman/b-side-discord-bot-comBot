import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { data as verifyCommand } from './interactions/verifyCommand.js';

config();

const commands = [verifyCommand.toJSON()];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
  try {
    console.log('🌐 Deploying slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ Successfully deployed slash commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
})();
