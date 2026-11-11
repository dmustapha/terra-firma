import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError, encodeErrorResult } from "viem";
import { describe, expect, it } from "vitest";
import { terraRouterAbi } from "./abi";
import { API_ERRORS, PLAIN, WRONG_CHAIN, classifyOwnerProbe, isRevert, plainError } from "./ui-errors";

class FakeChainMismatch extends Error {
  override name = "ConnectorChainMismatchError";
}

describe("plainError", () => {
  it("maps a decoded custom revert to plain words", () => {
    const data = encodeErrorResult({ abi: terraRouterAbi, errorName: "WifNotSellable" });
    const rev = new ContractFunctionRevertedError({ abi: terraRouterAbi, data, functionName: "sell" });
    expect(plainError(new BaseError("call failed", { cause: rev }))).toBe(PLAIN.WifNotSellable);
  });
  it("maps a wallet rejection", () => {
    const e = new BaseError("x", { cause: new UserRejectedRequestError(new Error("User rejected")) });
    expect(plainError(e)).toBe("You cancelled in your wallet.");
  });
  it("maps a wrong-chain connector error, even when nested", () => {
    expect(plainError(new FakeChainMismatch("chain 1 does not match 4663"))).toBe(WRONG_CHAIN);
    expect(plainError(new Error("wrap", { cause: new FakeChainMismatch("x") }))).toBe(WRONG_CHAIN);
  });
  it("falls back to the message / a generic line", () => {
    expect(plainError(new Error("boom"))).toBe("boom");
    expect(plainError("nope")).toBe("Something went wrong.");
    expect(plainError(new BaseError("insufficient funds for gas * price + value"))).toBe("Not enough ETH for this amount plus gas.");
  });
  it("covers the gas and self-call errors", () => {
    expect(PLAIN.InsufficientGas).toMatch(/gas/);
    expect(PLAIN.OnlySelf).toBeTruthy();
  });
  it("never promises next-epoch activation", () => {
    expect(PLAIN.NoActiveStake).toMatch(/e\+2/);
    expect(Object.values(PLAIN).join(" ")).not.toMatch(/next epoch/i);
    expect(API_ERRORS.wif_not_sellable).toBe(PLAIN.WifNotSellable);
  });
});

describe("isRevert / classifyOwnerProbe", () => {
  it("treats an execution revert as ownerless", () => {
    const e = new Error("call failed", { cause: Object.assign(new Error("execution reverted"), { name: "ExecutionRevertedError" }) });
    expect(isRevert(e)).toBe(true);
    expect(classifyOwnerProbe({ error: e })).toBe("ownerless");
  });
  it("treats an empty return as ownerless and a 32-byte word as has-owner", () => {
    expect(classifyOwnerProbe({ data: "0x" })).toBe("ownerless");
    expect(classifyOwnerProbe({ data: undefined })).toBe("ownerless");
    expect(classifyOwnerProbe({ data: `0x${"0".repeat(24)}${"ab".repeat(20)}` })).toBe("has-owner");
  });
  it("makes no claim on an RPC/network failure or odd data", () => {
    const net = Object.assign(new Error("HTTP request failed. Status: 429"), { name: "HttpRequestError" });
    expect(isRevert(net)).toBe(false);
    expect(classifyOwnerProbe({ error: net })).toBe("unknown");
    expect(classifyOwnerProbe({ data: "0x1234" })).toBe("unknown");
  });
});
