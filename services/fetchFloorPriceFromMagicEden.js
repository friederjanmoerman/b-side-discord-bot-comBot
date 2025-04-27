import axios from 'axios';

let cachedFloorPrice = null;
let lastFetchTime = 0;

async function fetchFloorPriceFromMagicEden(collectionAddress) {
  const now = Date.now();

  if (cachedFloorPrice !== null && (now - lastFetchTime) < 2 * 60 * 1000) {
    return cachedFloorPrice;
  }

  try {
    const response = await axios.get(`https://api-mainnet.magiceden.dev/v3/evm/berachain/collections/${collectionAddress}`);
    const floorPrice = response.data.floorPrice / 1e18; 

    cachedFloorPrice = floorPrice;
    lastFetchTime = now;

    return floorPrice;
  } catch (error) {
    console.error('Error fetching floor price from Magic Eden:', error);
    return null;
  }
}

export default fetchFloorPriceFromMagicEden;
