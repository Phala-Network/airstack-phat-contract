import { ethers } from "hardhat";
import "dotenv/config";
import dedent from "dedent";

async function main() {
  const OracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");

  const [deployer] = await ethers.getSigners();

  console.log('Deploying...');
  const attestor = process.env['POLYGON_PHALA_ORACLE_ATTESTOR'] ?? deployer.address;  // When deploy for real e2e test, change it to the real attestor wallet.
  const consumer = await OracleConsumerContract.deploy(attestor);
  await consumer.deployed();
  const finalMessage = dedent`
    🎉 Your Consumer Contract has been deployed successfully 🎉

    address ${consumer.address}

    Check it out here: https://polygonscan.com/address/${consumer.address}

    You can continuing deploy the default Phat Contract with following command:

    npx @phala/fn upload -b --consumerAddress=${consumer.address}
  `
  console.log(`\n${finalMessage}\n`);
  console.log('Done');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
