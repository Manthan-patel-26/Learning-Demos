/**
 * ============================================================
 * DAY 22: API INTEGRATION TEST SUITE
 * ============================================================
 * Integration tests: test multiple layers together (HTTP → Express → handler)
 * vs Unit tests: test one function in isolation.
 *
 * Supertest: makes real HTTP requests to your Express app
 *   without starting a server on a port.
 *
 * Run: cd backend && npm test
 * Run with coverage: npm test -- --coverage
 *
 * TEST STRUCTURE (AAA pattern):
 *   Arrange — set up test data
 *   Act     — make the HTTP request
 *   Assert  — check the response
 */

import request from "supertest";  // supertest wraps your express app
import { app, resetStore } from "../index";

// ─── SETUP & TEARDOWN ─────────────────────────────────────
// beforeEach: runs before EVERY test — ensures test isolation!
// Tests should NEVER depend on the order they run.
// Each test must leave the data in a predictable state.
beforeEach(() => {
  resetStore(); // Restore users array to known state before each test
});

// ─────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────
describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/users
// ─────────────────────────────────────────────────────────
describe("GET /api/users", () => {
  it("returns 200 with array of users", async () => {
    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(2);
  });

  it("returns users with correct fields", async () => {
    const res = await request(app).get("/api/users");
    const user = res.body.data[0];

    // Check shape of user object — don't rely on specific values unless important
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("createdAt");
  });

  it("returns correct content-type header", async () => {
    const res = await request(app).get("/api/users");
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});

// ─────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────
describe("GET /api/users/:id", () => {
  it("returns 200 with user when ID exists", async () => {
    const res = await request(app).get("/api/users/1");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("success");
    expect(res.body.data.id).toBe("1");
    expect(res.body.data.name).toBe("Alice");
  });

  it("returns 404 with error when ID does not exist", async () => {
    const res = await request(app).get("/api/users/999");

    expect(res.status).toBe(404);
    expect(res.body.status).toBe("error");
    expect(res.body.error.code).toBe("NOT_FOUND");
    // Check message contains useful info
    expect(res.body.error.message).toContain("999");
  });

  it("returns 404 for non-numeric IDs", async () => {
    const res = await request(app).get("/api/users/nonexistent");
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────
// POST /api/users
// ─────────────────────────────────────────────────────────
describe("POST /api/users", () => {
  // ── Happy Path ──────────────────────────────────────────
  it("creates a user and returns 201", async () => {
    const newUser = { name: "Charlie", email: "charlie@example.com", role: "user" };

    const res = await request(app)
      .post("/api/users")
      .send(newUser)                          // .send() sets body + Content-Type: application/json
      .set("Content-Type", "application/json");

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("success");
    expect(res.body.data.name).toBe("Charlie");
    expect(res.body.data.email).toBe("charlie@example.com");
    expect(res.body.data.id).toBeDefined();     // Server generated the ID
    expect(res.body.data.createdAt).toBeDefined();
  });

  it("newly created user appears in GET /api/users", async () => {
    // Create a user
    await request(app).post("/api/users").send({ name: "Dave", email: "dave@example.com" });

    // Verify it's now in the list
    const listRes = await request(app).get("/api/users");
    const emails = listRes.body.data.map((u: { email: string }) => u.email);
    expect(emails).toContain("dave@example.com");
    expect(listRes.body.total).toBe(3); // Was 2, now 3
  });

  it("defaults role to 'user' when not provided", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Eve", email: "eve@example.com" });

    expect(res.status).toBe(201);
    expect(res.body.data.role).toBe("user");
  });

  it("normalizes email to lowercase", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Frank", email: "FRANK@EXAMPLE.COM" });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("frank@example.com");
  });

  // ── Validation Errors ───────────────────────────────────
  it("returns 400 when name is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ email: "noname@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.name).toBeDefined();
  });

  it("returns 400 when email is invalid", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Valid Name", email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.email).toBeDefined();
  });

  it("returns 400 when email is missing", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Valid Name" });

    expect(res.status).toBe(400);
  });

  // ── Conflict ────────────────────────────────────────────
  it("returns 409 when email is already taken", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Alice Clone", email: "alice@example.com" }); // Already exists!

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
    expect(res.body.error.message).toContain("alice@example.com");
  });

  it("email uniqueness check is case-insensitive", async () => {
    const res = await request(app)
      .post("/api/users")
      .send({ name: "Alice Clone", email: "ALICE@EXAMPLE.COM" });

    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────
// PATCH /api/users/:id
// ─────────────────────────────────────────────────────────
describe("PATCH /api/users/:id", () => {
  it("updates user name and returns updated user", async () => {
    const res = await request(app)
      .patch("/api/users/1")
      .send({ name: "Alice Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Alice Updated");
    expect(res.body.data.email).toBe("alice@example.com"); // Unchanged
  });

  it("returns 404 when patching non-existent user", async () => {
    const res = await request(app).patch("/api/users/999").send({ name: "Ghost" });
    expect(res.status).toBe(404);
  });

  it("patch is reflected in subsequent GET", async () => {
    await request(app).patch("/api/users/1").send({ role: "guest" });
    const getRes = await request(app).get("/api/users/1");
    expect(getRes.body.data.role).toBe("guest");
  });
});

// ─────────────────────────────────────────────────────────
// DELETE /api/users/:id
// ─────────────────────────────────────────────────────────
describe("DELETE /api/users/:id", () => {
  it("returns 204 No Content on successful delete", async () => {
    const res = await request(app).delete("/api/users/1");
    expect(res.status).toBe(204);
    expect(res.body).toEqual({}); // No body on 204
  });

  it("deleted user no longer appears in user list", async () => {
    await request(app).delete("/api/users/1");

    const listRes = await request(app).get("/api/users");
    const ids = listRes.body.data.map((u: { id: string }) => u.id);
    expect(ids).not.toContain("1");
    expect(listRes.body.total).toBe(1);
  });

  it("returns 404 when deleting non-existent user", async () => {
    const res = await request(app).delete("/api/users/999");
    expect(res.status).toBe(404);
  });

  it("returns 404 on second delete of same user (idempotency check)", async () => {
    await request(app).delete("/api/users/1"); // First delete: 204
    const res = await request(app).delete("/api/users/1"); // Second delete: 404
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────
// COMPLEX SCENARIOS (multi-step tests)
// ─────────────────────────────────────────────────────────
describe("Full CRUD workflow", () => {
  it("create → read → update → delete cycle works correctly", async () => {
    // ARRANGE + ACT: Create
    const createRes = await request(app)
      .post("/api/users")
      .send({ name: "Test User", email: "test@example.com", role: "user" });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.data.id;

    // Read
    const readRes = await request(app).get(`/api/users/${userId}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.name).toBe("Test User");

    // Update
    const updateRes = await request(app)
      .patch(`/api/users/${userId}`)
      .send({ name: "Updated User" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Updated User");

    // Delete
    const deleteRes = await request(app).delete(`/api/users/${userId}`);
    expect(deleteRes.status).toBe(204);

    // Verify gone
    const finalRes = await request(app).get(`/api/users/${userId}`);
    expect(finalRes.status).toBe(404);
  });
});
