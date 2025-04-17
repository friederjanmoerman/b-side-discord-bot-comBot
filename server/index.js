import express from "express";
import { checkNFTHolding } from "./verifyWallet.js";
import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";

dotenv.config();

const app = express();
const port = process.env.PORT;

app.use(express.json());

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

client.login(process.env.DISCORD_BOT_TOKEN);

app.post("/verify", async (req, res) => {
  const { discordId, wallet } = req.body;

  try {
    const isHolder = await checkNFTHolding(wallet);
    if (!isHolder) return res.status(403).json({ error: "Not a holder" });

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    const member = await guild.members.fetch(discordId);

    await member.roles.add(process.env.ROLE_ID);
    return res.json({ success: true, message: "Role assigned" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal Error" });
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
