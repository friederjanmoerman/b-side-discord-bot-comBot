import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
  } from 'discord.js';
  
  import { createNonce, storeSession } from './sessionStore.js';
  
  export const data = new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start B Side NFT verification');
  
  export async function execute(interaction) {
    // 🧠 Step 1: Immediately acknowledge to avoid timeout (fixes Unknown Interaction)
    await interaction.deferReply({ flags: 1 << 6 }); // 1 << 6 = ephemeral
  
    // 🔐 Step 2: Generate session + signer link
    const code = createNonce();
    storeSession(interaction.user.id, code);
  
    const signerUrl = `https://b-side-web-signer-combot.vercel.app/?code=${code}`;
  
    // ✨ Step 3: Create content
    const embed = new EmbedBuilder()
      .setTitle('🐝 B Side Verification')
      .setDescription([
        '1. Click **Sign Message** to connect your wallet and sign.',
        '2. Then click **Paste Signature** to submit the result.'
      ].join('\n'))
      .setColor(0xffd700);
  
    const signButton = new ButtonBuilder()
      .setLabel('🖊 Sign Message')
      .setStyle(ButtonStyle.Link)
      .setURL(signerUrl);
  
    const modalButton = new ButtonBuilder()
      .setCustomId('start-verification')
      .setLabel('📋 Paste Signature')
      .setStyle(ButtonStyle.Primary);
  
    const row = new ActionRowBuilder().addComponents(signButton, modalButton);
  
    // 💬 Step 4: Edit reply after async prep is done
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  }
  