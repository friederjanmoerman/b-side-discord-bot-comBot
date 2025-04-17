import { JsonRpcProvider } from "ethers";
import { Contract } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const abi = [
  "function balanceOf(address owner) view returns (uint256)"
];

const provider = new JsonRpcProvider(process.env.RPC_URL);
const contract = new Contract(process.env.NFT_CONTRACT_ADDRESS, abi, provider);

export async function checkNFTHolding(walletAddress) {
  const balance = await contract.balanceOf(walletAddress);
  return balance > 0n; // use BigInt literal with 'n'
}
