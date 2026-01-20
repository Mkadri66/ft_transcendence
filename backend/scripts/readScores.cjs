// Pour tester, changer le tournamentId et contractAddress.
// docker exec -it ft_transcendence-backend-1 /bin/bash
// npx hardhat run scripts/readScores.cjs --network fuji

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const contractAddress = "0x....";
  const tournamentId = 262;
  const abi = JSON.parse(
    fs.readFileSync("./blockchain/TournamentScores.json", "utf8")
  ).abi;

  const provider = hre.ethers.provider;
  const contract = new hre.ethers.Contract(
    contractAddress,
    abi,
    provider
  );

  const scores = await contract.getTournamentScores(tournamentId);
  console.log(`📊 Scores on-chain pour le tournoi ${tournamentId}:`);

  scores.forEach((s, i) => {
    console.log(
      `#${i} gameId=${s.gameId.toString()} userId=${s.userId.toString()} alias=${s.playerAlias} score=${s.score.toString()}`
    );
  });
}

main().catch(console.error);
