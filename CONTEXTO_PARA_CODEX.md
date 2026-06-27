# Contexto para continuar el Frontend Angular

Este proyecto `frontend-angular` es una aplicacion separada del backend. La idea es poder mover esta carpeta, abrirla en IntelliJ o VS Code y continuar el desarrollo en otro chat de Codex sin perder el contexto del sistema.

## Arquitectura general

El backend ya existe y esta compuesto por microservicios:

- `api.gateway`: entrada principal del sistema.
- `ms.auth`: login y generacion de token.
- `ms.cliente`: gestion y consulta de clientes.
- `ms.producto`: gestion de productos y stock.
- `ms.ventas`: ventas y orquestador Saga.
- `central-config`: configuracion centralizada.
- `Consul`: soporte de configuracion/descubrimiento.
- Bases de datos separadas por microservicio.

El frontend debe consumir siempre el gateway:

```text
Angular -> api.gateway -> microservicios Quarkus
```

No debe llamar directamente a `ms.cliente`, `ms.producto` o `ms.ventas`, salvo para pruebas tecnicas muy puntuales.

## Gateway

URL local del gateway:

```text
http://localhost:8030
```

En Angular se usa proxy de desarrollo:

```text
/api -> http://localhost:8030/api
```

Archivo:

```text
proxy.conf.json
```

Por eso los servicios Angular deben llamar rutas como:

```text
/api/auth/login
/api/clientes
/api/productos
/api/ventas
/api/ventas/saga
```

## Seguridad

El sistema usa login con token.

Usuario de prueba:

```text
username: admin
password: admin123
```

Login:

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

La respuesta incluye `token`.

Luego el frontend debe enviar:

```http
Authorization: Bearer TOKEN
```

Ya existe un interceptor en:

```text
src/app/auth.interceptor.ts
```

El token se guarda en `localStorage` usando la clave:

```text
saga_token
```

## Rutas principales

### Clientes

```http
GET /api/clientes
```

Respuesta esperada aproximada:

```json
[
  {
    "idcliente": 1,
    "nombres": "Sergio Gabriel",
    "apellidos": "Valencia Saavedra",
    "correo": "gabrielvalencia3019@gmail.com",
    "telefono": "912595344",
    "estado": "A"
  }
]
```

En algunos casos Quarkus puede responder como objeto con propiedad `value`. El componente actual ya contempla ambos casos:

```text
array directo
objeto con value
```

### Productos

```http
GET /api/productos
```

Producto conocido para pruebas:

```text
idproducto: 21
nombre: papa
```

Respuesta aproximada:

```json
[
  {
    "idproducto": 21,
    "nombre": "papa",
    "precio": 2.0,
    "stock": 417
  }
]
```

### Ventas

```http
GET /api/ventas
```

Respuesta aproximada:

```json
[
  {
    "idventa": 8,
    "idcliente": 1,
    "idproducto": 21,
    "cantidad": 1,
    "total": 2.0,
    "estado": "REGISTRADA",
    "fecha": "..."
  }
]
```

## Saga Pattern

La Saga esta implementada en `ms.ventas`.

`ms.ventas` no es solo CRUD de ventas; tambien actua como orquestador Saga.

Endpoint principal:

```http
POST /api/ventas/saga
Content-Type: application/json
Authorization: Bearer TOKEN

{
  "idcliente": 1,
  "idproducto": 21,
  "cantidad": 1
}
```

Flujo:

1. `ms.ventas` recibe la solicitud.
2. Valida cliente en `ms.cliente`.
3. Valida producto y stock en `ms.producto`.
4. Descuenta stock en `ms.producto`.
5. Registra la venta en `ms.ventas`.
6. Si falla despues de descontar stock, restaura stock en `ms.producto`.

## Casos de prueba importantes

### Saga exitosa

Usar:

```json
{
  "idcliente": 1,
  "idproducto": 21,
  "cantidad": 1
}
```

Resultado esperado:

- HTTP 200 o 201 segun backend.
- Venta registrada.
- Stock descontado.

### Error funcional por stock insuficiente

Usar:

```json
{
  "idcliente": 1,
  "idproducto": 21,
  "cantidad": 999999
}
```

Resultado esperado:

- HTTP 409.
- Error controlado.
- Stock no debe cambiar.

## Estado actual del frontend

Archivos principales:

- `src/app/app.component.ts`: logica principal de login, carga de datos y Saga.
- `src/app/app.component.html`: pantalla de login, dashboard, tablas y formulario Saga.
- `src/app/app.component.css`: estilos visuales.
- `src/app/auth.interceptor.ts`: agrega token Bearer a las peticiones.
- `proxy.conf.json`: proxy hacia el gateway.

Pantallas actuales:

- Login.
- Resumen de Saga.
- Clientes.
- Productos.
- Ventas.
- Formulario para ejecutar Saga.
- Boton para simular error de stock.

## Comandos

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
npm start
```

Abrir:

```text
http://localhost:4200
```

Compilar:

```bash
npm run build
```

## Requisitos para probar contra backend

Para compilar Angular no hace falta levantar el backend.

Para usar login, listados y Saga, si deben estar encendidos:

- `api.gateway`
- `ms.auth`
- `ms.cliente`
- `ms.producto`
- `ms.ventas`
- bases de datos

Comando desde la raiz del backend:

```bash
docker compose up -d
```

## Recomendacion para el siguiente chat

El siguiente chat deberia tratar este proyecto como frontend separado. No debe modificar los microservicios salvo que el usuario lo pida explicitamente.

Prioridades sugeridas:

1. Instalar dependencias y compilar.
2. Ajustar modelos TypeScript si alguna respuesta real del backend difiere.
3. Mejorar UX de CRUD si el usuario desea crear/editar/eliminar desde pantalla.
4. Dockerizar Angular si se quiere integrarlo al `docker-compose`.
5. Agregar guards/routing si el frontend crece.
