# comBot — Holder Verification Discord Bot for B Side

comBot is a custom Discord bot designed for the **B Side** NFT community by Hardcodepunk (Frieder Jan Moerman) on **Berachain**. It provides **wallet-based verification** for NFT holders, assigns roles based on ownership of the collection, and includes security and UX features inspired bythe **Booga Beras** Discord bot. Instead of an Opensea bio flow, opted for signing a message with wallet on a frontend.

---

## Features

- **Wallet Verification via Message Signing**  
  Users verify by signing a message with their wallet (e.g. MetaMask or Rabby..) and submitting the signature directly in Discord via a modal.

- **ERC-721 NFT Ownership Check**  
  Verifies ownership of the official B Side collection:  
  `0xfb497d7491ac6ec07a3f102d2c37f456b067bbe1` (Berachain Mainnet).

  ([On Kingdomly](https://marketplace.kingdomly.app/collection/berachain/0xfb497d7491ac6ec07a3f102d2c37f456b067bbe1))
  ([On MagicEden](https://magiceden.io/collections/berachain/0xfb497d7491ac6ec07a3f102d2c37f456b067bbe1))
  https://opensea.io/collection/b-side-4
  ([On Opensea](https://opensea.io/collection/b-side-4))

  Founded by FedPed and 0x_moonlight (Hardcodepunk, Frieder Jan Moerman.. )

- **Automatic Role Assignment**  
  Grants Discord roles based on NFT ownership status.

- **Session Management & Rate Limiting**  
  Prevents abuse with command cooldowns and auto-clears previous verification sessions when a new one starts.

- **Security First**
  - Only cryptographic signature verification
  - Wallet address is recovered directly from the signature
  - Signature data is never stored in full

---

## Tech Stack

- **Node.js & Javascript**
- **Discord.js**
- **ethers.js** for signature recovery and on-chain data
- **Berachain Mainnet RPC**
- **Vercel** for signer frontend
- **Railway** for deploying

---

## Verification Flow

1. User types `/verify` in a Discord server where comBot is installed.
2. Bot sends a button linking to the signer page.
3. User signs the provided message with connected wallet.
4. Bot opens a Discord modal to collect the signature.
5. Bot recovers the wallet address and checks NFT ownership.
6. If verified, the user is assigned the appropriate role!
7. Appoints roles based on amount of NFTs owned with appropriate message.

---

## Setup & Deployment

### 1. Clone the Repo

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file:

```env
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
NFT_CONTRACT_ADDRESS=0xfb497d7491ac6ec07a3f102d2c37f456b067bbe1
RPC_URL=https://rpc.berachain.example.com
ROLE_ID=your_verified_role_id
GUILD_ID=your_discord_server_id
```

### 4. Run the Bot

```bash
node index.js
```

---

## To-Do / Roadmap

- [x] Wallet signature verification via MetaMask/Rabby
- [x] Role assignment based on ERC-721 holdings
- [x] Modal input for signature submission
- [x] Session clearing and rate limiting
- [x] Cron job to check if user still holds same amount ofNFTs and if not, remove role.
- [ ] Multi-collection support
- [ ] Sales tracker
- [ ] Notifications for role revocation

---

## Credits & Inspiration

- Inspired by UX of **Booga Beras Bot**
- Built for the **B Side** NFT project & community
- Powered by **Berachain**

---

## Artist

[![X](https://img.shields.io/badge/X-FedPed__BSide-000?logo=x&logoColor=white&style=flat-square)](https://x.com/FedPed_BSide)

---

## License

Free to use, fork, and improve with credit.
