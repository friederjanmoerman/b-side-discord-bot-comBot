import WebSocket from 'ws';

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
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" // ERC-721 Transfer event
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

    console.log(`💸 Transfer detected - Token ID: ${tokenId}, from: ${from}, to: ${to}`);

    if (from.toLowerCase() !== to.toLowerCase()) {
      try {
        const channel = await client.channels.fetch(process.env.CHANNEL_ID);

        await channel.send({
          embeds: [{
            title: '🎉 New NFT Sale!',
            fields: [
              { name: 'Token ID', value: `#${tokenId}`, inline: true },
              { name: 'Buyer', value: to, inline: true }
            ],
            timestamp: new Date().toISOString(),
          }]
        });

        console.log('✅ Sale posted to Discord.');
      } catch (err) {
        console.error('❌ Failed to send sale embed to Discord:', err);
      }
    }
  });

  ws.on('close', () => {
    console.warn('⚠️ WebSocket connection closed. Reconnecting in 5s...');
    setTimeout(() => startSalesListener(client), 5000);
  });

  ws.on('error', (err) => {
    console.error('❗ WebSocket error:', err);
  });

  setTimeout(() => {
    console.log('⚡ Sending fake test sale event...');
    const fakeData = {
      params: {
        result: {
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef", // Transfer event
            "0x0000000000000000000000001111111111111111111111111111111111111111", // from
            "0x0000000000000000000000002222222222222222222222222222222222222222", // to
            "0x000000000000000000000000000000000000000000000000000000000000002a"  // tokenId 42
          ]
        }
      }
    };
  
    // Reuse your existing message handler
    ws.emit('message', JSON.stringify(fakeData));
  }, 5000); // Wait 5 seconds after startup
  
}
