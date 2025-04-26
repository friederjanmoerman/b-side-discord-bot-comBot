// services/salesListener.js
import WebSocket from 'ws';
import fetch from 'node-fetch';
import { ethers } from 'ethers';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function startSalesListener(client) {
  const ws = new WebSocket(process.env.ALCHEMY_WS_URL);

  ws.on('open', () => {
    console.log('🔌 Connected to Alchemy WebSocket.');

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_subscribe',
      params: [
        'logs',
        {
          address: process.env.NFT_CONTRACT_ADDRESS,
          topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']
        }
      ]
    };

    ws.send(JSON.stringify(payload));

    setTimeout(() => {
      testRealSale(ws);
    }, 4000);
  });

  ws.on('message', async (data) => {
    const parsed = JSON.parse(data);
    if (!parsed?.params) return;

    const { topics, transactionHash } = parsed.params.result;
    const from = `0x${topics[1].slice(26)}`;
    const to = `0x${topics[2].slice(26)}`;
    const tokenId = parseInt(topics[3], 16);

    console.log(`💸 Transfer: Token ${tokenId} from ${from} to ${to}`);

    if (from.toLowerCase() !== to.toLowerCase()) {
      try {
        const sale = await fetchSalePriceFromTransaction(transactionHash, to);

        if (!sale) {
          console.log('⚠️ No sale detected, skipping.');
          return;
        }

        const { totalPaid, sellerReceived, marketplaceFee, royaltiesFee } = sale;

        const channel = await client.channels.fetch(process.env.CHANNEL_ID_SALES);

        const metadataUrl = `https://berachain-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}/getNFTMetadata?contractAddress=${process.env.NFT_CONTRACT_ADDRESS}&tokenId=${tokenId}`;
        const metaResponse = await fetch(metadataUrl);
        const metaJson = await metaResponse.json();

        const imageUrl = metaJson?.media?.[0]?.gateway || null;
        const nftName = metaJson?.title || `Token #${tokenId}`;

        const nftLink = `https://marketplace.kingdomly.app/collection/berachain/b-side-4/${tokenId}`;
        const fromLink = `https://marketplace.kingdomly.app/inventory/${from}`;
        const toLink = `https://marketplace.kingdomly.app/inventory/${to}`;

        const embed = {
          title: `🎉 New B-Side Sale!`,
          description: `[**${nftName}**](${nftLink}) sold!`,
          fields: [
            { name: 'Token ID', value: `[#${tokenId}](${nftLink})`, inline: true },
            { name: 'Seller', value: `[${from.slice(0, 6)}...${from.slice(-4)}](${fromLink})`, inline: true },
            { name: 'Buyer', value: `[${to.slice(0, 6)}...${to.slice(-4)}](${toLink})`, inline: true },
            { name: 'Buyer Paid', value: `${formatBera(totalPaid)} BERA`, inline: true },
            { name: 'Seller Received', value: `${formatBera(sellerReceived)} BERA`, inline: true },
            { name: 'Marketplace Fee', value: `${formatBera(marketplaceFee)} BERA`, inline: true },
            { name: 'Royalties', value: `${formatBera(royaltiesFee)} BERA`, inline: true },
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

function formatBera(wei) {
  return (Number(wei) / 1e18).toFixed(4);
}

async function fetchSalePriceFromTransaction(txHash, buyerAddress) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      console.log('⚠️ No receipt found, skipping...');
      return null;
    }

    console.log('🧩 Full Transaction Receipt (structured):', {
      transactionHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to,
      status: receipt.status,
      logsCount: receipt.logs.length,
      gasUsed: receipt.gasUsed?.toString(),
      cumulativeGasUsed: receipt.cumulativeGasUsed?.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
    });

    console.log('📚 Transaction Logs:');
    for (const log of receipt.logs) {
      console.log('Log', log);
    }

    const escrowLogs = receipt.logs.filter(log =>
      log.address.toLowerCase() === '0x0000000000000068f116a894984e2db1123eb395'
    );

    if (escrowLogs.length === 0) {
      console.warn('⚠️ No Kingdomly escrow logs found.');
      return null;
    }

    const chunks = [];
    for (const log of escrowLogs) {
      const rawData = log.data.slice(2); // Remove '0x'
      const splitChunks = rawData.match(/.{1,64}/g) || [];
      for (const chunk of splitChunks) {
        const value = BigInt('0x' + chunk);
        if (value > 0n) {
          chunks.push(value);
        }
      }
    }

    console.log('⚡ Kingdomly escrow chunks found:', chunks.map(v => Number(v) / 1e18));

    // Remove crazy numbers (outside 0.01–10,000 BERA)
    const candidates = chunks.filter(v => {
      const num = Number(v) / 1e18;
      return num >= 0.01 && num <= 10000;
    });

    if (candidates.length === 0) {
      console.warn('⚠️ No valid sale candidates.');
      return null;
    }

    // Pick largest candidate
    candidates.sort((a, b) => Number(b) - Number(a));
    const totalPaid = candidates[0];
    const others = candidates.slice(1);

    const royaltiesFee = others.find(f => {
      const ratio = Number(f) / Number(totalPaid);
      return ratio > 0.045 && ratio < 0.055;
    }) || 0n;

    const marketplaceFee = others.find(f => Number(f) / 1e18 < 0.1) || 0n;

    const sellerReceived = totalPaid - marketplaceFee - royaltiesFee;

    console.log('✅ Kingdomly parsed:');
    console.log(`- Total Paid: ${formatBera(totalPaid)} BERA`);
    console.log(`- Seller Received: ${formatBera(sellerReceived)} BERA`);
    console.log(`- Marketplace Fee: ${formatBera(marketplaceFee)} BERA`);
    console.log(`- Royalties Fee: ${formatBera(royaltiesFee)} BERA`);

    return { totalPaid, sellerReceived, marketplaceFee, royaltiesFee };
  } catch (err) {
    console.error('❌ Error parsing sale:', err);
    return null;
  }
}

// 🧪 Test by finding real sale
async function testRealSale(ws) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    console.log('⚡ Test: Scanning recent blocks for real sale...');

    let currentBlock = await provider.getBlockNumber();
    console.log('🧩 Current block:', currentBlock);

    const fromBlock = Math.max(currentBlock - 3000, 0);
    const toBlock = currentBlock;

    const filter = {
      address: process.env.NFT_CONTRACT_ADDRESS,
      topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'],
      fromBlock,
      toBlock
    };

    const logs = await provider.getLogs(filter);
    console.log(`📦 Found ${logs.length} transfer logs.`);

    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      const txHash = log.transactionHash;
      const topics = log.topics;
      const from = `0x${topics[1].slice(26)}`;
      const to = `0x${topics[2].slice(26)}`;

      console.log(`🔍 Checking token ${parseInt(topics[3], 16)} from ${from} to ${to}`);

      const sale = await fetchSalePriceFromTransaction(txHash, to);

      if (sale) {
        console.log(`✅ Found sale: ${formatBera(sale.totalPaid)} BERA`);
        console.log('🔔 Emitting simulated WebSocket sale...');
        const fakeEvent = {
          params: {
            result: {
              topics,
              transactionHash: txHash
            }
          }
        };
        ws.emit('message', JSON.stringify(fakeEvent));
        return;
      }
    }

    console.warn('❌ No real sales found.');
  } catch (err) {
    console.error('❌ Test fetch error:', err.message);
  }
}
