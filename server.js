const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.socket.io"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(express.json({ limit: "20kb" }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));
app.use(express.static("public"));
app.get("/health", (_req, res) => res.json({ ok: true, app: "DARO TRUCO" }));

const rooms = new Map();
const tournamentAmounts = [500, 800, 1000, 1500, 2000, 3000, 5000, 8000, 10000, 15000];
let tournaments = [];
let batchId = 0;

function makeTournaments() {
  batchId += 1;
  const startsAt = new Date();
  startsAt.setMinutes(startsAt.getMinutes() < 30 ? 30 : 60, 0, 0);
  tournaments = tournamentAmounts.map((amount, i) => ({
    id: `torneo-${batchId}-${i + 1}`,
    number: i + 1,
    amount,
    mode: i % 2 === 0 ? "2 vs. 2" : "1 vs. 1 vs. 1",
    startsAt: startsAt.toISOString(),
    players: [],
    status: "registration"
  }));
  io.emit("tournaments:update", tournaments);
}
makeTournaments();
setInterval(makeTournaments, 30 * 60 * 1000);

function publicRooms() {
  return [...rooms.values()].map(r => ({
    id: r.id, name: r.name, mode: r.mode, entry: r.entry,
    players: r.players.length, capacity: r.capacity, status: r.status,
    host: r.host
  }));
}
function publishLobby() {
  io.emit("lobby:update", { rooms: publicRooms(), tournaments });
}

io.on("connection", socket => {
  // Límite básico por conexión para reducir spam de eventos.
  let eventCount = 0;
  const eventWindow = setInterval(() => { eventCount = 0; }, 10000);
  socket.onAny(() => {
    eventCount += 1;
    if (eventCount > 40) socket.disconnect(true);
  });
  socket.on("disconnect", () => clearInterval(eventWindow));
  socket.data.playerName = `Jugador-${socket.id.slice(0, 4)}`;

  socket.emit("lobby:update", { rooms: publicRooms(), tournaments });
  socket.emit("tournaments:update", tournaments);

  socket.on("profile:setName", name => {
    const clean = String(name || "").replace(/[<>\\u0000-\\u001f]/g, "").trim().slice(0, 18);
    if (clean) socket.data.playerName = clean;
  });

  // Las salas privadas son visibles en el lobby general y cualquiera puede unirse.
  socket.on("room:create", payload => {
    const mode = ["1 vs. 1", "2 vs. 2", "1 vs. 1 vs. 1"].includes(payload?.mode) ? payload.mode : "1 vs. 1";
    const capacity = mode === "1 vs. 1" ? 2 : mode === "2 vs. 2" ? 4 : 3;
    const entry = Math.max(500, Math.min(1000000, Number(payload?.entry) || 500));
    const id = crypto.randomBytes(4).toString("hex").toUpperCase();
    const room = {
      id, name: String(payload?.name || `Sala ${id}`).replace(/[<>\\u0000-\\u001f]/g, "").trim().slice(0, 30) || `Sala ${id}`,
      mode, entry, capacity, host: socket.data.playerName,
      players: [], status: "waiting", cards: [], createdAt: Date.now()
    };
    rooms.set(id, room);
    joinRoom(socket, room);
    publishLobby();
  });

  socket.on("room:join", id => {
    const room = rooms.get(String(id));
    if (!room || room.status !== "waiting" || room.players.length >= room.capacity) {
      socket.emit("notice", "La sala ya no está disponible.");
      return;
    }
    joinRoom(socket, room);
    publishLobby();
  });

  socket.on("room:leave", () => leaveCurrentRoom(socket));

  socket.on("game:play", payload => {
    const room = findRoomForSocket(socket);
    if (!room || room.status !== "playing") return;
    // Demo de sincronización: el servidor transmite la acción, pero no valida
    // todavía reglas completas, jerarquía de cartas, envido ni truco.
    io.to(room.id).emit("game:action", {
      player: socket.data.playerName,
      action: String(payload?.action || "jugó una carta").slice(0, 50),
      at: Date.now()
    });
  });

  socket.on("tournament:join", id => {
    const t = tournaments.find(x => x.id === id);
    if (!t || t.status !== "registration") {
      socket.emit("notice", "La inscripción no está disponible.");
      return;
    }
    if (!t.players.includes(socket.data.playerName)) t.players.push(socket.data.playerName);
    io.emit("tournaments:update", tournaments);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(socket);
    publishLobby();
  });
});

function joinRoom(socket, room) {
  leaveCurrentRoom(socket);
  room.players.push({ id: socket.id, name: socket.data.playerName });
  socket.join(room.id);
  socket.data.roomId = room.id;
  if (room.players.length === room.capacity) room.status = "playing";
  io.to(room.id).emit("room:update", {
    id: room.id, name: room.name, mode: room.mode,
    players: room.players.map(p => p.name), capacity: room.capacity,
    status: room.status, entry: room.entry
  });
}
function findRoomForSocket(socket) {
  return socket.data.roomId ? rooms.get(socket.data.roomId) : null;
}
function leaveCurrentRoom(socket) {
  const room = findRoomForSocket(socket);
  if (!room) return;
  room.players = room.players.filter(p => p.id !== socket.id);
  socket.leave(room.id);
  socket.data.roomId = null;
  if (room.players.length === 0) rooms.delete(room.id);
  else if (room.status === "playing") room.status = "waiting";
  io.to(room.id).emit("room:update", {
    id: room.id, name: room.name, mode: room.mode,
    players: room.players.map(p => p.name), capacity: room.capacity,
    status: room.status, entry: room.entry
  });
}

server.listen(PORT, () => console.log(`DARO TRUCO escuchando en http://localhost:${PORT}`));
