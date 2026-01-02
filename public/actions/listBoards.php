<?php
/**
 * listBoards - Lista tableros con filtro de archivados
 * 
 * GET /api/index.php?action=listBoards
 * GET /api/index.php?action=listBoards&archived=0  (solo activos, default)
 * GET /api/index.php?action=listBoards&archived=1  (solo archivados)
 * GET /api/index.php?action=listBoards&archived=all (todos)
 * 
 * Response: { "boards": [...] }
 */

// Solo GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendError(405, 'Method not allowed');
}

$db = getDB();

// Determinar filtro de archivados
$archivedParam = $_GET['archived'] ?? '0';

if ($archivedParam === 'all') {
    // Todos los tableros
    $whereClause = '1=1';
} elseif ($archivedParam === '1') {
    // Solo archivados
    $whereClause = 'archived_at IS NOT NULL';
} else {
    // Solo activos (default)
    $whereClause = 'archived_at IS NULL';
}

// Obtener tableros
$sql = "
    SELECT id, title, token, archived_at, created_at, updated_at,
           (SELECT COUNT(*) FROM notes WHERE board_id = boards.id) as note_count
    FROM boards 
    WHERE {$whereClause}
    ORDER BY updated_at DESC
";

$result = $db->query($sql);

$boards = [];
while ($row = $result->fetch_assoc()) {
    $boards[] = [
        'id' => (int)$row['id'],
        'title' => $row['title'],
        'token' => $row['token'],
        'archived_at' => $row['archived_at'],
        'note_count' => (int)$row['note_count'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

sendJSON(['boards' => $boards]);