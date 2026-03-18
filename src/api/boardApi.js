const STORAGE_KEY = 'ideas-app-data';
const STORAGE_VERSION = 1;
const DEFAULT_NOTE_COLOR = '#FFFFA5';
const DEFAULT_NOTE_WIDTH = 200;
const DEFAULT_NOTE_HEIGHT = 150;
const DEFAULT_BOARD_TITLE = 'Untitled';
const ALLOWED_NOTE_FIELDS = new Set(['x', 'y', 'w', 'h', 'content', 'color', 'z_index']);

function nowIso() {
  return new Date().toISOString();
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEmptyData() {
  return {
    boards: [],
    notes: [],
    meta: {
      version: STORAGE_VERSION,
      nextBoardId: 1,
      nextNoteId: 1,
    },
  };
}

function ensureStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    throw new Error('localStorage no está disponible en este entorno.');
  }

  try {
    const probeKey = `${STORAGE_KEY}::probe`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
  } catch {
    throw new Error('No se pudo acceder a localStorage. Revisa los permisos de almacenamiento del navegador.');
  }
}

function isValidHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function toPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDate(value, fallback) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function normalizeBoard(board, fallbackDate) {
  return {
    id: toPositiveInteger(board?.id, 0),
    title: String(board?.title || DEFAULT_BOARD_TITLE).slice(0, 255) || DEFAULT_BOARD_TITLE,
    archived_at: board?.archived_at ? normalizeDate(board.archived_at, fallbackDate) : null,
    created_at: normalizeDate(board?.created_at, fallbackDate),
    updated_at: normalizeDate(board?.updated_at, fallbackDate),
  };
}

function normalizeNote(note, fallbackDate) {
  return {
    id: toPositiveInteger(note?.id, 0),
    board_id: toPositiveInteger(note?.board_id, 0),
    content: typeof note?.content === 'string' ? note.content : '',
    x: toInteger(note?.x, 100),
    y: toInteger(note?.y, 100),
    w: toInteger(note?.w, DEFAULT_NOTE_WIDTH),
    h: toInteger(note?.h, DEFAULT_NOTE_HEIGHT),
    color: isValidHexColor(note?.color) ? note.color : DEFAULT_NOTE_COLOR,
    z_index: toInteger(note?.z_index, 1),
    created_at: normalizeDate(note?.created_at, fallbackDate),
    updated_at: normalizeDate(note?.updated_at, fallbackDate),
  };
}

function sanitizeDataShape(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('La estructura importada no es valida.');
  }

  const fallbackDate = nowIso();
  const boardsInput = Array.isArray(input.boards) ? input.boards : null;
  const notesInput = Array.isArray(input.notes) ? input.notes : null;

  if (!boardsInput || !notesInput) {
    throw new Error('El archivo importado debe incluir arrays de boards y notes.');
  }

  const boards = boardsInput.map((board) => normalizeBoard(board, fallbackDate));

  if (boards.some((board) => board.id <= 0)) {
    throw new Error('Todos los boards importados deben tener un id valido.');
  }

  const boardIds = new Set(boards.map((board) => board.id));

  if (boardIds.size !== boards.length) {
    throw new Error('Los boards importados tienen ids duplicados.');
  }

  const notes = notesInput.map((note) => normalizeNote(note, fallbackDate));

  if (notes.some((note) => note.id <= 0 || note.board_id <= 0)) {
    throw new Error('Todas las notes importadas deben tener ids validos.');
  }

  if (new Set(notes.map((note) => note.id)).size !== notes.length) {
    throw new Error('Las notes importadas tienen ids duplicados.');
  }

  if (notes.some((note) => !boardIds.has(note.board_id))) {
    throw new Error('Hay notes importadas que apuntan a boards inexistentes.');
  }

  const maxBoardId = boards.reduce((max, board) => Math.max(max, board.id), 0);
  const maxNoteId = notes.reduce((max, note) => Math.max(max, note.id), 0);

  return {
    boards,
    notes,
    meta: {
      version: STORAGE_VERSION,
      nextBoardId: Math.max(toPositiveInteger(input.meta?.nextBoardId, 1), maxBoardId + 1),
      nextNoteId: Math.max(toPositiveInteger(input.meta?.nextNoteId, 1), maxNoteId + 1),
    },
  };
}

function readData() {
  ensureStorage();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const emptyData = createEmptyData();
    writeData(emptyData);
    return emptyData;
  }

  try {
    return sanitizeDataShape(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`No se pudieron leer los datos guardados: ${error.message}`);
    }
    throw new Error('No se pudieron leer los datos guardados.');
  }
}

function writeData(data) {
  ensureStorage();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function mutateData(mutator) {
  const current = readData();
  const next = mutator(deepClone(current));
  writeData(next);
  return next;
}

function getBoardOrThrow(data, boardId) {
  const normalizedBoardId = toPositiveInteger(boardId, 0);
  const board = data.boards.find((item) => item.id === normalizedBoardId);

  if (!board) {
    throw new Error('Board not found');
  }

  return board;
}

function getNoteOrThrow(data, noteId) {
  const normalizedNoteId = toPositiveInteger(noteId, 0);
  const note = data.notes.find((item) => item.id === normalizedNoteId);

  if (!note) {
    throw new Error('Note not found');
  }

  return note;
}

function touchBoard(data, boardId, timestamp) {
  const board = getBoardOrThrow(data, boardId);
  board.updated_at = timestamp;
  return board;
}

function sortBoardsByUpdatedAt(boards) {
  return boards.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
}

function sortNotesByZIndex(notes) {
  return notes.sort((a, b) => {
    if (a.z_index !== b.z_index) {
      return a.z_index - b.z_index;
    }
    return a.id - b.id;
  });
}

export async function listBoards(archived = '0') {
  const data = readData();

  const boards = data.boards
    .filter((board) => {
      if (archived === 'all') {
        return true;
      }
      if (archived === '1') {
        return board.archived_at !== null;
      }
      return board.archived_at === null;
    })
    .map((board) => ({
      ...board,
      note_count: data.notes.filter((note) => note.board_id === board.id).length,
    }));

  return {
    boards: sortBoardsByUpdatedAt(boards),
  };
}

export async function createBoard(title = DEFAULT_BOARD_TITLE) {
  const safeTitle = String(title || DEFAULT_BOARD_TITLE).trim().slice(0, 255) || DEFAULT_BOARD_TITLE;
  const timestamp = nowIso();

  let createdBoard;

  mutateData((data) => {
    createdBoard = {
      id: data.meta.nextBoardId,
      title: safeTitle,
      archived_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.boards.push(createdBoard);
    data.meta.nextBoardId += 1;
    return data;
  });

  return createdBoard;
}

export async function getBoard(boardId) {
  const data = readData();
  const board = getBoardOrThrow(data, boardId);
  const notes = data.notes.filter((note) => note.board_id === board.id);

  return {
    board: deepClone(board),
    notes: sortNotesByZIndex(deepClone(notes)),
  };
}

export async function archiveBoard(boardId, archived) {
  const timestamp = nowIso();
  let result;

  mutateData((data) => {
    const board = getBoardOrThrow(data, boardId);
    board.archived_at = archived ? timestamp : null;
    board.updated_at = timestamp;
    result = deepClone(board);
    return data;
  });

  return result;
}

export async function createNote(noteData) {
  if (!noteData || !noteData.board_id) {
    throw new Error('board_id required');
  }

  const timestamp = nowIso();
  let createdNote;

  mutateData((data) => {
    const board = getBoardOrThrow(data, noteData.board_id);
    const maxZIndex = data.notes
      .filter((note) => note.board_id === board.id)
      .reduce((max, note) => Math.max(max, note.z_index || 1), 0);

    createdNote = {
      id: data.meta.nextNoteId,
      board_id: board.id,
      content: typeof noteData.content === 'string' ? noteData.content : '',
      x: toInteger(noteData.x, 100),
      y: toInteger(noteData.y, 100),
      w: toInteger(noteData.w, DEFAULT_NOTE_WIDTH),
      h: toInteger(noteData.h, DEFAULT_NOTE_HEIGHT),
      color: isValidHexColor(noteData.color) ? noteData.color : DEFAULT_NOTE_COLOR,
      z_index: maxZIndex + 1,
      created_at: timestamp,
      updated_at: timestamp,
    };

    data.notes.push(createdNote);
    data.meta.nextNoteId += 1;
    touchBoard(data, board.id, timestamp);
    return data;
  });

  return createdNote;
}

export async function updateNote(noteId, updates) {
  if (!updates || Object.keys(updates).length === 0) {
    throw new Error('No fields to update');
  }

  const timestamp = nowIso();
  let updatedNote;

  mutateData((data) => {
    const note = getNoteOrThrow(data, noteId);
    let hasValidField = false;

    Object.entries(updates).forEach(([field, value]) => {
      if (!ALLOWED_NOTE_FIELDS.has(field)) {
        return;
      }

      if (field === 'color') {
        if (!isValidHexColor(value)) {
          return;
        }
        note.color = value;
        hasValidField = true;
        return;
      }

      if (field === 'content') {
        note.content = typeof value === 'string' ? value : String(value ?? '');
        hasValidField = true;
        return;
      }

      note[field] = toInteger(value, note[field]);
      hasValidField = true;
    });

    if (!hasValidField) {
      throw new Error('No valid fields to update');
    }

    note.updated_at = timestamp;
    touchBoard(data, note.board_id, timestamp);
    updatedNote = deepClone(note);
    return data;
  });

  return updatedNote;
}

export async function deleteNote(noteId) {
  let deleted = false;

  mutateData((data) => {
    const note = getNoteOrThrow(data, noteId);
    const timestamp = nowIso();
    data.notes = data.notes.filter((item) => item.id !== note.id);
    touchBoard(data, note.board_id, timestamp);
    deleted = true;
    return data;
  });

  return { deleted, id: toPositiveInteger(noteId, 0) };
}

export async function exportIdeasData() {
  return deepClone(readData());
}

export async function importIdeasData(jsonPayload) {
  let parsed;

  try {
    parsed = JSON.parse(jsonPayload);
  } catch {
    throw new Error('El archivo seleccionado no contiene JSON valido.');
  }

  const normalizedData = sanitizeDataShape(parsed);
  writeData(normalizedData);

  return {
    boards: normalizedData.boards.length,
    notes: normalizedData.notes.length,
  };
}
