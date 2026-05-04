import Fastify from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { taskRoutes } from "./routes/tasks.js";

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
    },
  });

  // ── OpenAPI / Swagger ──────────────────────────────────────────────────────
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Task Manager API",
        description: "A production-pattern REST API built with TypeScript, Fastify, and Prisma",
        version: "1.0.0",
      },
      tags: [{ name: "Tasks", description: "Task management endpoints" }],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: { docExpansion: "full" },
  });

  // ── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(taskRoutes, { prefix: "/api" });

  // ── Health check ───────────────────────────────────────────────────────────
  fastify.get("/health", { schema: { tags: ["Tasks"], summary: "Health check" } }, async () => ({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  return fastify;
}

// ── Start (only when run directly) ────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n✅ Task Manager API`);
  console.log(`   API:  http://localhost:${PORT}/api/tasks`);
  console.log(`   Docs: http://localhost:${PORT}/docs\n`);
}
