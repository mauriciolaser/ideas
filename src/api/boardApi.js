/**
 * IdeaBoard API Client
 * Comunicación con el backend PHP REST
 */

const API_BASE = 'https://board.valledemajes.website/api/index.php';

/**
 * Helper para construir headers con token
 */
function buildHeaders(token) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['X-BOARD-TOKEN'] = token;
  }
  return headers;
}

/**
 * Helper para manejar respuestas
 */
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data;
}

/**
 * Listar tableros
 * @param {string} archived - '0' (activos, default), '1' (archivados), 'all' (todos)
 * @returns {Promise<{boards: array}>}
 */
export async function listBoards(archived = '0') {
  const response = await fetch(`${API_BASE}?action=listBoards&archived=${archived}`, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse(response);
}

/**
 * Crear un nuevo tablero
 * @param {string} title - Título opcional del tablero
 * @returns {Promise<{id: number, token: string, title: string}>}
 */
export async function createBoard(title = 'Untitled') {
  const response = await fetch(`${API_BASE}?action=createBoard`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ title }),
  });
  return handleResponse(response);
}

/**
 * Obtener tablero con todas sus notas
 * @param {number} boardId - ID del tablero
 * @param {string} token - Token de acceso
 * @returns {Promise<{board: object, notes: array}>}
 */
export async function getBoard(boardId, token) {
  const response = await fetch(`${API_BASE}?action=getBoard&id=${boardId}`, {
    method: 'GET',
    headers: buildHeaders(token),
  });
  return handleResponse(response);
}

/**
 * Archivar o desarchivar un tablero
 * @param {string} token - Token de acceso
 * @param {number} boardId - ID del tablero
 * @param {boolean} archived - true para archivar, false para desarchivar
 * @returns {Promise<{id: number, archived_at: string|null}>}
 */
export async function archiveBoard(token, boardId, archived) {
  const response = await fetch(`${API_BASE}?action=archiveBoard&id=${boardId}`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify({ archived }),
  });
  return handleResponse(response);
}

/**
 * Crear una nueva nota en el tablero
 * @param {string} token - Token de acceso
 * @param {object} noteData - Datos de la nota {board_id, x, y, content?, color?}
 * @returns {Promise<object>} - Nota creada
 */
export async function createNote(token, noteData) {
  const response = await fetch(`${API_BASE}?action=createNote`, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(noteData),
  });
  return handleResponse(response);
}

/**
 * Actualizar nota (parcial)
 * @param {string} token - Token de acceso
 * @param {number} noteId - ID de la nota
 * @param {object} updates - Campos a actualizar {x?, y?, w?, h?, content?, color?, z_index?}
 * @returns {Promise<object>} - Nota actualizada
 */
export async function updateNote(token, noteId, updates) {
  const response = await fetch(`${API_BASE}?action=updateNote&id=${noteId}`, {
    method: 'PATCH',
    headers: buildHeaders(token),
    body: JSON.stringify(updates),
  });
  return handleResponse(response);
}

/**
 * Eliminar nota
 * @param {string} token - Token de acceso
 * @param {number} noteId - ID de la nota
 * @returns {Promise<{deleted: boolean, id: number}>}
 */
export async function deleteNote(token, noteId) {
  const response = await fetch(`${API_BASE}?action=deleteNote&id=${noteId}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });
  return handleResponse(response);
}