// services/salesListener.js
import WebSocket from 'ws';

export function startSalesListener(client) {
  const ws = new WebSocket(process.env.ALCHEMY_WS_URL);

  ws.on('open', () => {
    console.log('🔌 Connected to Alchemy WebSocket');

    const payload = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_subscribe",
      params: [
        "logs",
        {
          address: process.env.NFT_CONTRACT,
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" 
          ]
        }
      ]
    };

    ws.send(JSON.stringify(payload));
  });

  ws.on('message', async (data) => {
    const { params } = JSON.parse(data);
    if (!params) return;

    const { topics } = params.result;
    const from = `0x${topics[1].slice(26)}`;
    const to = `0x${topics[2].slice(26)}`;
    const tokenId = parseInt(topics[3], 16);

    console.log(`💸 New Transfer - Token ID: ${tokenId} from ${from} to ${to}`);

    if (from.toLowerCase() !== to.toLowerCase()) {
      try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID);

        const embed = {
          title: '🎉 New NFT Sale!',
          fields: [
            { name: 'Token ID', value: `#${tokenId}`, inline: true },
            { name: 'Buyer', value: to, inline: true }
          ],
          timestamp: new Date().toISOString(),
        };

        channel.send({ embeds: [embed] });
      } catch (err) {
        console.error('❌ Failed to send sale message:', err);
      }
    }
  });

  ws.on('close', () => {
    console.warn('❌ WebSocket closed. Attempting reconnect...');
    setTimeout(() => startSalesListener(client), 5000);
  });

  ws.on('error', (err) => {
    console.error('⚠️ WebSocket error:', err);
  });
}
