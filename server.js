import express from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_FILE = join(__dirname, "data.json");
const app = express();
const PORT = 3456;

app.use(express.json());

// Servir archivos estáticos del build de Vite
app.use(express.static(join(__dirname, "dist")));

const DEFAULT_TAGS = [
  { id: "api", label: "API", color: "#5b9dee" },
  { id: "front", label: "Front", color: "#e0a458" },
  { id: "back", label: "Back", color: "#6fbf8b" },
  { id: "infra", label: "Infra", color: "#b586e0" },
  { id: "otro", label: "Otro", color: "#8892a0" },
];

function readData() {
  if (!existsSync(DATA_FILE)) {
    const initial = {
      projects: ["club", "maxi", "quality"],
      tags: DEFAULT_TAGS,
      entries: {},
    };
    writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  if (!Array.isArray(data.tags)) {
    data.tags = DEFAULT_TAGS;
  }
  return data;
}


function writeData(data) {
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET tags
app.get("/api/tags", (req, res) => {
  const data = readData();
  res.json(data.tags || []);
});

// PUT tags
app.put("/api/tags", (req, res) => {
  const data = readData();
  data.tags = req.body;
  writeData(data);
  res.json({ ok: true });
});

// GET projects
app.get("/api/projects", (req, res) => {
  const data = readData();
  res.json(data.projects);
});

// PUT projects
app.put("/api/projects", (req, res) => {
  const data = readData();
  data.projects = req.body;
  writeData(data);
  res.json({ ok: true });
});

// GET all entries across all projects
app.get("/api/entries/all", (req, res) => {
  const data = readData();
  const all = [];
  for (const [project, list] of Object.entries(data.entries)) {
    if (Array.isArray(list)) {
      for (const entry of list) {
        all.push({ ...entry, project });
      }
    }
  }
  res.json(all);
});

// GET entries for a project
app.get("/api/entries/:project", (req, res) => {
  const data = readData();
  const entries = data.entries[req.params.project] || [];
  res.json(entries);
});

// PUT entries for a project
app.put("/api/entries/:project", (req, res) => {
  const data = readData();
  data.entries[req.params.project] = req.body;
  writeData(data);
  res.json({ ok: true });
});

// Fallback: servir index.html para rutas de React
app.get("/{*path}", (req, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
