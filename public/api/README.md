# Legacy PHP API

Este directorio documenta el backend original del MVP basado en PHP + MySQL.

## Estado

- Legado: la app actual ya no consume estos endpoints.
- Referencial: se conserva solo para contexto histórico y posible migración manual.
- No configurado: cualquier uso real requiere completar credenciales y despliegue por cuenta propia.

## Motivo del cambio

El proyecto principal ahora usa `localStorage` para que cualquier clon del repositorio funcione out of the box sin servidor, PHP ni MySQL.

## Si alguien quiere reactivar este backend

1. Configurar credenciales propias en `public/api/db.php`.
2. Crear la base usando el esquema SQL del proyecto.
3. Publicar `public/api` y `public/actions` en un servidor con PHP.
4. Reescribir el cliente de `src/api/boardApi.js` para volver a consumir HTTP.

Nada de esto forma parte del flujo soportado actualmente.
