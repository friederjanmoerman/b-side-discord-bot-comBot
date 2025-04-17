import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('verify')
  .setDescription('Begin wallet verification for B Side NFT holders');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor('#ffbb33')
    .setTitle('🧪 B Side Verification')
    .setDescription('Click the button below to verify your wallet and claim your holder role 🐝');

  const button = new ButtonBuilder()
    .setCustomId('start-verification')
    .setLabel('Start Verification')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(button);

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}
