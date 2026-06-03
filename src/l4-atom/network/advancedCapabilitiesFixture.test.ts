import { describe, expect, it } from "vitest";
import fixture from "../../../e2e/fixtures/advanced-capabilities.json";

describe("advanced-capabilities P4-B fixture contract", () => {
  const routes = fixture.routes;

  it("uses backend-shaped unread sessions", () => {
    const unread = routes["/api/v1/unread"];

    expect(unread).toHaveProperty("sessions");
    expect(unread).toHaveProperty("total");
    expect(unread).not.toHaveProperty("items");
    expect(unread.sessions[0]).toMatchObject({
      chat: expect.any(String),
      username: expect.any(String),
      is_group: expect.any(Boolean),
      chat_type: expect.any(String),
      unread: expect.any(Number),
      last_msg_type: expect.any(String),
      last_sender: expect.any(String),
      summary: expect.any(String),
      timestamp: expect.any(Number),
      time: expect.any(String),
    });
  });

  it("uses backend-shaped group member rows", () => {
    const members = routes["/api/v1/members"];

    expect(members).toMatchObject({
      chat: expect.any(String),
      username: expect.any(String),
      count: expect.any(Number),
    });
    expect(members).not.toHaveProperty("items");
    expect(members.members[0]).toMatchObject({
      username: expect.any(String),
      display: expect.any(String),
      is_owner: expect.any(Boolean),
    });
  });

  it("uses backend-shaped incremental messages", () => {
    const newMessages = routes["/api/v1/new_messages"];

    expect(newMessages).toHaveProperty("count");
    expect(newMessages).toHaveProperty("messages");
    expect(newMessages).toHaveProperty("new_state");
    expect(newMessages).not.toHaveProperty("items");
    expect(newMessages.messages[0]).toMatchObject({
      chat: expect.any(String),
      username: expect.any(String),
      local_id: expect.any(Number),
      content: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it("uses backend-shaped favorites", () => {
    const favorites = routes["/api/v1/favorites"];

    expect(favorites).toHaveProperty("count");
    expect(favorites).toHaveProperty("items");
    expect(favorites.items[0]).toMatchObject({
      id: expect.any(String),
      type: expect.any(String),
      type_num: expect.any(Number),
      time: expect.any(String),
      timestamp: expect.any(Number),
      preview: expect.any(String),
      from: expect.any(String),
      chat: expect.any(String),
    });
  });
});
