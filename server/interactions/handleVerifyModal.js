import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { getNonceForUser, validateSignature } from './sessionStore.js';
import { getNFTHolding } from '../verifyWallet.js';

export async function handleInteraction(interaction, client) {
  const userId = interaction.user.id;

  // BUTTON: Prompt for wallet
  if (interaction.customId === 'start-verification') {
    const walletInput = new TextInputBuilder()
      .setCustomId('wallet_address')
      .setLabel('Your Wallet Address')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const modal = new ModalBuilder()
      .setCustomId('wallet_modal')
      .setTitle('Enter Your Wallet')
      .addComponents(new ActionRowBuilder().addComponents(walletInput));

    await interaction.showModal(modal);
  }

  // MODAL: User submitted wallet
  else if (interaction.isModalSubmit() && interaction.customId === 'wallet_modal') {
    const wallet = interaction.fields.getTextInputValue('wallet_address');
    const nonce = getNonceForUser(userId, wallet); // creates + stores nonce

    const msg = `Sign this message: Verify B Side | Code: ${nonce.code}`;
    await interaction.reply({
      content: `Sign this message using MetaMask, Rabby, or any EVM wallet:\n\`\`\`${msg}\`\`\`\nThen paste the **signature only** below.`,
      ephemeral: true,
    });
  }

  // Signature paste (use modal OR next button phase if you want)
  else if (interaction.customId === 'submit-signature') {
    const { signature, wallet } = JSON.parse(interaction.message.content); // however you store/prompt
    const valid = await validateSignature(userId, wallet, signature);
    if (!valid) return interaction.reply({ content: '❌ Invalid signature.', ephemeral: true });

    const balance = await getNFTHolding(wallet);
    const owns = BigInt(balance.toString());

    if (owns > 0n) {
      const guild = await client.guilds.fetch(process.env.GUILD_ID);
      const member = await guild.members.fetch(userId);
      await member.roles.add(process.env.ROLE_ID);

      return interaction.reply({
        content: `✅ Signature valid. You hold ${owns} B Side NFTs. Role assigned!`,
        ephemeral: true,
      });
    }

    return interaction.reply({ content: '❌ You don’t hold a B Side NFT.', ephemeral: true });
  }
}
