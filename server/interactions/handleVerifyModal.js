import {
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    InteractionType,
  } from 'discord.js';
  
  import { verifyMessage } from 'ethers';
  import { getNFTHolding } from '../verifyWallet.js';
  import {
    getSession,
    clearSession,
    markSessionUsed,
    isRateLimited,
    updateLastAction
  } from './sessionStore.js';
  
  export async function handleInteraction(interaction, client) {
    // When user clicks "Paste Signature"
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
  
    // When user submits the modal
    if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'submit-signature') {
      const userId = interaction.user.id;
  
      // Step 5: Rate limit check
      if (isRateLimited(userId)) {
        return interaction.reply({
          content: 'Please wait a few seconds before trying again.',
          flags: 64
        });
      }
      updateLastAction(userId);
  
      const signature = interaction.fields.getTextInputValue('signature')?.trim();
  
      // Step 3: Signature format validation
      if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
        return interaction.reply({
          content: 'Invalid signature format.',
          flags: 64,
        });
      }
  
      const session = getSession(userId);
  
      // Step 1 & 2: Session must exist and not be used
      if (!session || session.used) {
        return interaction.reply({
          content: '❌ Your verification session is invalid or already used. Please try `/verify` again.',
          flags: 64,
        });
      }
  
      const fullMessage = `Sign this message to verify for B Side:\n"Verify B Side | Code: ${session.code} | User: ${userId}"`;
  
      let recovered;
      try {
        recovered = verifyMessage(fullMessage, signature);
      } catch (err) {
        console.error('[VERIFY] Signature verification failed:', err);
      
        const retryRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('start-verification')
            .setLabel('Retry Verification')
            .setStyle(ButtonStyle.Primary)
        );
      
        return interaction.reply({
          content: 'Signature verification failed. Your session might be expired or invalid.\nClick below to restart verification.',
          components: [retryRow],
          flags: 64
        });
      }
      
  
      console.table({
        'User ID': userId,
        'Recovered Wallet': recovered,
        'Message': fullMessage,
        'Signature': signature.slice(0, 6) + '...' + signature.slice(-6),
      });      
  
      try {
        const balance = await getNFTHolding(recovered);
        if (BigInt(balance.toString()) > 0n) {
          const guild = await client.guilds.fetch(process.env.GUILD_ID);
          const member = await guild.members.fetch(userId);
          await member.roles.add(process.env.ROLE_ID);
  
          markSessionUsed(userId); // prevent replay
          clearSession(userId);
  
          return interaction.reply({
            content: `✅ Verified and role assigned! NFT balance: ${balance}`,
            flags: 64,
          });
        } else {
          return interaction.reply({
            content: '❌ You do not hold a B Side NFT.',
            flags: 64,
          });
        }
      } catch (err) {
        console.error('[VERIFY] NFT Check / Role Error:', err);
        return interaction.reply({
          content: '❌ Internal error during verification.',
          flags: 64,
        });
      }
    }
  }
  