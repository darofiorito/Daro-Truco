const socket = io();
const $ = id => document.getElementById(id);
let currentRoom = null;
socket.on("connect", () => $("connection").textContent = "● Conectado");
socket.on("disconnect", () => $("connection").textContent = "Desconectado");
$("saveName").onclick = () => socket.emit("profile:setName", $("playerName").value);
$("createRoom").onclick = () => socket.emit("room:create", {
  name: $("roomName").value, mode: $("mode").value, entry: $("entry").value
});
$("leaveRoom").onclick = () => { socket.emit("room:leave"); $("game").hidden = true; currentRoom = null; };
document.querySelectorAll("[data-action]").forEach(b => b.onclick = () => {
  socket.emit("game:play", { action: b.dataset.action });
});
socket.on("lobby:update", data => {
  renderRooms(data.rooms || []);
  renderTournaments(data.tournaments || []);
});
socket.on("tournaments:update", renderTournaments);
socket.on("room:update", data => {
  currentRoom = data.id;
  $("game").hidden = false;
  $("gameTitle").textContent = data.name;
  $("gameInfo").textContent = `${data.mode} · ${data.players.length}/${data.capacity} jugadores · entrada demo $${Number(data.entry).toLocaleString("es-AR")} · ${data.status === "playing" ? "mesa completa" : "esperando jugadores"}`;
  $("players").innerHTML = "";
  data.players.forEach(name => { const s=document.createElement("span"); s.textContent=name; $("players").append(s); });
});
socket.on("game:action", data => {
  const line = document.createElement("p");
  line.textContent = `${data.player}: ${data.action}`;
  $("feed").prepend(line);
});
socket.on("notice", msg => alert(msg));
function renderRooms(rooms) {
  $("rooms").innerHTML = "";
  if (!rooms.length) { $("rooms").textContent = "Todavía no hay salas. ¡Creá la primera!"; return; }
  rooms.forEach(r => {
    const item=document.createElement("div"); item.className="item";
    const info=document.createElement("div"), h=document.createElement("h3"), p=document.createElement("p"), strong=document.createElement("strong");
    h.textContent=r.name; p.textContent=`${r.mode} · ${r.players}/${r.capacity} · ${r.status==="playing"?"en juego":"esperando"}`;
    strong.textContent=`Entrada de prueba: $${Number(r.entry).toLocaleString("es-AR")}`;
    info.append(h,p,strong);
    const btn=document.createElement("button"); btn.textContent="Unirse"; btn.disabled=r.status!=="waiting"||r.players>=r.capacity; btn.onclick=()=>socket.emit("room:join",r.id);
    item.append(info,btn); $("rooms").append(item);
  });
}
function renderTournaments(tournaments) {
  $("tournaments").innerHTML = "";
  tournaments.forEach(t => {
    const item=document.createElement("div"); item.className="item";
    const info=document.createElement("div"), h=document.createElement("h3"), p=document.createElement("p"), strong=document.createElement("strong");
    h.textContent=`Torneo #${t.number} · $${Number(t.amount).toLocaleString("es-AR")}`;
    p.textContent=`${t.mode} · ${t.players.length} inscriptos · cada 30 min`;
    strong.textContent=`Inicio: ${new Date(t.startsAt).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"})}`;
    info.append(h,p,strong);
    const btn=document.createElement("button"); btn.textContent="Inscribirme"; btn.onclick=()=>socket.emit("tournament:join",t.id);
    item.append(info,btn); $("tournaments").append(item);
  });
}
