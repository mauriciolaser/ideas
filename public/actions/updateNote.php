<?php
/**
 * updateNote - Actualiza una nota existente (parcial)
 * 
 * PATCH /api/index.php?action=updateNote&id=NOTE_ID
 * Header: X-BOARD-TOKEN: xxx
 * Body: { "x": 200, "y": 300, "content": "texto", ... }
 * 
 * Campos permitidos: x, y, w, h, content, color, z_index
 */

// Solo PATCH
if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    sendError(405, 'Method not allowed');
}

// Obtener ID de la nota
$noteId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($noteId <= 0) {
    sendError(400, 'Note ID required');
}

// Obtener datos del body
$body = getJSONBody();

if (empty($body)) {
    sendError(400, 'No fields to update');
}

// Primero necesitamos saber a qué board pertenece la nota
$db = getDB();
$stmt = $db->prepare('SELECT board_id FROM notes WHERE id = ?');
$stmt->bind_param('i', $noteId);
$stmt->execute();
$result = $stmt->get_result();
$noteInfo = $result->fetch_assoc();
$stmt->close();

if (!$noteInfo) {
    sendError(404, 'Note not found');
}

// Validar token del board
validateBoardToken((int)$noteInfo['board_id']);

// Campos permitidos y sus tipos
$allowedFields = [
    'x' => 'i',
    'y' => 'i',
    'w' => 'i',
    'h' => 'i',
    'content' => 's',
    'color' => 's',
    'z_index' => 'i'
];

// Construir query dinámica
$updates = [];
$types = '';
$values = [];

foreach ($allowedFields as $field => $type) {
    if (array_key_exists($field, $body)) {
        $value = $body[$field];
        
        // Validaciones específicas
        if ($field === 'color' && !preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
            continue; // Ignorar color inválido
        }
        
        if ($type === 'i') {
            $value = (int)$value;
        }
        
        $updates[] = "$field = ?";
        $types .= $type;
        $values[] = $value;
    }
}

if (empty($updates)) {
    sendError(400, 'No valid fields to update');
}

// Agregar ID al final
$types .= 'i';
$values[] = $noteId;

// Ejecutar update
$sql = 'UPDATE notes SET ' . implode(', ', $updates) . ' WHERE id = ?';
$stmt = $db->prepare($sql);
$stmt->bind_param($types, ...$values);

if (!$stmt->execute()) {
    sendError(500, 'Failed to update note');
}

$stmt->close();

// Obtener la nota actualizada
$stmt = $db->prepare('SELECT * FROM notes WHERE id = ?');
$stmt->bind_param('i', $noteId);
$stmt->execute();
$result = $stmt->get_result();
$note = $result->fetch_assoc();
$stmt->close();

// Convertir tipos
$note['id'] = (int)$note['id'];
$note['board_id'] = (int)$note['board_id'];
$note['x'] = (int)$note['x'];
$note['y'] = (int)$note['y'];
$note['w'] = (int)$note['w'];
$note['h'] = (int)$note['h'];
$note['z_index'] = (int)$note['z_index'];

sendJSON($note);
