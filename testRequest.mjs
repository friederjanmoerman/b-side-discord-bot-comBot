import fetch from "node-fetch";

async function testVerify() {
  const response = await fetch("http://localhost:3001/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      discordId: "415215423756173333", 
      wallet: "0x89EB24605D770621bEd86bf335cF99a8B0Ec8858", 
    }),
  });

  const data = await response.json();
  console.log("✅ API Response:", data);
}

testVerify();


