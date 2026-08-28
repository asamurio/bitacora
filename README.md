# Bitácora Dailys

Aplicación web para registrar y gestionar dailys (reuniones diarias) por proyecto.

## Funcionalidades

- **Registro de entradas**: Cargá qué dijo cada persona, con tag (API, Front, Back, Infra, Otro, ¡o los que crees!) y estado (Pendiente/Resuelto)
- **Múltiples proyectos**: Tabs para separar dailys por proyecto (club, maxi, quality, etc.)
- **Filtros y búsqueda**: Filtrá por tag, persona, estado o texto libre
- **Categorías / tags personalizados**: Agregá tus propias categorías (ej: `mesa-de-ayuda`, `redaccion`) con el botón `+` junto al selector de tag. Se guardan automáticamente y aparecen en el selector y en los filtros.
- **Guardado automático**: Los datos se guardan automáticamente al crear, editar o eliminar entradas
- **Persistencia local**: Todo se guarda en un archivo JSON en tu computadora, independiente del navegador
- **Panel de tareas pendientes**: Sidebar lateral derecho (ícono en el borde) que lista todas las tareas pendientes de todos los proyectos, con filtro por tribu y botones para marcar como resuelto o eliminar
- **Eliminar cards**: Cada entrada tiene un botón de borrar (visible al hacer hover o en el sidebar) con confirmación antes de eliminar para evitar borrados accidentales

## Requisitos

- [Node.js](https://nodejs.org/) v18 o superior
- npm

## Instalación

```bash
cd bitacora-app
npm install
```

## Ejecución

### Inicio rápido (recomendado)

**Windows**: Hacé doble clic en `BitacoraDailys.bat` (podés copiarlo al escritorio).

**Linux/macOS**: Ejecutá `npm start` en la terminal.

Levanta el servidor y abre la app en el navegador automáticamente.

### Desarrollo (con hot reload)

```bash
npm run dev
```

Esto levanta dos servicios:
- **Frontend**: `http://localhost:5858` (Vite)
- **Backend**: `http://localhost:3456` (API Express)

## Estructura del proyecto

```
bitacora-app/
├── start.js             # Inicio rápido cross-platform (abre navegador)
├── server.js            # Backend Express (API REST)
├── data.json            # Archivo donde se persisten los datos
├── src/
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Punto de entrada
│   └── index.css        # Estilos base
├── index.html
├── vite.config.js       # Configuración de Vite
└── package.json
```

## API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/projects` | Obtener lista de proyectos |
| PUT | `/api/projects` | Guardar lista de proyectos |
| GET | `/api/tags` | Obtener lista de tags/categorías |
| PUT | `/api/tags` | Guardar lista de tags/categorías |
| GET | `/api/entries/all` | Obtener todas las entradas de todos los proyectos |
| GET | `/api/entries/:project` | Obtener entradas de un proyecto |
| PUT | `/api/entries/:project` | Guardar entradas de un proyecto |

## Almacenamiento de datos

Los datos se guardan en `data.json` en la raíz del proyecto:

```json
{
  "projects": ["club", "maxi", "quality"],
  "tags": [
    { "id": "api", "label": "API", "color": "#5b9dee" },
    { "id": "front", "label": "Front", "color": "#e0a458" }
  ],
  "entries": {
    "club": [
      {
        "id": "abc123",
        "person": "Maru",
        "text": "Modificó el endpoint de login",
        "tag": "api",
        "status": "resuelto",
        "date": "2026-08-26",
        "createdAt": 1724649600000
      }
    ]
  }
}
```

Podés copiar, respaldar o editar este archivo directamente.

## Tecnologías

- React 19
- Vite
- Express 5
- Lucide React (iconos)
