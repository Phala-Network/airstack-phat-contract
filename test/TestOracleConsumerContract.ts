import { expect } from "chai";
import { type Contract, type Event } from "ethers";
import { ethers } from "hardhat";
import { execSync } from "child_process";

async function waitForResponse(consumer: Contract, event: Event) {
  const [, data] = event.args!;
  // Run Phat Function
  const result = execSync(`phat-fn run --json dist/index.js -a ${data} '{"apiUrl": "https://api.airstack.xyz/gql", "apiKey": "3a41775a358a4cb99ca9a29c1f6fc486"}'`).toString();
  const json = JSON.parse(result);
  const action = ethers.utils.hexlify(ethers.utils.concat([
    new Uint8Array([0]),
    json.output,
  ]));
  // Make a response
  const tx = await consumer.rollupU256CondEq(
    // cond
    [],
    [],
    // updates
    [],
    [],
    // actions
    [action],
  );
  const receipt = await tx.wait();
  return receipt.events;
}

describe("OracleConsumerContract.sol", function () {
  it("Push and receive message", async function () {
    // Deploy the contract
    const [deployer] = await ethers.getSigners();
    const TestOracleConsumerContract = await ethers.getContractFactory("OracleConsumerContract");
    const consumer = await TestOracleConsumerContract.deploy(deployer.address);

    // Make a request
    const targetAddress = "0xeaf55242a90bb3289dB8184772b0B98562053559";
    const tx = await consumer.request(targetAddress);
    const receipt = await tx.wait();
    const reqEvents = receipt.events;
    expect(reqEvents![0]).to.have.property("event", "MessageQueued");

    // Wait for Phat Contract response
    const respEvents = await waitForResponse(consumer, reqEvents![0])

    // Check response data
    expect(respEvents[0]).to.have.property("event", "ResponseReceived");
    const [reqId, requester, target, score] = respEvents[0].args;
    expect(ethers.BigNumber.isBigNumber(reqId)).to.be.true;
    expect(target).to.equal(targetAddress);
    expect(requester).to.equal(deployer.address);
    expect(ethers.BigNumber.isBigNumber(score)).to.be.true;
  });
});
