import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
  } from 'discord.js';
  
  import {
    createNonce,
    storeSession,
    canRunVerify,
    recordVerifyRun
  } from './sessionStore.js';
  
  export const data = new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start B Side NFT verification');
  
  export async function execute(interaction) {
    if (!canRunVerify(interaction.user.id)) {
      return interaction.reply({
        content: 'Please wait a few seconds before running `/verify` again.',
        flags: 64,
        ephemeral: true
      });
    }
  
    recordVerifyRun(interaction.user.id);
  
    await interaction.deferReply({ flags: 64 });
  
    const code = createNonce();
    storeSession(interaction.user.id, code);
  
    const signerUrl = `https://b-side-web-signer-combot.vercel.app/?code=${code}&user=${interaction.user.id}`;
  
    const embed = new EmbedBuilder()
    .setTitle('🐝 B Side Verification')
    .setDescription([
        '1. Click **Sign Message** to connect your wallet and sign.',
        '2. Then click **Paste Signature** to submit the result.',
        '',
        '> *No transactions are signed.*',
        '> *No wallet or Discord login is required.*',
        '> *All actions are stateless, ephemeral, and fully verified on the backend.*'
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
  
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  }
  