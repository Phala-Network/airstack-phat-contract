// *** YOU ARE LIMITED TO THE FOLLOWING IMPORTS TO BUILD YOUR PHAT CONTRACT     ***
// *** ADDING ANY IMPORTS WILL RESULT IN ERRORS & UPLOADING YOUR CODE TO PHALA  ***
// *** NETWORK WILL FAIL. IF YOU WANT TO KNOW MORE, JOIN OUR DISCORD TO SPEAK   ***
// *** WITH THE PHALA TEAM AT https://discord.gg/5HfmWQNX THANK YOU             ***
// *** FOR DOCS ON HOW TO CUSTOMIZE YOUR PC 2.0 https://bit.ly/customize-pc-2-0 ***
import "@phala/pink-env";
import {decodeAbiParameters, encodeAbiParameters, parseAbiParameters} from "viem";

type HexString = `0x${string}`;
const encodeReplyAbiParams = 'uint respType, uint id, uint256 score';
const decodeRequestAbiParams = 'uint id, address sender, address target';

function encodeReply(abiParams: string, reply: any): HexString {
  return encodeAbiParameters(parseAbiParameters(abiParams),
      reply
  );
}

function decodeRequest(abiParams: string, request: HexString): any {
  return decodeAbiParameters(parseAbiParameters(abiParams),
      request
  );
}

// Defined in OracleConsumerContract.sol
const TYPE_RESPONSE = 0;
const TYPE_ERROR = 2;

enum Error {
  BadRequestString = "BadRequestString",
  FailedToFetchData = "FailedToFetchData",
  FailedToDecode = "FailedToDecode",
  MalformedRequest = "MalformedRequest",
}

function errorToCode(error: Error): number {
  switch (error) {
    case Error.BadRequestString:
      return 1;
    case Error.FailedToFetchData:
      return 2;
    case Error.FailedToDecode:
      return 3;
    case Error.MalformedRequest:
      return 4;
    default:
      return 0;
  }
}
function stringToHex(str: string): string {
  var hex = "";
  for (var i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16);
  }
  return "0x" + hex;
}

function fetchApiStats(apiUrl: string, apiKey: string, requester: string, target: string): any {
  let headers = {
    "Content-Type": "application/json",
    "User-Agent": "phat-contract",
    "Authorization": `${apiKey}`
  };
  const sentTokensToTarget =  JSON.stringify({ query: `
  query GetTokenTransfers { ethereum: TokenTransfers(input: {filter: {from: {_in: ["${requester}"]}, to: {_eq: "${target}"}}, blockchain: ethereum}) { TokenTransfer { from { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } to { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } transactionHash } } polygon: TokenTransfers(input: {filter: {from: {_in: ["${requester}"]}, to: {_eq: "${target}"}}, blockchain: polygon}) { TokenTransfer { from { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } to { addresses domains { name } socials { dappName profileName profileTokenId profileTokenIdHex userId userAssociatedAddresses } } transactionHash } } }
  `});
  const hasLensProfile =  JSON.stringify({ query: `
  query MyQuery { Socials( input: { filter: { dappName: { _eq: lens } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName profileTokenId profileTokenIdHex }}}
  `});
  const hasFarcasterAccount =  JSON.stringify({ query: `
  query MyQuery { Socials( input: { filter: { dappName: { _eq: farcaster } identity: { _in: ["${target}"] } } blockchain: ethereum } ) { Social { profileName userId userAssociatedAddresses }}}
  `});
  const hasPrimaryEns =  JSON.stringify({ query: `
  query MyQuery { Domains(input: {filter: {owner: {_in: ["${target}"]}, isPrimary: {_eq: true}}, blockchain: ethereum}) { Domain { name owner isPrimary }}}
  `});
  const hasCommonPoaps = JSON.stringify({ query: `
  query CommonPoaps { Poaps( input: { filter: { owner: { _eq: "${target}" } } blockchain: ALL limit: 100 }) { Poap { poapEvent { poaps(input: { filter: { owner: { _eq: "${requester}" } } }) { eventId mintHash poapEvent { eventName eventURL isVirtualEvent }}}}}}
  `});
  //
  // In Phat Contract runtime, we not support async/await, you need use `pink.batchHttpRequest` to
  // send http request. The Phat Contract will return an array of response.
  //
  let response = pink.batchHttpRequest(
    [
      { url: apiUrl, method: "POST", headers, body: stringToHex(sentTokensToTarget), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasLensProfile), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasFarcasterAccount), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasPrimaryEns), returnTextBody: true },
      { url: apiUrl, method: "POST", headers, body: stringToHex(hasCommonPoaps), returnTextBody: true },
    ],
    10000 // Param for timeout in milliseconds. Your Phat Contract script has a timeout of 10 seconds
  ); // Notice the [0]. This is important bc the `pink.batchHttpRequest` function expects an array of up to 5 HTTP requests.
  console.log(response);
  checkResponse(response);
  if (response[0].statusCode !== 200) {
    console.log(
      `Fail to read Lens api with status code: ${response[0].statusCode}, error: ${
        response[0].error || response[0].body
      }}`
    );
    throw Error.FailedToFetchData;
  }
  let respBody = response[0].body;
  if (typeof respBody !== "string") {
    throw Error.FailedToDecode;
  }
  return JSON.parse(respBody);
}

function checkResponse(responses: any): boolean {
  for (let response of responses) {
    console.log(response);
  }
  return true;
}

function computeTrustScore() {

}
//
// Here is what you need to implemented for Phat Contract, you can customize your logic with
// JavaScript here.
//
// The Phat Contract will be called with two parameters:
//
// - request: The raw payload from the contract call `request` (check the `request` function in TestLensApiConsumerConract.sol).
//            In this example, it's a tuple of two elements: [requestId, profileId]
// - secrets: The custom secrets you set with the `config_core` function of the Action Offchain Rollup Phat Contract. In
//            this example, it just a simple text of the lens api url prefix. For more information on secrets, checkout the SECRETS.md file.
//
// Your returns value MUST be a hex string, and it will send to your contract directly. Check the `_onMessageReceived` function in
// OracleConsumerContract.sol for more details. We suggest a tuple of three elements: [successOrNotFlag, requestId, data] as
// the return value.
//
export default function main(request: HexString, secrets: string): HexString {
  console.log(`handle req: ${request}`);
  // Uncomment to debug the `secrets` passed in from the Phat Contract UI configuration.
  console.log(`secrets: ${secrets}`);
  let requestId, requesterAddress, targetAddress, parsedSecrets;
  try {
    [requestId, requesterAddress, targetAddress] = decodeRequest(`${decodeRequestAbiParams}`, request);
    console.log(`[${requestId}]: ${requesterAddress} ${targetAddress}`);
    parsedSecrets = JSON.parse(secrets);

  } catch (error) {
    console.info("Malformed request received");
    return encodeReply(encodeReplyAbiParams, [BigInt(TYPE_ERROR), 0n, BigInt(errorToCode(error as Error))]);
  }
  console.log(`Request received for profile ${requesterAddress} ${targetAddress}`);
  try {
    const respData = fetchApiStats(parsedSecrets.apiUrl, parsedSecrets.apiKey, requesterAddress, targetAddress);
    let stats = 0;
    console.log("response:", [TYPE_RESPONSE, requestId, stats]);
    return encodeReply(encodeReplyAbiParams, [TYPE_RESPONSE, requestId, stats]);
  } catch (error) {
    if (error === Error.FailedToFetchData) {
      throw error;
    } else {
      // otherwise tell client we cannot process it
      console.log("error:", [TYPE_ERROR, requestId, error]);
      return encodeReply(encodeReplyAbiParams, [TYPE_ERROR, requestId, errorToCode(error as Error)]);
    }
  }
}
