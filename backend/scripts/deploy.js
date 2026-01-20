import hardhat from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const hre = hardhat;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Déploiement du smart contract TournamentScores sur Avalanche Fuji...");

  const TournamentScores = await hre.ethers.getContractFactory("TournamentScores");

  const contract = await TournamentScores.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("📌 Contrat déployé à l'adresse :", address);

  const dir = path.join(__dirname, "..", "blockchain");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  // 1️⃣ Sauvegarde de l'adresse (déjà OK)
  const addressPath = path.join(dir, "contract-address.json");
  fs.writeFileSync(
    addressPath,
    JSON.stringify(
      {
        address,
        network: "fuji",
        deployedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log("💾 Adresse enregistrée dans :", addressPath);

  // 2️⃣ 👇 AJOUT ICI : copie de l'ABI
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "TournamentScores.sol",
    "TournamentScores.json"
  );

  const abiTargetPath = path.join(dir, "TournamentScores.json");

  fs.copyFileSync(artifactPath, abiTargetPath);

  console.log("📦 ABI copiée vers :", abiTargetPath);
}

main().catch((error) => {
  console.error("❌ Erreur lors du déploiement :", error);
  process.exit(1);
});
