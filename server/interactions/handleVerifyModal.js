// interactions/handleVerifyModal.js
import {
    ModalBuilder,
    TextInputBuilder,
    ActionRowBuilder,
    TextInputStyle,
    InteractionType,
  } from 'discord.js';
  
  import { createNonce, storeSession } from './sessionStore.js';
  
  export async function handleInteraction(interaction, client) {
    if (interaction.customId === 'start-verification') {
      const modal = new ModalBuilder()
        .setCustomId('wallet-modal')
        .setTitle('Enter Your Wallet Address')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('wallet')
              .setLabel('Your Wallet Address')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );
  
      return interaction.showModal(modal);
    }
  
    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === 'wallet-modal'
    ) {
      const wallet = interaction.fields.getTextInputValue('wallet').trim();
      const code = createNonce();
      storeSession(interaction.user.id, wallet, code);
  
      const signerURL = `https://bside-wallet-signer.vercel.app/?wallet=${wallet}&code=${code}`;
  
      await interaction.reply({
        content: `🖊 Click to sign your verification message:\n${signerURL}\n\nPaste the **signature** below once you're done.`,
        ephemeral: true,
      });
    }
  }
  