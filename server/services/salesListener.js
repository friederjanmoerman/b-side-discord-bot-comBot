// services/salesListener.js
import WebSocket from 'ws';
import fetch from 'node-fetch'; // Needed for API calls
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function startSalesListener(client) {
  const ws = new WebSocket(process.env.ALCHEMY_WS_URL);

  ws.on('open', () => {
    console.log('🔌 Connected to Alchemy WebSocket for NFT sales tracking.');

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_subscribe",
      params: [
        "logs",
        {
          address: process.env.NFT_CONTRACT_ADDRESS,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
          ]
        }
      ]
    };

    ws.send(JSON.stringify(payload));
  });

  ws.on('message', async (data) => {
    const parsed = JSON.parse(data);
    if (!parsed?.params) return;

    const { topics } = parsed.params.result;
    const from = `0x${topics[1].slice(26)}`;
    const to = `0x${topics[2].slice(26)}`;
    const tokenId = parseInt(topics[3], 16);

    console.log(`💸 New Transfer: Token ID ${tokenId} from ${from} to ${to}`);

    if (from.toLowerCase() !== to.toLowerCase()) {
      try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID_SALES);

        // Fetch NFT metadata
        const metadataUrl = `https://berachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${process.env.NFT_CONTRACT_ADDRESS}&tokenId=${tokenId}`;
        const metaResponse = await fetch(metadataUrl);
        const metaJson = await metaResponse.json();

        const imageUrl = metaJson?.media?.[0]?.gateway || null;
        const nftName = metaJson?.title || `Token #${tokenId}`;

        const nftLink = `https://marketplace.kingdomly.app/collection/berachain/b-side-4/${tokenId}`;
        const fromLink = `https://marketplace.kingdomly.app/inventory/${from}`;
        const toLink = `https://marketplace.kingdomly.app/inventory/${to}`;

        const embed = {
          title: `🐝 Bzz!`,
          description: `[**${nftName}**](${nftLink}) sold!`,
          fields: [
            { name: 'Token ID', value: `[#${tokenId}](${nftLink})`, inline: true },
            { name: 'Seller', value: `[${from.slice(0, 6)}...${from.slice(-4)}](${fromLink})`, inline: true },
            { name: 'Buyer', value: `[${to.slice(0, 6)}...${to.slice(-4)}](${toLink})`, inline: true },
          ],
          image: imageUrl ? { url: imageUrl } : undefined,
          timestamp: new Date().toISOString(),
          color: 0xfdf16d,
        };

        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel('View on Kingdomly')
            .setStyle(ButtonStyle.Link)
            .setURL(nftLink)
        );

        await channel.send({ embeds: [embed], components: [button] });
        console.log('✅ Sale posted to Discord.');
      } catch (err) {
        console.error('❌ Failed to send sale message:', err);
      }
    }
  });

  ws.on('close', () => {
    console.warn('⚠️ WebSocket closed. Reconnecting in 5s...');
    setTimeout(() => startSalesListener(client), 5000);
  });

  ws.on('error', (err) => {
    console.error('❗ WebSocket error:', err);
  });
}
