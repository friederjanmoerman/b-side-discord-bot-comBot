import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } from 'discord.js';
import { verifyMessage } from 'ethers';
import { getNFTHolding } from '../verifyWallet.js';
import { getSession, clearSession } from './sessionStore.js';
  
export const data = new SlashCommandBuilder()
.setName('verify')
.setDescription('Start B Side NFT verification');

export async function execute(interaction) {
const embed = new EmbedBuilder()
    .setTitle('🐝 B Side Verification')
    .setDescription('Click below to begin verifying your wallet and earn your role.')
    .setColor('#FFD700');

const button = new ButtonBuilder()
    .setCustomId('start-verification')
    .setLabel('🖊 Start Verification')
    .setStyle(ButtonStyle.Primary);

const row = new ActionRowBuilder().addComponents(button);

await interaction.reply({
    embeds: [embed],
    components: [row],
    ephemeral: true,
});
}

export async function handleMessage(message, client) {
  if (message.author.bot || !message.content.startsWith('0x')) return;

  const userId = message.author.id;
  const signature = message.content.trim();
  const session = getSession(userId);
  if (!session) return;

  const fullMessage = `Sign this message to verify for B Side:\n"Verify B Side | Code: ${session.code}"`;

  try {
    const recovered = verifyMessage(fullMessage, signature);
    if (recovered.toLowerCase() !== session.wallet.toLowerCase()) {
      return message.reply('❌ Signature does not match wallet.');
    }

    const balance = await getNFTHolding(session.wallet);
    if (BigInt(balance.toString()) > 0n) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(userId);
      await member.roles.add(process.env.ROLE_ID);

      await message.reply(`✅ Verified! Role assigned. NFT balance: ${balance}`);
    } else {
      await message.reply(`❌ You don't hold a B Side NFT.`);
    }

    clearSession(userId);
  } catch (err) {
    console.error(err);
    message.reply('❌ Invalid signature or internal error.');
  }
}
