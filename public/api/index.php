<?php
/**
 * ideas MVP - API Router
 * 
 * Punto de entrada único para todas las acciones
 * URL: /api/index.php?action=xxx
 */

// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-BOARD-TOKEN');

// Manejar preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Cargar conexión y helpers
require_once __DIR__ . '/db.php';

// Obtener acción
$action = $_GET['action'] ?? null;

if (!$action) {
    sendError(400, 'Action parameter required');
}

// Validar nombre de acción (solo letras, evitar path traversal)
if (!preg_match('/^[a-zA-Z]+$/', $action)) {
    sendError(400, 'Invalid action name');
}

// Ruta al archivo de acción
$actionFile = __DIR__ . '/../actions/' . $action . '.php';

// Verificar que existe
if (!file_exists($actionFile)) {
    sendError(404, 'Action not found');
}

// Ejecutar acción
require $actionFile;
