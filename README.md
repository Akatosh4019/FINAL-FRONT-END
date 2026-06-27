# Frontend Angular - Saga Ventas

Aplicacion web para consumir el proyecto de microservicios desde el `api.gateway`.

Para continuar este frontend en otro chat de Codex, revisar primero:

```text
CONTEXTO_PARA_CODEX.md
```

## Requisitos

- Node.js 18 o superior.
- Servicios Docker del backend levantados.
- Gateway disponible en `http://localhost:8030`.

## Ejecutar

```bash
npm install
npm start
```

Abrir:

```text
http://localhost:4200
```

## Usuario de prueba

```text
Usuario: admin
Clave: admin123
```

## Notas

- El frontend consume rutas `/api/...`.
- `proxy.conf.json` redirige esas rutas al gateway `http://localhost:8030`.
- Para compilar no es obligatorio que los microservicios esten encendidos.
- Para iniciar sesion, listar datos y probar Saga, si deben estar encendidos.
