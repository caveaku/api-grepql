import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/index.js";
import { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ── Helper ─────────────────────────────────────────────────────────────────────
async function createTask(overrides = {}) {
  const res = await app.inject({
    method: "POST",
    url: "/api/tasks",
    payload: { title: "Test task", priority: "HIGH", ...overrides },
  });
  return JSON.parse(res.payload);
}

// ── Test suites ────────────────────────────────────────────────────────────────

describe("Health check", () => {
  it("GET /health returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
  });
});

describe("GET /api/tasks", () => {
  it("returns 200 with array", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tasks" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(typeof body.count).toBe("number");
  });
});

describe("POST /api/tasks", () => {
  it("creates a task with required fields only", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { title: "My new task" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.title).toBe("My new task");
    expect(body.data.status).toBe("TODO");
    expect(body.data.priority).toBe("MEDIUM");
    expect(body.data.id).toBeTruthy();
  });

  it("creates a task with all fields", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        title: "Full task",
        description: "A detailed description",
        priority: "URGENT",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.data.priority).toBe("URGENT");
    expect(body.data.description).toBe("A detailed description");
  });

  it("returns 400 when title is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { priority: "HIGH" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("returns 400 when title is empty string", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: { title: "" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("GET /api/tasks/:id", () => {
  it("returns 200 for existing task", async () => {
    const created = await createTask({ title: "Findable task" });
    const res = await app.inject({
      method: "GET",
      url: `/api/tasks/${created.data.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.title).toBe("Findable task");
  });

  it("returns 404 for non-existent task", async () => {
    const res = await app.inject({ method: "GET", url: "/api/tasks/nonexistent-id-xyz" });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(false);
    expect(body.error).toBe("Task not found");
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("updates task status", async () => {
    const created = await createTask({ title: "To update" });
    const res = await app.inject({
      method: "PATCH",
      url: `/api/tasks/${created.data.id}`,
      payload: { status: "IN_PROGRESS" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data.status).toBe("IN_PROGRESS");
    expect(body.data.title).toBe("To update"); // unchanged
  });

  it("returns 404 for non-existent task", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/tasks/nonexistent-id-xyz",
      payload: { status: "DONE" },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes an existing task", async () => {
    const created = await createTask({ title: "To delete" });
    const res = await app.inject({
      method: "DELETE",
      url: `/api/tasks/${created.data.id}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    // Verify it's actually gone
    const getRes = await app.inject({
      method: "GET",
      url: `/api/tasks/${created.data.id}`,
    });
    expect(getRes.statusCode).toBe(404);
  });

  it("returns 404 for non-existent task", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/api/tasks/nonexistent-id-xyz",
    });
    expect(res.statusCode).toBe(404);
  });
});
