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
  
  import { verifyMessage, Contract, JsonRpcProvider } from 'ethers';
  import { getNFTHolding } from '../verifyWallet.js';
  import {
    getSession,
    clearSession,
    markSessionUsed,
    isRateLimited,
    updateLastAction,
  } from './sessionStore.js';
  
  const oneOfOnes = [
    504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514, 515, 516, 517, 518, 519,
    520, 521, 522, 523, 524, 525, 526, 527, 528, 529, 530, 531, 532, 533, 534, 535,
    536, 537, 538, 539, 540, 541, 619, 751, 811, 949, 950, 951, 952, 953, 954, 955,
    956, 958
  ];

  const abi = ["function ownerOf(uint256 tokenId) view returns (address)"];
  const provider = new JsonRpcProvider(process.env.RPC_URL);
  const contract = new Contract(process.env.NFT_CONTRACT_ADDRESS, abi, provider);
  
  export async function handleInteraction(interaction, client) {
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
  
    if (
      interaction.type === InteractionType.ModalSubmit &&
      interaction.customId === 'submit-signature'
    ) {
      await interaction.deferReply({ ephemeral: false });
  
      const userId = interaction.user.id;
  
      if (isRateLimited(userId)) {
        return interaction.editReply({
          content: 'Please wait a few seconds before trying again.',
        });
      }
      updateLastAction(userId);
  
      const signature = interaction.fields.getTextInputValue('signature')?.trim();
  
      if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
        return interaction.editReply({
          content: 'Invalid signature format.',
        });
      }
  
      const session = getSession(userId);
  
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

  
      try {
        const balance = await getNFTHolding(recovered);
        const beeCount = BigInt(balance);
        const isSwarm = beeCount >= 10n;
  
        if (beeCount > 0n) {
          const guild = await client.guilds.fetch(process.env.GUILD_ID);
          const member = await guild.members.fetch(userId);
  
          await member.roles.add(process.env.ROLE_ID);
  
          if (isSwarm && process.env.ROLE_ID_SWARM) {
            await member.roles.add(process.env.ROLE_ID_SWARM);
          }
  
          let holdsUnique = false;
  
          for (const tokenId of oneOfOnes) {
            try {
              const owner = await contract.ownerOf(tokenId);
              if (owner.toLowerCase() === recovered.toLowerCase()) {
                holdsUnique = true;
                break;
              }
            } catch (e) {}
          }
  
          if (holdsUnique && process.env.ROLE_ID_UNIQUE) {
            await member.roles.add(process.env.ROLE_ID_UNIQUE);
          }
  
          markSessionUsed(userId);
          clearSession(userId);
  
          const description = [
            `We are welcoming <@${userId}> and **${beeCount} Bees** to the Hive!`,
            isSwarm ? 'You are a **Hive Lord**. That is a swarm!' : null,
            holdsUnique ? '*Some of them look really **unique**.* ✨' : null,
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
  