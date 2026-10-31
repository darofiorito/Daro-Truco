# DARO TRUCO — prototipo multijugador

## Requisitos
- Node.js 20 o superior
- npm

## Ejecutar en tu computadora
1. Descomprimí el ZIP.
2. Abrí una terminal dentro de la carpeta `daro-truco-online`.
3. Ejecutá `npm install`.
4. Ejecutá `npm start`.
5. Abrí `http://localhost:3000` en el navegador.

Para probar el multijugador en la misma red, abrí la dirección IP local de la computadora en otros celulares conectados al mismo Wi-Fi.

## Qué incluye
- Servidor Express + Socket.IO.
- Lobby compartido en tiempo real.
- Salas creadas por jugadores, visibles para todos los conectados.
- Modalidades 1 vs 1, 2 vs 2 y 1 vs 1 vs 1.
- Diez torneos de demostración, renovados cada 30 minutos.
- Acciones de mesa sincronizadas como prueba.

## Importante: alcance
Esto es una base técnica inicial, no una plataforma lista para operar públicamente. Aún falta desarrollar y probar las reglas completas del truco (mazo, reparto privado, jerarquía, envido, truco, puntaje, desconexiones, cierre y disputas), autenticación, persistencia en base de datos, protección anti-trampas, monitoreo y despliegue.

Los montos son etiquetas de demostración. No hay billetera real, depósitos, retiros, transferencias, apuestas ni premios. No agregues credenciales bancarias ni claves al código. La operación con dinero real requiere las autorizaciones aplicables y un proveedor de pagos habilitado.

## Publicar en internet
Necesitás contratar un hosting que soporte Node.js y WebSockets, configurar una variable `PORT`, desplegar el proyecto y usar un dominio con HTTPS. Para disponibilidad real conviene agregar base de datos y almacenamiento persistente antes de abrirlo al público.


## Reglas de referencia recibidas
Se revisó el PDF `reglas29052024.pdf` (Reglamento Trucon). Define una variante para **dos participantes**, baraja española de 40 cartas, sin flor y partida a 30 puntos; incluye jerarquía de cartas, tres bazas, truco/retruco/vale cuatro y cantos de envido. El reglamento no especifica 2 vs 2 ni 1 vs 1 vs 1. Antes de programar esas variantes hay que definir reglas adicionales o conseguir reglamentos específicos. No se debe asumir que las reglas de dos jugadores aplican automáticamente a equipos o tres jugadores.

## Seguridad añadida en esta base
- Helmet para cabeceras HTTP y política CSP inicial.
- Límite de solicitudes HTTP.
- Límite básico de eventos por conexión Socket.IO.
- Validación/limpieza básica de nombres de usuario y salas.
- Límite de tamaño del JSON recibido.

Esto es endurecimiento inicial, **no una auditoría ni seguridad suficiente para manejar dinero**. Antes de producción faltan autenticación robusta, sesiones seguras, autorización por sala, persistencia transaccional, protección CSRF donde corresponda, logs/alertas, pruebas de penetración, backups y revisión profesional.

## Datos bancarios
No se incorporaron alias, CVU, enlaces de cobro ni datos personales del usuario. No pegues claves, tokens ni credenciales bancarias en el código o el chat.
