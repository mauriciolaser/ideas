<?php
/**
 * getBoard - Obtiene un tablero con todas sus notas
 * 
 * GET /api/index.php?action=getBoard&id=BOARD_ID
 * Header: X-BOARD-TOKEN: xxx
 * 
 * Response: { "board": {...}, "notes": [...] }
 */

// Solo GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError(405, 'Method not allowed');
}

// Obtener ID del tablero
$boardId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($boardId <= 0) {
    sendError(400, 'Board ID required');
}

// Validar token y obtener board
$board = validateBoardToken($boardId);

// Obtener notas del tablero
$db = getDB();
$stmt = $db->prepare('
    SELECT id, board_id, content, x, y, w, h, color, z_index, created_at, updated_at 
    FROM notes 
    WHERE board_id = ? 
    ORDER BY z_index ASC
');
$stmt->bind_param('i', $boardId);
$stmt->execute();
$result = $stmt->get_result();

$notes = [];
while ($row = $result->fetch_assoc()) {
    // Convertir tipos numéricos
    $row['id'] = (int)$row['id'];
    $row['board_id'] = (int)$row['board_id'];
    $row['x'] = (int)$row['x'];
    $row['y'] = (int)$row['y'];
    $row['w'] = (int)$row['w'];
    $row['h'] = (int)$row['h'];
    $row['z_index'] = (int)$row['z_index'];
    $notes[] = $row;
}
$stmt->close();

// No incluir token en la respuesta
unset($board['token']);

// Respuesta
sendJSON([
    'board' => [
        'id' => (int)$board['id'],
        'title' => $board['title'],
        'created_at' => $board['created_at'],
        'updated_at' => $board['updated_at']
    ],
    'notes' => $notes
]);
