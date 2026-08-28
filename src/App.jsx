import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, X, Trash2, Terminal, ChevronDown, CircleDot, Pencil, Check, ListTodo } from "lucide-react";

const DEFAULT_PROJECTS = ["club", "maxi", "quality"];

const DEFAULT_TAGS = [
  { id: "api", label: "API", color: "#5b9dee" },
  { id: "front", label: "Front", color: "#e0a458" },
  { id: "back", label: "Back", color: "#6fbf8b" },
  { id: "infra", label: "Infra", color: "#b586e0" },
  { id: "otro", label: "Otro", color: "#8892a0" },
];

const TAG_COLORS = ["#5b9dee", "#e0a458", "#6fbf8b", "#b586e0", "#e0685b", "#4fb3b3", "#d16ba5", "#a3b08c"];

const STATUSES = [
  { id: "pendiente", label: "Pendiente", color: "#e0a458" },
  { id: "resuelto", label: "Resuelto", color: "#6fbf8b" },
];

function tagInfo(id, tags) {
  return (tags || DEFAULT_TAGS).find((t) => t.id === id) || (tags || DEFAULT_TAGS)[(tags || DEFAULT_TAGS).length - 1];
}
function statusInfo(id) {
  return STATUSES.find((s) => s.id === id) || STATUSES[0];
}

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

function formatDateLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function App() {
  const [projects, setProjects] = useState(DEFAULT_PROJECTS);
  const [activeProject, setActiveProject] = useState(DEFAULT_PROJECTS[0]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);

  const [person, setPerson] = useState("");
  const [text, setText] = useState("");
  const [tag, setTag] = useState("api");
  const [status, setStatus] = useState("pendiente");
  const [date, setDate] = useState(todayISO());

  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("all");
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const newProjectInputRef = useRef(null);

  const [formError, setFormError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [justAdded, setJustAdded] = useState(false);

  const [renamingProject, setRenamingProject] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter] = useState("all");
  const [allEntries, setAllEntries] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [tagError, setTagError] = useState("");
  const newTagInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((r) => r.json())
      .then((parsed) => {
        if (Array.isArray(parsed) && parsed.length) {
          setTags(parsed);
        }
      })
      .catch((e) => console.error("No se pudo cargar los tags", e));
  }, []);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((parsed) => {
        if (Array.isArray(parsed) && parsed.length) {
          setProjects(parsed);
          setActiveProject(parsed[0]);
        }
      })
      .catch((e) => console.error("No se pudo cargar la lista de proyectos", e))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || !sidebarOpen) return;
    fetch("/api/entries/all")
      .then((r) => r.json())
      .then((parsed) => setAllEntries(Array.isArray(parsed) ? parsed : []))
      .catch(() => setAllEntries([]));
  }, [sidebarOpen, ready]);

  useEffect(() => {
    if (!ready || !activeProject) return;
    setLoading(true);
    fetch(`/api/entries/${activeProject}`)
      .then((r) => r.json())
      .then((parsed) => setEntries(Array.isArray(parsed) ? parsed : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [activeProject, ready]);

  function persistEntries(next) {
    setEntries(next);
    fetch(`/api/entries/${activeProject}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then(() => setSaveError(""))
      .catch((e) => {
        console.error("Error guardando entradas", e);
        setSaveError(
          "Se agregó la tarjeta pero no se pudo guardar de forma persistente (" +
            (e?.message || "error de almacenamiento") +
            "). Si recargás la página podría desaparecer."
        );
      });
  }

  function persistProjects(next) {
    setProjects(next);
    fetch("/api/projects", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch((e) => console.error("Error guardando proyectos", e));
  }

  function handleAddTag(e) {
    e.preventDefault();
    setTagError("");
    const label = newTagLabel.trim();
    if (!label) {
      setTagError("Escribí un nombre para el tag.");
      return;
    }
    if (tags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      setTagError("Ese tag ya existe.");
      return;
    }
    const id = label.trim().toLowerCase().replace(/\s+/g, "-");
    const color = TAG_COLORS[tags.length % TAG_COLORS.length];
    const newTag = { id, label, color };
    const next = [...tags, newTag];
    setTags(next);
    setTag(newTag.id);
    fetch("/api/tags", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    }).catch((e) => console.error("Error guardando tags", e));
    setAddingTag(false);
    setNewTagLabel("");
  }

  const peopleForProject = useMemo(() => {
    const set = new Set(entries.map((e) => e.person).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  function handleAddEntry(e) {
    e.preventDefault();
    setFormError("");

    if (!person.trim() && !text.trim()) {
      setFormError("Completá al menos el nombre y la descripción.");
      return;
    }
    if (!person.trim()) {
      setFormError("Falta el nombre.");
      return;
    }
    if (!text.trim()) {
      setFormError("Falta la descripción.");
      return;
    }

    try {
      const entry = {
        id: uid(),
        person: person.trim(),
        text: text.trim(),
        tag,
        status,
        date,
        createdAt: Date.now(),
      };
      const next = [entry, ...entries];
      persistEntries(next);
      setText("");
      setSearch("");
      setFilterTag("all");
      setFilterPerson("all");
      setFilterStatus("all");
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1800);
    } catch (err) {
      console.error("Error al agregar entrada", err);
      setFormError("Ocurrió un error inesperado al agregar la entrada: " + (err?.message || err));
    }
  }

  function handleDelete(id) {
    const target = entries.find((e) => e.id === id);
    if (!target) return;
    setConfirmDelete({ ...target, project: activeProject });
  }

  function handleDeletePending(id) {
    const target = allEntries.find((e) => e.id === id);
    if (!target) return;
    setConfirmDelete(target);
  }

  function cancelDelete() {
    setConfirmDelete(null);
  }

  function confirmDeleteAction() {
    if (!confirmDelete) return;
    const target = confirmDelete;
    setConfirmDelete(null);
    if (target.project === activeProject) {
      handleDeleteReal(target.id);
    } else {
      deleteFromProject(target.id, target.project);
    }
    setAllEntries((prev) => prev.filter((e) => e.id !== target.id));
  }

  function handleDeleteReal(id) {
    persistEntries(entries.filter((e) => e.id !== id));
  }

  function deleteFromProject(id, project) {
    fetch(`/api/entries/${project}`)
      .then((r) => r.json())
      .then((list) => {
        return fetch(`/api/entries/${project}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(list.filter((e) => e.id !== id)),
        });
      })
      .catch((e) => console.error("Error eliminando entrada", e));
  }

  function handleToggleStatus(id) {
    persistEntries(
      entries.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "pendiente" ? "resuelto" : "pendiente" }
          : e
      )
    );
  }

  function handleAddProject() {
    const name = newProjectName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name || projects.includes(name)) {
      setAddingProject(false);
      setNewProjectName("");
      return;
    }
    const next = [...projects, name];
    persistProjects(next);
    setActiveProject(name);
    setAddingProject(false);
    setNewProjectName("");
  }

  function startRenaming(p) {
    setRenamingProject(p);
    setRenameValue(p);
  }

  async function confirmRename() {
    const oldName = renamingProject;
    const newName = renameValue.trim().toLowerCase().replace(/\s+/g, "-");

    setRenamingProject(null);

    if (!oldName || !newName || newName === oldName) return;
    if (projects.includes(newName)) return;

    const nextProjects = projects.map((p) => (p === oldName ? newName : p));
    persistProjects(nextProjects);

    try {
      const res = await fetch(`/api/entries/${oldName}`);
      const oldEntries = await res.json();
      if (oldEntries && oldEntries.length) {
        await fetch(`/api/entries/${newName}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(oldEntries),
        });
      }
    } catch (e) {
      console.error("Error migrando entradas al renombrar", e);
    }

    if (activeProject === oldName) setActiveProject(newName);
  }

  const pendingTasks = useMemo(() => {
    let list = allEntries.filter((e) => e.status === "pendiente");
    if (sidebarFilter !== "all") list = list.filter((e) => e.project === sidebarFilter);
    return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [allEntries, sidebarFilter]);

  function handleDeletePending(id) {
    const target = allEntries.find((e) => e.id === id);
    if (!target) return;
    setConfirmDelete(target);
  }

  function cancelDelete() {
    setConfirmDelete(null);
  }

  const handleTogglePending = (id) => {
    const target = allEntries.find((e) => e.id === id);
    if (!target) return;
    const updated = { ...target, status: target.status === "pendiente" ? "resuelto" : "pendiente" };
    const next = allEntries.map((e) => (e.id === id ? updated : e));
    setAllEntries(next);
    const projectList = next.filter((e) => e.project === target.project).map(({ project, ...rest }) => rest);
    fetch(`/api/entries/${target.project}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectList),
    });
    if (target.project === activeProject) {
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: updated.status } : e))
      );
    }
  };

  const filteredGrouped = useMemo(() => {
    let list = entries;
    if (filterTag !== "all") list = list.filter((e) => e.tag === filterTag);
    if (filterPerson !== "all") list = list.filter((e) => e.person === filterPerson);
    if (filterStatus !== "all") list = list.filter((e) => e.status === filterStatus);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.text.toLowerCase().includes(q) || e.person.toLowerCase().includes(q)
      );
    }
    const groups = {};
    for (const e of list) {
      if (!groups[e.date]) groups[e.date] = [];
      groups[e.date].push(e);
    }
    return Object.entries(groups)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([d, items]) => [
        d,
        items.sort((a, b) => b.createdAt - a.createdAt),
      ]);
  }, [entries, filterTag, filterPerson, filterStatus, search]);

  const hasFilters =
    filterTag !== "all" || filterPerson !== "all" || filterStatus !== "all" || search.trim();

  return (
      <div style={styles.app}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::selection { background: #5b9dee55; }
        input::placeholder, textarea::placeholder { color: #5a6273; }
        select { color-scheme: dark; }
        .fade-in { animation: fadeIn .25s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: translateY(0); } }
        .entry-row:hover .del-btn { opacity: 1; }
        .tab-btn:hover { background: #20242e; }
        @media (max-width: 640px) {
          .quickadd-grid { grid-template-columns: 1fr !important; }
          .filters-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
      <style>{`
        .sidebar {
          position: fixed;
          top: 0;
          right: 0;
          height: 100vh;
          width: 280px;
          background: #161a22;
          border-left: 1px solid #232833;
          transform: translateX(100%);
          transition: transform .25s ease;
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }
        .sidebar.open { transform: translateX(0); }
        .sidebar-toggle {
          position: fixed;
          top: 50%;
          right: 0;
          transform: translateY(-50%);
          z-index: 101;
          border: 1px solid #232833;
          border-right: none;
          background: #171a21;
          color: #8892a0;
          padding: 10px 6px;
          border-radius: 8px 0 0 8px;
          cursor: pointer;
          transition: right .25s ease, color .15s;
          display: flex;
          align-items: center;
        }
        .sidebar-toggle:hover { color: #5b9dee; }
        .sidebar-toggle.shifted { right: 280px; }
      `}</style>

      <button
        className={"sidebar-toggle" + (sidebarOpen ? " shifted" : "")}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? "Cerrar tareas" : "Abrir tareas"}
      >
        {sidebarOpen ? <X size={16} /> : <ListTodo size={16} />}
      </button>

      <div className={"sidebar" + (sidebarOpen ? " open" : "")}>
        <div style={styles.sidebarHeader}>
          <ListTodo size={16} color="#5b9dee" />
          <span style={styles.sidebarTitle}>Tareas pendientes</span>
          <span style={styles.sidebarCount}>
            {pendingTasks.filter((t) => sidebarFilter === "all" || t.project === sidebarFilter).length}
          </span>
        </div>

        <div style={styles.sidebarFilters}>
          <button
            onClick={() => setSidebarFilter("all")}
            style={{
              ...styles.sidebarFilterBtn,
              ...(sidebarFilter === "all" ? styles.sidebarFilterBtnActive : {}),
            }}
          >
            Todas
          </button>
          {projects.map((p) => (
            <button
              key={p}
              onClick={() => setSidebarFilter(p)}
              style={{
                ...styles.sidebarFilterBtn,
                ...(sidebarFilter === p ? styles.sidebarFilterBtnActive : {}),
              }}
            >
              {p}
            </button>
          ))}
        </div>

        <div style={styles.sidebarList}>
          {pendingTasks.length === 0 ? (
            <div style={styles.sidebarEmpty}>¡No hay tareas pendientes!</div>
          ) : (
            pendingTasks.map((t) => {
              const ti = tagInfo(t.tag, tags);
              return (
                <div key={t.id} className="entry-row" style={styles.sidebarTask}>
                  <div style={styles.sidebarTaskBody}>
                    <div style={styles.sidebarTaskTop}>
                      <span style={styles.sidebarPerson}>{t.person}</span>
                      <span style={{ ...styles.sidebarProjectChip, color: ti.color, borderColor: ti.color + "55" }}>
                        {t.project}
                      </span>
                      <span style={{ ...styles.chip, color: ti.color, borderColor: ti.color + "55" }}>
                        {ti.label}
                      </span>
                    </div>
                    <div style={styles.sidebarTaskText}>{t.text}</div>
                  </div>
                  <div style={styles.sidebarActions}>
                    <button
                      onClick={() => handleTogglePending(t.id)}
                      style={styles.sidebarDoneBtn}
                      title="Marcar como resuelto"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleDeletePending(t.id)}
                      style={styles.sidebarDelBtn}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <Terminal size={18} color="#5b9dee" strokeWidth={2} />
            <div>
              <div style={styles.title}>bitacora_dailys</div>
              <div style={styles.subtitle}>registro de daily · yoel · QA automation</div>
            </div>
          </div>
          <div style={styles.liveDot}>
            <CircleDot size={13} color="#6fbf8b" />
            <span style={{ color: "#6fbf8b" }}>guardado automático</span>
          </div>
        </header>

        <div style={styles.tabsRow}>
          {projects.map((p) =>
            renamingProject === p ? (
              <form
                key={p}
                onSubmit={(e) => {
                  e.preventDefault();
                  confirmRename();
                }}
                style={styles.renameForm}
              >
                <input
                  ref={renameInputRef}
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  onBlur={confirmRename}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setRenamingProject(null);
                  }}
                  style={styles.renameInput}
                />
                <button
                  type="submit"
                  style={styles.renameConfirmBtn}
                  onMouseDown={(e) => e.preventDefault()}
                  title="Confirmar nombre"
                >
                  <Check size={13} />
                </button>
              </form>
            ) : (
              <button
                key={p}
                className="tab-btn"
                onClick={() => setActiveProject(p)}
                onDoubleClick={() => startRenaming(p)}
                title="Doble clic para renombrar"
                style={{
                  ...styles.tabBtn,
                  ...(p === activeProject ? styles.tabBtnActive : {}),
                }}
              >
                {p}
                {p === activeProject && (
                  <Pencil
                    size={11}
                    style={styles.tabPencil}
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenaming(p);
                    }}
                  />
                )}
              </button>
            )
          )}
          {addingProject ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAddProject();
              }}
              style={{ display: "flex", gap: 6 }}
            >
              <input
                ref={newProjectInputRef}
                autoFocus
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onBlur={() => {
                  if (!newProjectName.trim()) setAddingProject(false);
                }}
                placeholder="nombre-proyecto"
                style={styles.newProjectInput}
              />
            </form>
          ) : (
            <button
              className="tab-btn"
              onClick={() => setAddingProject(true)}
              style={styles.tabAddBtn}
              title="Agregar proyecto"
            >
              <Plus size={14} />
            </button>
          )}
        </div>

        <form onSubmit={handleAddEntry} style={styles.quickAddCard}>
          <div style={styles.promptLabel}>
            <span style={{ color: "#5b9dee" }}>$</span> nueva entrada — {activeProject}
          </div>
          <div className="quickadd-grid" style={styles.quickAddGrid}>
            <input
              list="people-list"
              value={person}
              onChange={(e) => setPerson(e.target.value)}
              placeholder="Nombre (ej: Maru)"
              style={styles.input}
            />
            <datalist id="people-list">
              {peopleForProject.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>

            <div style={{ display: "flex", gap: 6 }}>
              <select value={tag} onChange={(e) => setTag(e.target.value)} style={styles.select}>
                {tags.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setAddingTag(!addingTag)}
                style={styles.tagAddBtn}
                title="Agregar nueva categoría"
              >
                {addingTag ? <X size={13} /> : <Plus size={13} />}
              </button>
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.select}
            >
              {STATUSES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={styles.select}
            />
          </div>
          <div style={styles.quickAddBottomRow}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="¿Qué se dijo o qué cambió? (ej: dijo que modificaría el endpoint de login)"
              style={{ ...styles.input, flex: 1 }}
            />
            <button type="submit" style={styles.addBtn}>
              <Plus size={15} /> Agregar
            </button>
          </div>
          {formError && <div style={styles.formErrorText}>⚠ {formError}</div>}
          {saveError && <div style={styles.formErrorText}>⚠ {saveError}</div>}
          {justAdded && !formError && (
            <div style={styles.formSuccessText}>✓ Entrada agregada</div>
          )}
        </form>

        {addingTag && (
          <form onSubmit={handleAddTag} style={styles.newTagCard}>
            <div style={styles.promptLabel}>
              <span style={{ color: "#5b9dee" }}>$</span> nueva categoría / tag
            </div>
            <div style={styles.newTagRow}>
              <input
                ref={newTagInputRef}
                autoFocus
                value={newTagLabel}
                onChange={(e) => {
                  setNewTagLabel(e.target.value);
                  setTagError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setAddingTag(false);
                    setNewTagLabel("");
                    setTagError("");
                  }
                }}
                placeholder="ej: mesa-de-ayuda, redaccion..."
                style={{ ...styles.input, flex: 1 }}
              />
              <button type="submit" style={styles.newTagBtn}>
                <Plus size={14} /> Crear tag
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingTag(false);
                  setNewTagLabel("");
                  setTagError("");
                }}
                style={styles.newTagCancel}
              >
                <X size={14} />
              </button>
            </div>
            {tagError && <div style={styles.formErrorText}>⚠ {tagError}</div>}
          </form>
        )}

        <div className="filters-grid" style={styles.filtersGrid}>
          <div style={styles.searchWrap}>
            <Search size={14} color="#5a6273" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por texto o persona..."
              style={styles.searchInput}
            />
          </div>
          <FilterSelect
            value={filterTag}
            onChange={setFilterTag}
            label="Tag"
            options={[{ id: "all", label: "Todos" }, ...tags]}
          />
          <FilterSelect
            value={filterPerson}
            onChange={setFilterPerson}
            label="Persona"
            options={[
              { id: "all", label: "Todas" },
              ...peopleForProject.map((p) => ({ id: p, label: p })),
            ]}
          />
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            label="Estado"
            options={[{ id: "all", label: "Todos" }, ...STATUSES]}
          />
          {hasFilters && (
            <button
              onClick={() => {
                setSearch("");
                setFilterTag("all");
                setFilterPerson("all");
                setFilterStatus("all");
              }}
              style={styles.clearBtn}
            >
              <X size={13} /> limpiar
            </button>
          )}
        </div>

        <div style={styles.log}>
          {loading ? (
            <div style={styles.emptyState}>cargando registro de {activeProject}...</div>
          ) : filteredGrouped.length === 0 ? (
            <div style={styles.emptyState}>
              {entries.length === 0
                ? `Todavía no hay entradas en ${activeProject}. Cargá la primera daily de arriba ↑`
                : "Ninguna entrada coincide con el filtro actual."}
            </div>
          ) : (
            filteredGrouped.map(([d, items]) => (
              <div key={d} className="fade-in" style={styles.dateGroup}>
                <div style={styles.dateHeader}>
                  <div style={styles.dateLine} />
                  <span style={styles.dateText}>
                    {d === todayISO() ? "Hoy · " : ""}
                    {formatDateLabel(d)}
                  </span>
                  <div style={styles.dateLine} />
                </div>
                {items.map((e) => {
                  const ti = tagInfo(e.tag, tags);
                  const si = statusInfo(e.status);
                  return (
                    <div key={e.id} className="entry-row" style={styles.entryRow}>
                      <div style={{ ...styles.avatar, background: ti.color + "22", color: ti.color }}>
                        {e.person.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={styles.entryBody}>
                        <div style={styles.entryTopLine}>
                          <span style={styles.personName}>{e.person}</span>
                          <span style={{ ...styles.chip, color: ti.color, borderColor: ti.color + "55" }}>
                            {ti.label}
                          </span>
                          <button
                            onClick={() => handleToggleStatus(e.id)}
                            style={{
                              ...styles.statusChip,
                              color: si.color,
                              borderColor: si.color + "55",
                              background: si.color + "15",
                            }}
                            title="Cambiar estado"
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: si.color,
                                display: "inline-block",
                              }}
                            />
                            {si.label}
                          </button>
                        </div>
                        <div style={styles.entryText}>{e.text}</div>
                      </div>
                      <button
                        className="del-btn"
                        onClick={() => handleDelete(e.id)}
                        style={styles.delBtn}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <footer style={styles.footer}>
          {entries.length} {entries.length === 1 ? "entrada" : "entradas"} guardadas en{" "}
          <b style={{ color: "#8892a0" }}>{activeProject}</b>
        </footer>
      </div>

      {confirmDelete && (
        <div style={styles.modalOverlay} onClick={cancelDelete}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalTitle}>¿Borrar esta card?</div>
            <div style={styles.modalBody}>
              <div style={styles.modalPerson}>{confirmDelete.person} · {confirmDelete.project}</div>
              <div style={styles.modalText}>{confirmDelete.text}</div>
            </div>
            <div style={styles.modalActions}>
              <button onClick={cancelDelete} style={styles.modalCancelBtn}>Cancelar</button>
              <button onClick={confirmDeleteAction} style={styles.modalConfirmBtn}>Sí, borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, label, options }) {
  return (
    <div style={styles.filterSelectWrap}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={styles.filterSelect}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} color="#5a6273" style={styles.chevron} />
    </div>
  );
}

const mono = "'JetBrains Mono', ui-monospace, monospace";
const sans = "'Inter', system-ui, sans-serif";

const styles = {
  app: {
    minHeight: "100vh",
    background: "#12151a",
    color: "#e6e9ef",
    fontFamily: sans,
    padding: "24px 16px",
  },
  shell: { maxWidth: 780, marginLeft: "auto", marginRight: "auto" },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 10 },
  title: { fontFamily: mono, fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" },
  subtitle: { fontFamily: mono, fontSize: 11, color: "#5a6273", marginTop: 2 },
  liveDot: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: mono,
    fontSize: 11,
  },
  tabsRow: {
    display: "flex",
    gap: 6,
    marginBottom: 16,
    flexWrap: "wrap",
    borderBottom: "1px solid #232833",
    paddingBottom: 12,
  },
  tabBtn: {
    fontFamily: mono,
    fontSize: 12.5,
    padding: "7px 14px",
    borderRadius: 7,
    border: "1px solid #232833",
    background: "#171a21",
    color: "#8892a0",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  tabBtnActive: {
    background: "#1b2433",
    borderColor: "#5b9dee66",
    color: "#5b9dee",
  },
  tabPencil: {
    opacity: 0.7,
    cursor: "pointer",
  },
  renameForm: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  renameInput: {
    fontFamily: mono,
    fontSize: 12.5,
    padding: "7px 10px",
    borderRadius: 7,
    border: "1px solid #5b9dee66",
    background: "#171a21",
    color: "#e6e9ef",
    outline: "none",
    width: 120,
  },
  renameConfirmBtn: {
    padding: "7px 8px",
    borderRadius: 7,
    border: "1px solid #5b9dee66",
    background: "#5b9dee22",
    color: "#5b9dee",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  tabAddBtn: {
    fontFamily: mono,
    padding: "7px 10px",
    borderRadius: 7,
    border: "1px dashed #2a2f3a",
    background: "transparent",
    color: "#5a6273",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  newProjectInput: {
    fontFamily: mono,
    fontSize: 12.5,
    padding: "7px 10px",
    borderRadius: 7,
    border: "1px solid #5b9dee66",
    background: "#171a21",
    color: "#e6e9ef",
    outline: "none",
    width: 140,
  },
  quickAddCard: {
    background: "#171a21",
    border: "1px solid #232833",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  promptLabel: {
    fontFamily: mono,
    fontSize: 12,
    color: "#8892a0",
    marginBottom: 10,
  },
  quickAddGrid: {
    display: "grid",
    gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
    gap: 8,
    marginBottom: 8,
  },
  quickAddBottomRow: { display: "flex", gap: 8 },
  formErrorText: {
    fontFamily: mono,
    fontSize: 12,
    color: "#e0685b",
    marginTop: 8,
  },
  formSuccessText: {
    fontFamily: mono,
    fontSize: 12,
    color: "#6fbf8b",
    marginTop: 8,
  },
  input: {
    fontFamily: sans,
    fontSize: 13.5,
    padding: "9px 11px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: "#12151a",
    color: "#e6e9ef",
    outline: "none",
    width: "100%",
  },
  select: {
    fontFamily: sans,
    fontSize: 13,
    padding: "9px 11px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: "#12151a",
    color: "#e6e9ef",
    outline: "none",
    width: "100%",
  },
  addBtn: {
    fontFamily: sans,
    fontWeight: 600,
    fontSize: 13.5,
    padding: "9px 16px",
    borderRadius: 8,
    border: "none",
    background: "#5b9dee",
    color: "#0d1117",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  filtersGrid: {
    display: "grid",
    gridTemplateColumns: "1.6fr 1fr 1fr 1fr auto",
    gap: 8,
    marginBottom: 20,
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "1px solid #2a2f3a",
    borderRadius: 8,
    padding: "8px 11px",
    background: "#171a21",
  },
  searchInput: {
    fontFamily: sans,
    fontSize: 13,
    border: "none",
    background: "transparent",
    color: "#e6e9ef",
    outline: "none",
    width: "100%",
  },
  filterSelectWrap: { position: "relative" },
  filterSelect: {
    fontFamily: sans,
    fontSize: 12.5,
    padding: "8px 26px 8px 10px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: "#171a21",
    color: "#c3c9d3",
    outline: "none",
    width: "100%",
    appearance: "none",
  },
  chevron: { position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" },
  clearBtn: {
    fontFamily: mono,
    fontSize: 11.5,
    padding: "8px 10px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: "transparent",
    color: "#8892a0",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
    whiteSpace: "nowrap",
  },
  log: { display: "flex", flexDirection: "column", gap: 22, minHeight: 120 },
  emptyState: {
    fontFamily: mono,
    fontSize: 13,
    color: "#5a6273",
    textAlign: "center",
    padding: "40px 20px",
    border: "1px dashed #232833",
    borderRadius: 10,
  },
  dateGroup: { display: "flex", flexDirection: "column", gap: 10 },
  dateHeader: { display: "flex", alignItems: "center", gap: 10 },
  dateLine: { flex: 1, height: 1, background: "#232833" },
  dateText: {
    fontFamily: mono,
    fontSize: 11.5,
    color: "#5a6273",
    whiteSpace: "nowrap",
    textTransform: "capitalize",
  },
  entryRow: {
    display: "flex",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1e222b",
    background: "#151821",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  },
  entryBody: { flex: 1, minWidth: 0 },
  entryTopLine: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" },
  personName: { fontWeight: 600, fontSize: 13.5, color: "#e6e9ef" },
  chip: {
    fontFamily: mono,
    fontSize: 10.5,
    padding: "2px 7px",
    borderRadius: 5,
    border: "1px solid",
    background: "transparent",
  },
  statusChip: {
    fontFamily: mono,
    fontSize: 10.5,
    padding: "2px 8px",
    borderRadius: 5,
    border: "1px solid",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
  },
  entryText: { fontSize: 13.5, color: "#c3c9d3", lineHeight: 1.5, wordBreak: "break-word" },
  delBtn: {
    opacity: 0.5,
    transition: "opacity .15s",
    border: "none",
    background: "transparent",
    color: "#e0685b",
    cursor: "pointer",
    alignSelf: "flex-start",
    padding: 4,
  },
  footer: {
    marginTop: 24,
    textAlign: "center",
    fontFamily: mono,
    fontSize: 11,
    color: "#5a6273",
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "16px 14px",
    borderBottom: "1px solid #232833",
  },
  sidebarTitle: {
    fontFamily: mono,
    fontWeight: 700,
    fontSize: 13,
    flex: 1,
  },
  sidebarCount: {
    fontFamily: mono,
    fontSize: 11,
    background: "#5b9dee22",
    color: "#5b9dee",
    padding: "2px 8px",
    borderRadius: 8,
  },
  sidebarFilters: {
    display: "flex",
    gap: 6,
    padding: "10px 14px",
    flexWrap: "wrap",
    borderBottom: "1px solid #1e222b",
  },
  sidebarFilterBtn: {
    fontFamily: mono,
    fontSize: 11.5,
    padding: "4px 10px",
    borderRadius: 6,
    border: "1px solid #2a2f3a",
    background: "transparent",
    color: "#8892a0",
    cursor: "pointer",
  },
  sidebarFilterBtnActive: {
    background: "#5b9dee22",
    borderColor: "#5b9dee66",
    color: "#5b9dee",
  },
  sidebarList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 12,
  },
  sidebarEmpty: {
    fontFamily: mono,
    fontSize: 12,
    color: "#5a6273",
    textAlign: "center",
    padding: "30px 10px",
  },
  sidebarTask: {
    display: "flex",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #1e222b",
    background: "#12151a",
    alignItems: "flex-start",
  },
  sidebarTaskBody: { flex: 1, minWidth: 0 },
  sidebarTaskTop: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 4 },
  sidebarPerson: { fontWeight: 600, fontSize: 12.5, color: "#e6e9ef" },
  sidebarProjectChip: {
    fontFamily: mono,
    fontSize: 10,
    padding: "1px 6px",
    borderRadius: 5,
    border: "1px solid",
  },
  sidebarTaskText: {
    fontSize: 12,
    color: "#8892a0",
    lineHeight: 1.4,
    wordBreak: "break-word",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  sidebarActions: { display: "flex", flexDirection: "column", gap: 6 },
  sidebarDoneBtn: {
    border: "none",
    background: "#6fbf8b22",
    color: "#6fbf8b",
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
    display: "flex",
  },
  sidebarDelBtn: {
    border: "none",
    background: "#e0685b22",
    color: "#e0685b",
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
    display: "flex",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  modal: {
    background: "#1b1f28",
    border: "1px solid #2a2f3a",
    borderRadius: 12,
    padding: "20px 22px",
    maxWidth: 380,
    width: "90%",
    boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  },
  modalTitle: {
    fontFamily: mono,
    fontWeight: 700,
    fontSize: 15,
    color: "#e6e9ef",
    marginBottom: 12,
  },
  modalBody: {
    background: "#12151a",
    border: "1px solid #232833",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  modalPerson: {
    fontFamily: mono,
    fontSize: 11.5,
    color: "#5b9dee",
    marginBottom: 4,
  },
  modalText: {
    fontSize: 13,
    color: "#c3c9d3",
    lineHeight: 1.5,
    wordBreak: "break-word",
  },
  modalActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  modalCancelBtn: {
    fontFamily: sans,
    fontWeight: 600,
    fontSize: 13,
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #2a2f3a",
    background: "transparent",
    color: "#8892a0",
    cursor: "pointer",
  },
  modalConfirmBtn: {
    fontFamily: sans,
    fontWeight: 600,
    fontSize: 13,
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: "#e0685b",
    color: "#fff",
    cursor: "pointer",
  },
  tagAddBtn: {
    border: "1px dashed #2a2f3a",
    background: "transparent",
    color: "#5b9dee",
    borderRadius: 8,
    cursor: "pointer",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  newTagCard: {
    background: "#171a21",
    border: "1px solid #232833",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  newTagRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  newTagBtn: {
    fontFamily: sans,
    fontWeight: 600,
    fontSize: 13.5,
    padding: "9px 14px",
    borderRadius: 8,
    border: "none",
    background: "#5b9dee",
    color: "#0d1117",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  },
  newTagCancel: {
    border: "1px solid #2a2f3a",
    background: "transparent",
    color: "#8892a0",
    borderRadius: 8,
    cursor: "pointer",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    height: 38,
  },
};
