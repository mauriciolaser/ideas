<?php
/**
 * createBoard - Crea un nuevo tablero
 * 
 * POST /api/index.php?action=createBoard
 * Body (opcional): { "title": "Mi Tablero" }
 * 
 * Response: { "id": 1, "token": "xxx...", "title": "..." }
 */

// Solo POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendError(405, 'Method not allowed');
}

// Obtener datos del body
$body = getJSONBody();
$title = isset($body['title']) ? trim($body['title']) : 'Untitled';

// Validar título
if (strlen($title) > 255) {
    $title = substr($title, 0, 255);
}

// Generar token único
$token = generateToken(64);

// Insertar en base de datos
$db = getDB();
$stmt = $db->prepare('INSERT INTO boards (title, token) VALUES (?, ?)');
$stmt->bind_param('ss', $title, $token);

if (!$stmt->execute()) {
    sendError(500, 'Failed to create board');
}

$boardId = $stmt->insert_id;
$stmt->close();

// Respuesta exitosa
sendJSON([
    'id' => $boardId,
    'token' => $token,
    'title' => $title
], 201);
