<?php
/**
 * archiveBoard - Archiva o desarchiva un tablero
 * 
 * PATCH /api/index.php?action=archiveBoard&id=BOARD_ID
 * Header: X-BOARD-TOKEN: xxx
 * Body: { "archived": true } o { "archived": false }
 * 
 * Response: { "id": 1, "archived_at": "2025-01-01 12:00:00" } o { "id": 1, "archived_at": null }
 */

// Solo PATCH
if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    sendError(405, 'Method not allowed');
}

// Obtener ID del tablero
$boardId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($boardId <= 0) {
    sendError(400, 'Board ID required');
}

// Validar token
validateBoardToken($boardId);

// Obtener datos del body
$body = getJSONBody();

if (!isset($body['archived'])) {
    sendError(400, 'archived field required');
}

$archived = (bool)$body['archived'];
$db = getDB();

if ($archived) {
    // Archivar: establecer fecha actual
    $stmt = $db->prepare('UPDATE boards SET archived_at = NOW() WHERE id = ?');
} else {
    // Desarchivar: establecer NULL
    $stmt = $db->prepare('UPDATE boards SET archived_at = NULL WHERE id = ?');
}

$stmt->bind_param('i', $boardId);

if (!$stmt->execute()) {
    sendError(500, 'Failed to update board');
}

$stmt->close();

// Obtener el board actualizado
$stmt = $db->prepare('SELECT id, title, archived_at, updated_at FROM boards WHERE id = ?');
$stmt->bind_param('i', $boardId);
$stmt->execute();
$result = $stmt->get_result();
$board = $result->fetch_assoc();
$stmt->close();

sendJSON([
    'id' => (int)$board['id'],
    'title' => $board['title'],
    'archived_at' => $board['archived_at'],
    'updated_at' => $board['updated_at']
]);