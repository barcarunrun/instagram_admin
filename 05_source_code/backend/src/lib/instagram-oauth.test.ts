import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createInstagramExistingTokenSession } from "./instagram-oauth.js";

const originalFetch = global.fetch;
const envKeys = [
  "IG_ACCESS_TOKEN",
  "IG_USER_ID",
  "IG_PAGE_ID",
  "IG_ACCOUNT_NAME",
  "IG_PAGE_NAME",
  "IG_TOKEN_EXPIRES_AT",
];
const originalEnv = new Map(envKeys.map((key) => [key, process.env[key]]));

function createJsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

describe("createInstagramExistingTokenSession", () => {
  beforeEach(() => {
    process.env.IG_ACCESS_TOKEN = "token-for-test";
    process.env.IG_USER_ID = "17841401895574547";
    process.env.IG_ACCOUNT_NAME = "   ";
    process.env.IG_PAGE_NAME = "";
    delete process.env.IG_PAGE_ID;
    delete process.env.IG_TOKEN_EXPIRES_AT;
  });

  afterEach(() => {
    global.fetch = originalFetch;

    for (const key of envKeys) {
      const value = originalEnv.get(key);

      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  });

  it("uses me/accounts and falls back to the IG profile when the page response lacks Instagram fields", async () => {
    const requestedUrls: URL[] = [];

    global.fetch = (async (input) => {
      const url = new URL(String(input));
      requestedUrls.push(url);

      if (url.pathname === "/v23.0/me/permissions") {
        return createJsonResponse({
          data: [
            { permission: "pages_show_list", status: "granted" },
            { permission: "instagram_content_publish", status: "granted" },
            { permission: "instagram_basic", status: "granted" },
          ],
        });
      }

      if (url.pathname === "/v23.0/me/accounts") {
        return createJsonResponse({
          data: [
            {
              id: "110930950610745",
              name: "マイクロラーニングプラットフォーム「ハニーポッサム」",
            },
          ],
        });
      }

      if (url.pathname === `/v23.0/${process.env.IG_USER_ID}`) {
        return createJsonResponse({
          id: process.env.IG_USER_ID,
          username: "eiichi1",
          name: "Eiichi Sugiyama",
        });
      }

      throw new Error(`Unexpected fetch: ${url.toString()}`);
    }) as typeof global.fetch;

    const result = await createInstagramExistingTokenSession({
      actorKey: "user_demo",
    });

    assert.equal(result.accounts.length, 1);
    assert.equal(result.accounts[0]?.accountId, process.env.IG_USER_ID);
    assert.equal(result.accounts[0]?.accountName, "eiichi1");
    assert.equal(result.accounts[0]?.facebookPageId, "110930950610745");
    assert.equal(
      result.accounts[0]?.pageName,
      "マイクロラーニングプラットフォーム「ハニーポッサム」",
    );
    assert.deepEqual(result.accounts[0]?.permissions, [
      "pages_show_list",
      "content_publish",
      "instagram_basic",
    ]);
    assert.equal(result.accounts[0]?.status, "active");

    assert.deepEqual(
      requestedUrls.map((url) => url.pathname),
      [
        "/v23.0/me/permissions",
        "/v23.0/me/accounts",
        `/v23.0/${process.env.IG_USER_ID}`,
      ],
    );
    assert.match(
      requestedUrls[1]?.searchParams.get("fields") ?? "",
      /connected_instagram_account/,
    );
  });
});
