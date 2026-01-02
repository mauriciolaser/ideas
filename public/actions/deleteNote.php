<?php
/**
 * deleteNote - Elimina una nota
 * 
 * DELETE /api/index.php?action=deleteNote&id=NOTE_ID
 * Header: X-BOARD-TOKEN: xxx
 */

// Solo DELETE
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    sendError(405, 'Method not allowed');
}

// Obtener ID de la nota
$noteId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($noteId <= 0) {
    sendError(400, 'Note ID required');
}

// Obtener board_id de la nota
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

// Eliminar nota
$stmt = $db->prepare('DELETE FROM notes WHERE id = ?');
$stmt->bind_param('i', $noteId);

if (!$stmt->execute()) {
    sendError(500, 'Failed to delete note');
}

$affected = $stmt->affected_rows;
$stmt->close();

if ($affected === 0) {
    sendError(404, 'Note not found');
}

// Respuesta exitosa
sendJSON(['deleted' => true, 'id' => $noteId]);
