import { JsonRpcProvider, Contract, isAddress } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const abi = [
  "function balanceOf(address owner) view returns (uint256)"
];

const provider = new JsonRpcProvider(process.env.RPC_URL);
const contract = new Contract(process.env.NFT_CONTRACT_ADDRESS, abi, provider);

const balanceCache = new Map();
const CACHE_DURATION_MS = 15 * 1000;

export async function getNFTHolding(walletAddress) {
  try {
    if (!isAddress(walletAddress)) {
      throw new Error("Invalid wallet address format");
    }

    const cached = balanceCache.get(walletAddress.toLowerCase());
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_DURATION_MS) {
      return cached.value;
    }

    const balance = await contract.balanceOf(walletAddress);
    balanceCache.set(walletAddress.toLowerCase(), {
      value: balance,
      timestamp: now
    });

    return balance;
  } catch (err) {
    console.error("[getNFTHolding] Error:", err.message || err);
    return 0;
  }
}
