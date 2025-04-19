import {
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    InteractionType,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
  } from 'discord.js';
  
  import { verifyMessage } from 'ethers';
  import { getNFTHolding } from '../verifyWallet.js';
  import {
    getSession,
    clearSession,
    markSessionUsed,
    isRateLimited,
    updateLastAction,
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
        .addComponents(new ActionRowBuilder().addComponents(signatureInput));
  
      return interaction.showModal(modal);
    }
  
    // When user submits the modal
    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === 'submit-signature'
    ) {
      await interaction.deferReply({ ephemeral: false }); // Moved to top
  
      const userId = interaction.user.id;
  
      // Rate limit check
      if (isRateLimited(userId)) {
        return interaction.editReply({
          content: 'Please wait a few seconds before trying again.',
        });
      }
      updateLastAction(userId);
  
      const signature = interaction.fields.getTextInputValue('signature')?.trim();
  
      // Signature format validation
      if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
        return interaction.editReply({
          content: 'Invalid signature format.',
        });
      }
  
      const session = getSession(userId);
  
      // Session must exist and not be used
      if (!session || session.used) {
        return interaction.editReply({
          content: '❌ Your verification session is invalid or already used. Please try `/verify` again.',
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
  
        return interaction.editReply({
          content:
            'Signature verification failed. Your session might be expired or invalid.\nClick below to restart verification.',
          components: [retryRow],
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
        const beeCount = BigInt(balance);
        const isSwarm = beeCount > 20n;
  
        if (beeCount > 0n) {
          const guild = await client.guilds.fetch(process.env.GUILD_ID);
          const member = await guild.members.fetch(userId);
          await member.roles.add(process.env.ROLE_ID);
  
          markSessionUsed(userId);
          clearSession(userId);
  
          const description = [
            `🌼 We are welcoming <@${userId}> and **${beeCount} Bees** to the Hive!`,
            isSwarm ? '**Wow. That’s a swarm!**' : null,
          ]
            .filter(Boolean)
            .join('\n');
  
          const embed = new EmbedBuilder()
            .setColor(0xfdf16d)
            .setDescription(description);
  
          return interaction.editReply({
            embeds: [embed],
          });
        } else {
          const embed = new EmbedBuilder()
            .setColor(0x2f3136)
            .setDescription(`<@${userId}> doesn’t hold any Bees yet.`);
  
          return interaction.editReply({
            embeds: [embed],
          });
        }
      } catch (err) {
        console.error('[VERIFY] NFT Check / Role Error:', err);
        return interaction.editReply({
          content: '❌ Internal error during verification.',
        });
      }
    }
  }
  