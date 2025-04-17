import fetch from "node-fetch";

async function testVerify() {
  const response = await fetch("http://localhost:3001/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      discordId: "415215423756173333", 
      wallet: "0xC0708Fad27E4117705De0ddAd431593E1264B17B", 
    }),
  });

  const data = await response.json();
  console.log("✅ API Response:", data);
}

testVerify();


