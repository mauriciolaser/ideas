<?php
/**
 * createNote - Crea una nueva nota en un tablero
 * 
 * POST /api/index.php?action=createNote
 * Header: X-BOARD-TOKEN: xxx
 * Body: { "board_id": 1, "x": 100, "y": 100, "content": "...", "color": "#FFFFA5" }
 * 
 * Response: { nota completa }
 */

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError(405, 'Method not allowed');
}

// Obtener datos del body
$body = getJSONBody();

// board_id es obligatorio
if (!isset($body['board_id'])) {
    sendError(400, 'board_id required');
}

$boardId = (int)$body['board_id'];

// Validar token
validateBoardToken($boardId);

// Valores con defaults
$x = isset($body['x']) ? (int)$body['x'] : 100;
$y = isset($body['y']) ? (int)$body['y'] : 100;
$w = isset($body['w']) ? (int)$body['w'] : 200;
$h = isset($body['h']) ? (int)$body['h'] : 150;
$content = isset($body['content']) ? $body['content'] : '';
$color = isset($body['color']) ? $body['color'] : '#FFFFA5';

// Validar color (formato hex)
if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) {
    $color = '#FFFFA5';
}

// Obtener el z_index máximo actual + 1
$db = getDB();
$stmt = $db->prepare('SELECT COALESCE(MAX(z_index), 0) + 1 as next_z FROM notes WHERE board_id = ?');
$stmt->bind_param('i', $boardId);
$stmt->execute();
$result = $stmt->get_result();
$row = $result->fetch_assoc();
$zIndex = (int)$row['next_z'];
$stmt->close();

// Insertar nota
$stmt = $db->prepare('
    INSERT INTO notes (board_id, content, x, y, w, h, color, z_index) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
');
$stmt->bind_param('isiiiiis', $boardId, $content, $x, $y, $w, $h, $color, $zIndex);

if (!$stmt->execute()) {
    sendError(500, 'Failed to create note');
}

$noteId = $stmt->insert_id;
$stmt->close();

// Obtener la nota creada
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

sendJSON($note, 201);
