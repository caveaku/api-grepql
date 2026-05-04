import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { PrismaClient, Status, Priority } from "@prisma/client";

const prisma = new PrismaClient();

// ── JSON Schema definitions (used by Fastify for validation + OpenAPI) ─────────

const TaskSchema = {
  type: "object",
  properties: {
    id:          { type: "string" },
    title:       { type: "string" },
    description: { type: "string", nullable: true },
    status:      { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] },
    priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    dueDate:     { type: "string", format: "date-time", nullable: true },
    createdAt:   { type: "string", format: "date-time" },
    updatedAt:   { type: "string", format: "date-time" },
  },
};

const CreateTaskBody = {
  type: "object",
  required: ["title"],
  properties: {
    title:       { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 1000 },
    priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    dueDate:     { type: "string", format: "date-time" },
  },
};

const UpdateTaskBody = {
  type: "object",
  properties: {
    title:       { type: "string", minLength: 1, maxLength: 200 },
    description: { type: "string", maxLength: 1000 },
    status:      { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] },
    priority:    { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    dueDate:     { type: "string", format: "date-time" },
  },
};

// ── Route plugin ───────────────────────────────────────────────────────────────

export async function taskRoutes(fastify: FastifyInstance) {
  // GET /tasks
  fastify.get("/tasks", {
    schema: {
      tags: ["Tasks"],
      summary: "List all tasks",
      querystring: {
        type: "object",
        properties: {
          status:   { type: "string", enum: ["TODO", "IN_PROGRESS", "DONE", "CANCELLED"] },
          priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            count:   { type: "number" },
            data:    { type: "array", items: TaskSchema },
          },
        },
      },
    },
  }, async (req: FastifyRequest<{ Querystring: { status?: Status; priority?: Priority } }>, reply: FastifyReply) => {
    const { status, priority } = req.query;
    const tasks = await prisma.task.findMany({
      where: {
        ...(status   && { status }),
        ...(priority && { priority }),
      },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({ success: true, count: tasks.length, data: tasks });
  });

  // POST /tasks
  fastify.post("/tasks", {
    schema: {
      tags: ["Tasks"],
      summary: "Create a new task",
      body: CreateTaskBody,
      response: {
        201: { type: "object", properties: { success: { type: "boolean" }, data: TaskSchema } },
      },
    },
  }, async (req: FastifyRequest<{ Body: { title: string; description?: string; priority?: Priority; dueDate?: string } }>, reply: FastifyReply) => {
    const task = await prisma.task.create({
      data: {
        title:       req.body.title,
        description: req.body.description,
        priority:    req.body.priority,
        dueDate:     req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      },
    });
    return reply.status(201).send({ success: true, data: task });
  });

  // GET /tasks/:id
  fastify.get("/tasks/:id", {
    schema: {
      tags: ["Tasks"],
      summary: "Get task by ID",
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" }, data: TaskSchema } },
        404: { type: "object", properties: { success: { type: "boolean" }, error: { type: "string" } } },
      },
    },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return reply.status(404).send({ success: false, error: "Task not found" });
    return reply.send({ success: true, data: task });
  });

  // PATCH /tasks/:id
  fastify.patch("/tasks/:id", {
    schema: {
      tags: ["Tasks"],
      summary: "Update a task",
      params: { type: "object", properties: { id: { type: "string" } } },
      body: UpdateTaskBody,
      response: {
        200: { type: "object", properties: { success: { type: "boolean" }, data: TaskSchema } },
        404: { type: "object", properties: { success: { type: "boolean" }, error: { type: "string" } } },
      },
    },
  }, async (req: FastifyRequest<{ Params: { id: string }; Body: Partial<{ title: string; description: string; status: Status; priority: Priority; dueDate: string }> }>, reply: FastifyReply) => {
    try {
      const task = await prisma.task.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
        },
      });
      return reply.send({ success: true, data: task });
    } catch {
      return reply.status(404).send({ success: false, error: "Task not found" });
    }
  });

  // DELETE /tasks/:id
  fastify.delete("/tasks/:id", {
    schema: {
      tags: ["Tasks"],
      summary: "Delete a task",
      params: { type: "object", properties: { id: { type: "string" } } },
      response: {
        200: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } },
        404: { type: "object", properties: { success: { type: "boolean" }, error: { type: "string" } } },
      },
    },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await prisma.task.delete({ where: { id: req.params.id } });
      return reply.send({ success: true, message: "Task deleted" });
    } catch {
      return reply.status(404).send({ success: false, error: "Task not found" });
    }
  });

  // GET /tasks/stats
  fastify.get("/tasks/stats", {
    schema: {
      tags: ["Tasks"],
      summary: "Get task statistics",
    },
  }, async (_req, reply) => {
    const [total, byStatus, byPriority] = await Promise.all([
      prisma.task.count(),
      prisma.task.groupBy({ by: ["status"],   _count: true }),
      prisma.task.groupBy({ by: ["priority"], _count: true }),
    ]);

    return reply.send({
      success: true,
      data: {
        total,
        byStatus:   Object.fromEntries(byStatus.map(  (s) => [s.status,   s._count])),
        byPriority: Object.fromEntries(byPriority.map((p) => [p.priority, p._count])),
      },
    });
  });
}
