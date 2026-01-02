<?php
/**
 * listBoards - Lista todos los tableros
 * 
 * GET /api/index.php?action=listBoards
 * 
 * Response: { "boards": [...] }
 * 
 * NOTA: Endpoint MVP sin seguridad - lista todos los tableros con sus tokens
 */

// Solo GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError(405, 'Method not allowed');
}

$db = getDB();

// Obtener todos los tableros ordenados por fecha de actualización
$result = $db->query('
    SELECT id, title, token, created_at, updated_at,
           (SELECT COUNT(*) FROM notes WHERE board_id = boards.id) as note_count
    FROM boards 
    ORDER BY updated_at DESC
');

$boards = [];
while ($row = $result->fetch_assoc()) {
    $boards[] = [
        'id' => (int)$row['id'],
        'title' => $row['title'],
        'token' => $row['token'],
        'note_count' => (int)$row['note_count'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

sendJSON(['boards' => $boards]);