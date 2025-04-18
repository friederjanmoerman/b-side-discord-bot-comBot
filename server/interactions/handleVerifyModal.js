import {
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    InteractionType,
  } from 'discord.js';
  
  import { verifyMessage } from 'ethers';
  import { getNFTHolding } from '../verifyWallet.js';
  import { getSession, clearSession } from './sessionStore.js';
  
  export async function handleInteraction(interaction, client) {
    // 🧩 When user clicks "📋 Paste Signature"
    if (interaction.customId === 'start-verification') {
      const signatureInput = new TextInputBuilder()
        .setCustomId('signature')
        .setLabel('Paste your signature after signing')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('0x...')
        .setRequired(true);
  
      const modal = new ModalBuilder()
        .setCustomId('submit-signature')
        .setTitle('Paste Signature')
        .addComponents(
          new ActionRowBuilder().addComponents(signatureInput)
        );
  
      return interaction.showModal(modal);
    }
  
    // 🧠 When user submits the modal
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit-signature') {
      const userId = interaction.user.id;
      const signature = interaction.fields.getTextInputValue('signature')?.trim();
      const session = getSession(userId);
  
      if (!session) {
        return interaction.reply({
          content: '❌ Your verification session expired. Please try `/verify` again.',
          ephemeral: true,
        });
      }
  
      const fullMessage = `Sign this message to verify for B Side:\n"Verify B Side | Code: ${session.code}"`;
  
      let recovered;
      try {
        recovered = verifyMessage(fullMessage, signature);
      } catch (err) {
        console.error('[VERIFY] Signature verification failed:', err);
        return interaction.reply({
          content: '❌ Invalid signature format.',
          ephemeral: true,
        });
      }
  
      console.table({
        'User ID': userId,
        'Recovered Wallet': recovered,
        'Message': fullMessage,
        'Signature': signature.slice(0, 16) + '...',
      });
  
      try {
        const balance = await getNFTHolding(recovered);
        if (BigInt(balance.toString()) > 0n) {
          const guild = await client.guilds.fetch(process.env.GUILD_ID);
          const member = await guild.members.fetch(userId);
          await member.roles.add(process.env.ROLE_ID);
  
          clearSession(userId);
          return interaction.reply({
            content: `✅ Verified and role assigned! NFT balance: ${balance}`,
            ephemeral: true,
          });
        } else {
          return interaction.reply({
            content: '❌ You do not hold a B Side NFT.',
            ephemeral: true,
          });
        }
      } catch (err) {
        console.error('[VERIFY] NFT Check / Role Error:', err);
        return interaction.reply({
          content: '❌ Internal error during verification.',
          ephemeral: true,
        });
      }
    }
  }
  