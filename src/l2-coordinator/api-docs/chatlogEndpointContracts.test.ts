import { describe, expect, it } from "vitest";
import {
  CHATLOG_ENDPOINT_CONTRACTS,
  REQUIRED_CHATLOG_ENDPOINTS,
  REQUIRED_CHATLOG_ENDPOINT_PATHS,
  type ChatlogEndpointContract,
} from "./chatlogEndpointContracts";

describe("chatlog endpoint contracts", () => {
  it("covers every endpoint family required by Task 02", () => {
    const paths = new Set(CHATLOG_ENDPOINT_CONTRACTS.map((contract) => contract.path));

    for (const path of REQUIRED_CHATLOG_ENDPOINT_PATHS) {
      expect(paths.has(path), `missing endpoint contract for ${path}`).toBe(true);
    }
  });

  it("covers every required endpoint method/path pair", () => {
    const methodPaths = new Set(
      CHATLOG_ENDPOINT_CONTRACTS.map((contract) => `${contract.method} ${contract.path}`),
    );

    for (const [method, path] of REQUIRED_CHATLOG_ENDPOINTS) {
      expect(methodPaths.has(`${method} ${path}`), `missing endpoint contract for ${method} ${path}`).toBe(true);
    }
  });

  it("documents raw/UI fields, state shapes, pagination, and privacy for each endpoint", () => {
    for (const contract of CHATLOG_ENDPOINT_CONTRACTS) {
      assertContractFields(contract);
    }
  });

  it("marks sensitive fields that must not reach ordinary UI or diagnostics", () => {
    const allSensitiveFields = new Set(
      CHATLOG_ENDPOINT_CONTRACTS.flatMap((contract) => contract.privacySensitiveFields),
    );

    expect([...allSensitiveFields]).toEqual(
      expect.arrayContaining([
        "dataKey",
        "api_key",
        "token",
        "content",
        "raw_content",
        "media_path",
        "store_path",
        "local_path",
      ]),
    );
  });

  it("keeps L4 and L2 responsibilities explicit", () => {
    expect(
      CHATLOG_ENDPOINT_CONTRACTS.every(
        (contract) => contract.l4Responsibility.includes("raw") && contract.l2Responsibility.includes("UI"),
      ),
    ).toBe(true);
  });
});

function assertContractFields(contract: ChatlogEndpointContract): void {
  expect(contract.method, contract.path).toMatch(/^(GET|POST)$/);
  expect(contract.rawDto, contract.path).toMatch(/^Raw/);
  expect(contract.uiModel, contract.path).not.toMatch(/^Raw/);
  expect(contract.rawFields.length, `${contract.path} raw fields`).toBeGreaterThan(0);
  expect(contract.uiFields.length, `${contract.path} UI fields`).toBeGreaterThan(0);
  expect(contract.emptyShape.length, `${contract.path} empty shape`).toBeGreaterThan(0);
  expect(contract.errorShape.length, `${contract.path} error shape`).toBeGreaterThan(0);
  expect(contract.diagnosticFamily.length, `${contract.path} diagnostic family`).toBeGreaterThan(0);
  expect(contract.l4Responsibility.length, `${contract.path} L4 responsibility`).toBeGreaterThan(0);
  expect(contract.l2Responsibility.length, `${contract.path} L2 responsibility`).toBeGreaterThan(0);
}
