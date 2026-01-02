<?php
/**
 * IdeaBoard MVP - Conexión a Base de Datos
 * 
 * Configuración MySQLi y funciones helper
 */

// Configuración de la base de datos
define('DB_HOST', 'localhost');
define('DB_USER', 'vallhzty_board');
define('DB_PASS', '!!Afar34239!!Pp');
define('DB_NAME', 'vallhzty_board');

/**
 * Obtiene la conexión MySQLi (singleton)
 */
function getDB(): mysqli {
    static $conn = null;
    
    if ($conn === null) {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            sendError(500, 'Database connection failed');
        }
        
        $conn->set_charset('utf8mb4');
    }
    
    return $conn;
}

/**
 * Envía respuesta JSON y termina
 */
function sendJSON(mixed $data, int $code = 200): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Envía error JSON y termina
 */
function sendError(int $code, string $message): never {
    sendJSON(['error' => $message], $code);
}

/**
 * Obtiene el token del request (header o query param)
 */
function getToken(): ?string {
    // Primero intenta header
    $headers = getallheaders();
    if (isset($headers['X-BOARD-TOKEN'])) {
        return $headers['X-BOARD-TOKEN'];
    }
    // También buscar en minúsculas (algunos servidores)
    if (isset($headers['x-board-token'])) {
        return $headers['x-board-token'];
    }
    
    // Luego query param
    if (isset($_GET['token'])) {
        return $_GET['token'];
    }
    
    return null;
}

/**
 * Valida que el token corresponda al board_id
 * Retorna el board si es válido, o envía error
 */
function validateBoardToken(int $boardId): array {
    $token = getToken();
    
    if (!$token) {
        sendError(403, 'Token required');
    }
    
    $db = getDB();
    $stmt = $db->prepare('SELECT id, title, token, created_at, updated_at FROM boards WHERE id = ?');
    $stmt->bind_param('i', $boardId);
    $stmt->execute();
    $result = $stmt->get_result();
    $board = $result->fetch_assoc();
    $stmt->close();
    
    if (!$board) {
        sendError(404, 'Board not found');
    }
    
    if ($board['token'] !== $token) {
        sendError(403, 'Invalid token');
    }
    
    return $board;
}

/**
 * Valida que una nota pertenezca al board autenticado
 */
function validateNoteOwnership(int $noteId, int $boardId): array {
    $db = getDB();
    $stmt = $db->prepare('SELECT * FROM notes WHERE id = ? AND board_id = ?');
    $stmt->bind_param('ii', $noteId, $boardId);
    $stmt->execute();
    $result = $stmt->get_result();
    $note = $result->fetch_assoc();
    $stmt->close();
    
    if (!$note) {
        sendError(404, 'Note not found');
    }
    
    return $note;
}

/**
 * Obtiene el body JSON del request
 */
function getJSONBody(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    
    if ($data === null && $input !== '') {
        sendError(400, 'Invalid JSON body');
    }
    
    return $data ?? [];
}

/**
 * Genera un token aleatorio seguro
 */
function generateToken(int $length = 64): string {
    return bin2hex(random_bytes($length / 2));
}
