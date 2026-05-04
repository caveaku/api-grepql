const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const OpenApiValidator = require("express-openapi-validator");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Load OpenAPI spec ─────────────────────────────────────────────────────────
const spec = YAML.load(path.join(__dirname, "openapi.yaml"));

// ─── Swagger UI ────────────────────────────────────────────────────────────────
app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "Book Library API Docs",
}));

// ─── OpenAPI Request Validator ─────────────────────────────────────────────────
app.use(
  OpenApiValidator.middleware({
    apiSpec: path.join(__dirname, "openapi.yaml"),
    validateRequests: true,
    validateResponses: false,
  })
);

// ─── In-memory database ────────────────────────────────────────────────────────
let books = [
  { id: uuidv4(), title: "Clean Code", author: "Robert C. Martin", genre: "Programming", year: 2008, available: true },
  { id: uuidv4(), title: "The Pragmatic Programmer", author: "David Thomas", genre: "Programming", year: 1999, available: true },
  { id: uuidv4(), title: "Designing Data-Intensive Applications", author: "Martin Kleppmann", genre: "Engineering", year: 2017, available: false },
  { id: uuidv4(), title: "You Don't Know JS", author: "Kyle Simpson", genre: "Programming", year: 2015, available: true },
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /health
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// GET /books
app.get("/books", (req, res) => {
  let result = [...books];

  if (req.query.genre) {
    result = result.filter(b => b.genre.toLowerCase() === req.query.genre.toLowerCase());
  }
  if (req.query.author) {
    result = result.filter(b => b.author.toLowerCase().includes(req.query.author.toLowerCase()));
  }

  res.json({ success: true, count: result.length, data: result });
});

// POST /books
app.post("/books", (req, res) => {
  const book = { id: uuidv4(), ...req.body, available: true };
  books.push(book);
  res.status(201).json({ success: true, data: book });
});

// GET /books/:id
app.get("/books/:id", (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ success: false, error: "Book not found" });
  res.json({ success: true, data: book });
});

// PUT /books/:id
app.put("/books/:id", (req, res) => {
  const index = books.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Book not found" });
  books[index] = { ...books[index], ...req.body };
  res.json({ success: true, data: books[index] });
});

// DELETE /books/:id
app.delete("/books/:id", (req, res) => {
  const index = books.findIndex(b => b.id === req.params.id);
  if (index === -1) return res.status(404).json({ success: false, error: "Book not found" });
  books.splice(index, 1);
  res.json({ success: true, message: "Book deleted successfully" });
});

// PATCH /books/:id/borrow
app.patch("/books/:id/borrow", (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) return res.status(404).json({ success: false, error: "Book not found" });

  const { action } = req.body;
  if (action === "borrow" && !book.available) {
    return res.status(400).json({ success: false, error: "Book is already borrowed" });
  }
  if (action === "return" && book.available) {
    return res.status(400).json({ success: false, error: "Book is already available" });
  }

  book.available = action === "return";
  res.json({ success: true, data: book });
});

// ─── Error handler (catches OpenAPI validation errors) ─────────────────────────
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message,
    details: err.errors || [],
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n📚 Book Library API running on port ${PORT}`);
  console.log(`   API:  http://localhost:${PORT}/books`);
  console.log(`   Docs: http://localhost:${PORT}/docs\n`);
});

module.exports = app;
