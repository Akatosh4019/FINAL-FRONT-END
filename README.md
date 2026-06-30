# Frontend Angular - Saga Ventas

Aplicacion web Angular para consumir el backend de microservicios desde el API Gateway.

## Requisitos

- Node.js 18 o superior.
- npm instalado.
- Backend levantado con Docker.
- Gateway disponible en `http://localhost:8030`.

## Instalar en otra laptop

```bash
git clone https://github.com/Akatosh4019/FINAL-FRONT-END.git
cd FINAL-FRONT-END
npm install
npm start
```

Abrir:

```text
http://localhost:4200
```

El comando `npm start` usa `proxy.conf.cjs` para redirigir `/api/...` hacia:

```text
http://localhost:8030/api
```

## Usuario admin de prueba

```text
Usuario: admin
Clave: admin123
```

## Funciones principales

- Login cliente y admin con JWT.
- Tienda cliente con carrito Saga.
- Boleta simple al completar compra.
- Mis compras del cliente.
- Panel admin para clientes, productos, ventas y Saga logs.
- Productos con estado inicial activo/inactivo.
- Desactivar/activar productos.
- Eliminar productos solo cuando no tienen ventas registradas.
- Saga logs ordenados por fecha reciente.

## Notas

- Para compilar no es obligatorio que los microservicios esten encendidos.
- Para iniciar sesion, listar datos, comprar y probar Saga, el backend si debe estar encendido.
- Las fechas del backend se muestran como hora local de Peru; no se convierten manualmente a UTC.

## Build

```bash
npm run build
```
