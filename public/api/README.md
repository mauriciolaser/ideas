# IdeaBoard API - Backend PHP

## Estructura

```
ideaboard-api/
├── api/
│   ├── index.php      ← Router único (punto de entrada)
│   └── db.php         ← Conexión MySQLi + helpers
└── actions/
    ├── .htaccess      ← Protección de acceso directo
    ├── createBoard.php
    ├── getBoard.php
    ├── createNote.php
    ├── updateNote.php
    └── deleteNote.php
```

## Configuración

### 1. Base de datos
Ejecuta el script `ideaboard_schema.sql` en MySQL para crear las tablas.

### 2. Credenciales
Edita `api/db.php` y configura las credenciales:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'vallhzty_board');
define('DB_PASS', 'TU_PASSWORD_AQUI');  // ← Configurar
define('DB_NAME', 'vallhzty_board');
```

### 3. Deploy
Sube los archivos a tu servidor:
- `/api/` → `board.valledemajes.website/api/`
- `/actions/` → `board.valledemajes.website/actions/`

---

## Endpoints

### Crear tablero
```
POST /api/index.php?action=createBoard
Body (opcional): { "title": "Mi Tablero" }

Response 201:
{
  "id": 1,
  "token": "a1b2c3d4...",
  "title": "Mi Tablero"
}
```

### Obtener tablero + notas
```
GET /api/index.php?action=getBoard&id=1
Header: X-BOARD-TOKEN: a1b2c3d4...

Response 200:
{
  "board": {
    "id": 1,
    "title": "Mi Tablero",
    "created_at": "2025-01-01 12:00:00",
    "updated_at": "2025-01-01 12:00:00"
  },
  "notes": [
    {
      "id": 1,
      "board_id": 1,
      "content": "Texto",
      "x": 100,
      "y": 100,
      "w": 200,
      "h": 150,
      "color": "#FFFFA5",
      "z_index": 1,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### Crear nota
```
POST /api/index.php?action=createNote
Header: X-BOARD-TOKEN: a1b2c3d4...
Body:
{
  "board_id": 1,
  "x": 100,
  "y": 200,
  "content": "Mi nota",
  "color": "#FFFFA5"
}

Response 201: { nota completa }
```

### Actualizar nota (parcial)
```
PATCH /api/index.php?action=updateNote&id=1
Header: X-BOARD-TOKEN: a1b2c3d4...
Body:
{
  "x": 300,
  "y": 400,
  "content": "Texto actualizado"
}

Campos permitidos: x, y, w, h, content, color, z_index

Response 200: { nota actualizada }
```

### Eliminar nota
```
DELETE /api/index.php?action=deleteNote&id=1
Header: X-BOARD-TOKEN: a1b2c3d4...

Response 200:
{
  "deleted": true,
  "id": 1
}
```

---

## Códigos de Error

| Código | Significado |
|--------|-------------|
| 400 | Parámetro faltante o inválido |
| 403 | Token faltante o inválido |
| 404 | Recurso no encontrado |
| 405 | Método HTTP no permitido |
| 500 | Error interno del servidor |

Formato de error:
```json
{
  "error": "Mensaje descriptivo"
}
```

---

## Autenticación

- No hay usuarios ni sesiones
- Cada tablero tiene un token único de 64 caracteres
- El token se genera al crear el tablero
- Se envía en cada request vía:
  - Header: `X-BOARD-TOKEN`
  - O query param: `?token=xxx`

---

## CORS

La API permite requests desde cualquier origen (configurado para desarrollo).
Para producción, considera restringir los orígenes en `api/index.php`.
