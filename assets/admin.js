/* SAJA Perfumes · Panel de administración (Punto de venta, inventario, abonos, reportes) */
const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
const { initializeApp, deleteApp } = await import(SDK + "firebase-app.js");
const {
  getAuth, initializeAuth, inMemoryPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider
} = await import(SDK + "firebase-auth.js");
const {
  getFirestore, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where,
  onSnapshot, writeBatch, increment, runTransaction
} = await import(SDK + "firebase-firestore.js");

const app = initializeApp(window.SAJA_FB);
const auth = getAuth(app);
const db = getFirestore(app);

/* ================= utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = n => (n < 0 ? "-$" : "$") + Math.abs(+n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = v => { const n = parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? 0 : n; };
const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const slug = s => norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const now = () => Date.now();
const pad = n => String(n).padStart(2, "0");
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const parseD = s => { const [y, m, d] = (s || today()).split("-").map(Number); return new Date(y, m - 1, d); };
const endOf = s => { const d = parseD(s); d.setDate(d.getDate() + 1); return d.getTime(); };
const round2 = n => Math.round((+n || 0) * 100) / 100;
const dayDiff = s => Math.round((parseD(s) - parseD(today())) / 864e5);
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const fdate = s => s ? parseD(s).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" }) : "—";
const ftime = ms => new Date(ms).toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const hhmm = ms => new Date(ms).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
const FREQ = { semanal: "semanal", quincenal: "quincenal", mensual: "mensual" };
function addPeriod(s, f) {
  const d = parseD(s);
  if (f === "semanal") d.setDate(d.getDate() + 7);
  else if (f === "mensual") d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + 15);
  return dstr(d);
}
const waNum = ph => { let d = (ph || "").replace(/\D/g, ""); if (d.length === 10) d = "52" + d; return d; };
const wa = (ph, msg) => window.open(`https://wa.me/${waNum(ph)}?text=${encodeURIComponent(msg)}`, "_blank");
const METHODS = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia", plazos: "En abonos" };
const CATS = { hombre: "Perfume caballero", mujer: "Perfume dama", unisex: "Perfume unisex", ropa: "Ropa", tenis: "Tenis", accesorios: "Accesorio" };
const isPerfume = c => ["hombre", "mujer", "unisex"].includes(c);
const GASTO_CATS = ["Mercancía", "Renta", "Servicios", "Sueldos", "Publicidad", "Envíos", "Otros"];
const ICON = {
  pos: '<path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 7H6"/><circle cx="9" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  home: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>',
  sales: '<path d="M7 3h10l2 3v15l-3-2-2 2-2-2-2 2-2-2-3 2V6z"/><path d="M9 10h6M9 14h4"/>',
  abonos: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M12 11v6M9.5 13.5 12 11l2.5 2.5"/>',
  cli: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2 .7 3.5 2.8 3.5 6"/>',
  prod: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>',
  inv: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M8 14h3M8 4v6M16 4v6"/>',
  rep: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  gastos: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  cajas: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M11 12v2h2v-2"/>',
  users: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  cfg: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.5a7 7 0 0 0-2 1.2l-2.4-.9-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-.9a7 7 0 0 0 2 1.2L10 21h4l.5-2.5a7 7 0 0 0 2-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z"/>',
  perfume: '<rect x="9" y="3" width="6" height="3" rx=".5"/><path d="M10.5 6v2M13.5 6v2"/><rect x="6" y="8" width="12" height="13" rx="2"/><path d="M10 13h4"/>',
  ropa: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.3 3-4 3S8 4.7 8 3Z"/>',
  tenis: '<path d="M3 15c0-3 1-7 2-8l3 1c.5 1.3 2 2 3.5 1.5L14 12c2 1 7 1 7 4v2H3z"/><path d="M3 18h18"/>',
  acc: '<path d="M4 16c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M2 16h17c1.7 0 3 .5 3 1.5S20.7 19 19 19H4"/><path d="M12 8V6"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  transfer: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 10h10l-3-3M17 14H7l3 3"/>',
  wa: '<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2 2 1-.6 1.6c-3.8.3-8.5-4.4-8.2-8.2l1.6-.6 1 2z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z"/>',
  dots: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>', bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>'
};
const svg = k => `<svg viewBox="0 0 24 24">${ICON[k]}</svg>`;

let tT;
function toast(m, bad) { const t = $("#toast"); t.textContent = m; t.className = "toast on" + (bad ? " bad" : ""); clearTimeout(tT); tT = setTimeout(() => t.className = "toast", 3200); }
function errMsg(e) {
  const c = (e && e.code) || "";
  const map = {
    "auth/invalid-credential": "Usuario o contraseña incorrectos.", "auth/wrong-password": "Usuario o contraseña incorrectos.",
    "auth/user-not-found": "Usuario o contraseña incorrectos.", "auth/invalid-login-credentials": "Usuario o contraseña incorrectos.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos.", "auth/network-request-failed": "Sin conexión a internet.",
    "auth/operation-not-allowed": "Activa 'Correo electrónico/contraseña' en Firebase › Authentication › Sign-in method.",
    "auth/configuration-not-found": "Activa Authentication en la consola de Firebase (Correo/contraseña).",
    "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.", "auth/email-already-in-use": "Ese usuario ya existe.",
    "auth/requires-recent-login": "Vuelve a iniciar sesión e inténtalo de nuevo.",
    "permission-denied": "Sin permiso. Revisa tu rol o publica las reglas de Firestore (firestore.rules).",
    "unavailable": "Sin conexión con la base de datos."
  };
  return map[c] || (e && e.message) || String(e);
}

/* ================= modal ================= */
let modalClose = null;
function modal(html, { onClose, wide } = {}) {
  $("#modalCard").innerHTML = html;
  $("#modalCard").style.width = wide ? "min(900px,100%)" : "";
  $("#modal").classList.add("on");
  modalClose = onClose || null;
  setTimeout(() => { const f = $("#modalCard input:not([type=hidden]):not([readonly]):not([type=checkbox]),#modalCard select"); f && f.focus(); }, 60);
  return $("#modalCard");
}
function closeModal() { $("#modal").classList.remove("on"); const f = modalClose; modalClose = null; f && f(); }
$("#modal").addEventListener("mousedown", e => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#modal.on")) closeModal(); });
document.addEventListener("click", e => { if (e.target.closest("[data-x]")) closeModal(); });
function confirmBox(title, text, okLabel = "Confirmar", danger) {
  return new Promise(res => {
    modal(`<h3>${esc(title)}</h3><p style="line-height:1.6;color:var(--ink2)">${text}</p><div class="modal-foot"><button class="btn" data-x>Cancelar</button><button class="btn ${danger ? "red" : "gold"}" id="cOk">${esc(okLabel)}</button></div>`, { onClose: () => res(false) });
    $("#cOk").onclick = () => { modalClose = null; closeModal(); res(true); };
  });
}
function promptBox(title, label, value = "", type = "text") {
  return new Promise(res => {
    modal(`<h3>${esc(title)}</h3><form id="pbF"><label>${esc(label)}<input id="pbV" type="${type}" value="${esc(value)}"></label><div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold">Aceptar</button></div></form>`, { onClose: () => res(null) });
    $("#pbF").onsubmit = e => { e.preventDefault(); const v = $("#pbV").value; modalClose = null; closeModal(); res(v); };
  });
}

/* ================= acceso ================= */
const DOMAIN = "saja-859b4.firebaseapp.com";
const OWNER = "carlos";
const OWNER_HASH = "23f823b31ccde1d282d386d644cd84ba76e79cd09a1c9a3fb74952e3d9f5f45c";
const emailOf = u => `${u.trim().toLowerCase()}@${DOMAIN}`;
const userOf = email => (email || "").split("@")[0];
async function sha(s) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }

let ME = null;
const isAdmin = () => ME && ME.role === "admin";

$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const u = $("#lu").value.trim().toLowerCase(), p = $("#lp").value;
  $("#loginErr").textContent = ""; $("#loginBtn").disabled = true; $("#loginBtn").textContent = "ENTRANDO…";
  try {
    try { await signInWithEmailAndPassword(auth, emailOf(u), p); }
    catch (err) {
      const firstRun = u === OWNER && (await sha(p)) === OWNER_HASH &&
        ["auth/invalid-credential", "auth/user-not-found", "auth/invalid-login-credentials"].includes(err.code);
      if (!firstRun) throw err;
      try { await createUserWithEmailAndPassword(auth, emailOf(u), p); }
      catch (e2) { throw e2.code === "auth/email-already-in-use" ? { code: "auth/wrong-password" } : e2; }
    }
  } catch (err) {
    $("#loginErr").textContent = errMsg(err);
  } finally { $("#loginBtn").disabled = false; $("#loginBtn").textContent = "ENTRAR"; }
});

onAuthStateChanged(auth, async user => {
  if (!user) { ME = null; stopAll(); $("#app").hidden = true; $("#login").hidden = false; return; }
  try {
    const ref = doc(db, "users", user.uid);
    let snap = await getDoc(ref);
    if (!snap.exists() && userOf(user.email) === OWNER) {
      await setDoc(ref, { username: OWNER, name: "Carlos", role: "admin", active: true, createdAt: now() });
      snap = await getDoc(ref);
    }
    if (!snap.exists() || snap.data().active === false) { await signOut(auth); $("#loginErr").textContent = "Tu usuario no tiene acceso al panel."; return; }
    ME = Object.assign({ uid: user.uid }, snap.data());
    startApp();
  } catch (err) { $("#loginErr").textContent = errMsg(err); await signOut(auth); }
});
$("#btnLogout").onclick = async () => { if (await confirmBox("Cerrar sesión", "¿Deseas salir del panel?", "Salir")) signOut(auth); };

/* Autorización de administrador para acciones de empleados (borrar, cancelar, editar) */
function adminSession(reason) {
  if (isAdmin()) return Promise.resolve({ db, name: ME.name, done: () => {} });
  return new Promise((resolve, reject) => {
    modal(`<h3>Autorización requerida</h3><p class="mut" style="margin-bottom:12px">${esc(reason || "Esta acción requiere usuario y contraseña de un administrador.")}</p>
      <form id="aForm"><label>Usuario administrador<input id="aU" autocomplete="off" autocapitalize="none" required></label>
      <label>Contraseña<input id="aP" type="password" autocomplete="off" required></label><p class="err" id="aErr"></p>
      <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold" id="aOk">Autorizar</button></div></form>`,
      { onClose: () => reject(new Error("cancelado")) });
    $("#aForm").onsubmit = async e => {
      e.preventDefault(); $("#aOk").disabled = true;
      const app2 = initializeApp(window.SAJA_FB, "auth-" + now());
      try {
        const a2 = initializeAuth(app2, { persistence: inMemoryPersistence });
        const cred = await signInWithEmailAndPassword(a2, emailOf($("#aU").value), $("#aP").value);
        const db2 = getFirestore(app2);
        const u = await getDoc(doc(db2, "users", cred.user.uid));
        if (!u.exists() || u.data().role !== "admin" || u.data().active === false) throw new Error("Ese usuario no es administrador.");
        modalClose = null; closeModal();
        resolve({ db: db2, name: u.data().name || u.data().username, done: async () => { try { await signOut(a2); await deleteApp(app2); } catch (e) {} } });
      } catch (err) { $("#aErr").textContent = errMsg(err); $("#aOk").disabled = false; deleteApp(app2).catch(() => {}); }
    };
  });
}
async function asAdmin(reason, fn) {
  let s;
  try { s = await adminSession(reason); } catch (e) { return; }
  try { return await fn(s.db, s.name); } catch (err) { toast(errMsg(err), true); } finally { s.done(); }
}

/* ================= datos ================= */
let PRODUCTS = [], CLIENTS = [], DEBTS = [], USERS = [], SALES_TODAY = [], ABONOS_TODAY = [], SALES_SEEN = {};
let SITE = Object.assign({}, window.SAJA_DEFAULTS);
let unsubs = [];
const P = id => PRODUCTS.find(p => p.id === id);
function stopAll() { unsubs.forEach(u => u()); unsubs = []; }
function setSync(ok) { const s = $("#sync"); s.classList.toggle("off", !ok); s.title = ok ? "Conectado" : "Sin conexión / sin permiso"; }
function listen(q, cb) {
  unsubs.push(onSnapshot(q, snap => { setSync(true); cb(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))); },
    err => { setSync(false); toast(errMsg(err), true); console.error(err); }));
}
const bumpCatalog = b => b.set(doc(db, "meta", "catalog"), { v: now() }, { merge: true });
async function bump(dbx = db) { try { await setDoc(doc(dbx, "meta", "catalog"), { v: now() }, { merge: true }); } catch (e) {} }
const seen = list => { list.forEach(s => SALES_SEEN[s.id] = s); return list; };
async function rangeDocs(col, from, to) {
  const s = await getDocs(query(collection(db, col), where("date", ">=", from), where("date", "<", to)));
  return s.docs.map(d => Object.assign({ id: d.id }, d.data())).sort((a, b) => b.date - a.date);
}

function startApp() {
  $("#login").hidden = true; $("#app").hidden = false;
  $("#meName").textContent = ME.name || ME.username;
  $("#meRole").textContent = isAdmin() ? "Administrador · Caja 1" : "Empleado · Caja 1";
  $("#meAvatar").textContent = (ME.name || ME.username || "?")[0].toUpperCase();
  stopAll();
  listen(collection(db, "products"), rows => { PRODUCTS = rows.sort((a, b) => (a.brand + a.name).localeCompare(b.brand + b.name)); refresh("products"); });
  listen(collection(db, "clients"), rows => { CLIENTS = rows.sort((a, b) => (a.name || "").localeCompare(b.name || "")); refresh("clients"); });
  listen(collection(db, "debts"), rows => { DEBTS = rows; refresh("debts"); checkAlarms(); });
  listen(collection(db, "users"), rows => { USERS = rows; refresh("users"); });
  listen(query(collection(db, "sales"), where("date", ">=", startOfDay())), rows => { SALES_TODAY = seen(rows.sort((a, b) => b.date - a.date)); refresh("sales"); });
  listen(query(collection(db, "abonos"), where("date", ">=", startOfDay())), rows => { ABONOS_TODAY = rows.sort((a, b) => b.date - a.date); refresh("sales"); });
  getDoc(doc(db, "config", "site")).then(s => { if (s.exists()) SITE = Object.assign({}, window.SAJA_DEFAULTS, s.data()); }).catch(() => {});
  buildNav();
  go(CUR || location.hash.slice(1) || "pos");
  DAY = today();
}
let DAY = today();
setInterval(() => { if (!ME) return; if (DAY !== today()) startApp(); else checkAlarms(); }, 60 * 1000);

/* ================= navegación ================= */
const VIEWS = {
  resumen: { t: "Resumen", s: "Lo más importante del día", i: "home", admin: true, deps: ["debts", "sales", "products"] },
  pos: { t: "Punto de venta", s: "Registra ventas, abonos y más", i: "pos", deps: ["products", "clients", "users"] },
  ventas: { t: "Ventas", s: "Historial, tickets y cancelaciones", i: "sales", admin: true, deps: ["sales"] },
  abonos: { t: "Abonos", s: "Mercancía a pagos, cobros y recordatorios", i: "abonos", deps: ["debts", "clients"] },
  clientes: { t: "Clientes", s: "Base de datos de clientes", i: "cli", admin: true, deps: ["clients", "debts"] },
  productos: { t: "Productos", s: "Precios, fotos y catálogo", i: "prod", deps: ["products"] },
  inventario: { t: "Inventario", s: "Existencias y entradas de mercancía", i: "inv", deps: ["products"] },
  reportes: { t: "Reportes", s: "Ventas, cobranza y gastos", i: "rep", admin: true, deps: [] },
  gastos: { t: "Gastos", s: "Salidas de dinero del negocio", i: "gastos", admin: true, deps: [] },
  cajas: { t: "Cajas", s: "Corte de caja del día", i: "cajas", deps: ["sales"] },
  usuarios: { t: "Usuarios", s: "Accesos y roles del personal", i: "users", admin: true, deps: ["users"] },
  config: { t: "Configuración", s: "Catálogo, portada y cuenta", i: "cfg", admin: true, deps: [] }
};
let CUR = "", PAINT = null;
function buildNav() {
  $("#nav").innerHTML = Object.entries(VIEWS).filter(([, v]) => !v.admin || isAdmin())
    .map(([k, v]) => `<a data-go="${k}" href="#${k}">${svg(v.i)}<span>${v.t}</span>${k === "abonos" ? '<i class="nb" id="nbDebts" hidden></i>' : ""}</a>`).join("");
}
document.addEventListener("click", e => {
  const a = e.target.closest("[data-go]"); if (!a) return;
  e.preventDefault(); go(a.dataset.go);
});
function go(v) {
  if (!VIEWS[v] || (VIEWS[v].admin && !isAdmin())) v = "pos";
  CUR = v; PAINT = null;
  history.replaceState(null, "", "#" + v);
  $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.go === v));
  $("#viewTitle").textContent = VIEWS[v].t; $("#viewSub").textContent = VIEWS[v].s;
  $("#side").classList.remove("on"); $("#scrim").classList.remove("on");
  RENDER[v]($("#view"));
  scrollTo(0, 0);
}
window.addEventListener("hashchange", () => { const v = location.hash.slice(1); if (ME && v && v !== CUR) go(v); });
function refresh(dep) { if (VIEWS[CUR] && VIEWS[CUR].deps.includes(dep) && PAINT) PAINT(); }
$("#btnSide").onclick = () => { $("#side").classList.add("on"); $("#scrim").classList.add("on"); };
$("#scrim").onclick = () => { $("#side").classList.remove("on"); $("#scrim").classList.remove("on"); };
$("#cfgBtn").onclick = () => isAdmin() ? go("config") : toast("Solo el administrador puede entrar a Configuración", true);
$("#helpBtn").onclick = () => modal(`<h3>Ayuda rápida</h3><div class="list">
  <div class="item"><div class="grow"><b>Vender</b><div class="small mut">Toca los productos para agregarlos, elige el método de pago y presiona COBRAR.</div></div></div>
  <div class="item"><div class="grow"><b>Venta en abonos</b><div class="small mut">Selecciona o registra al cliente, cambia a la pestaña "En abonos", indica enganche, frecuencia y monto de cada pago.</div></div></div>
  <div class="item"><div class="grow"><b>Cobros pendientes</b><div class="small mut">La campana roja indica clientes que hay que cobrar hoy o que ya se atrasaron. Desde Abonos puedes mandar el recordatorio por WhatsApp.</div></div></div>
  <div class="item"><div class="grow"><b>Empleados</b><div class="small mut">Para borrar, cancelar o editar se pide el usuario y contraseña de un administrador.</div></div></div>
  <div class="item"><div class="grow"><b>Lector de código / búsqueda</b><div class="small mut">Escribe en "Buscar producto…" y presiona Enter para agregar el primer resultado.</div></div></div>
  </div><div class="modal-foot"><button class="btn gold" data-x>Entendido</button></div>`);

/* búsqueda global */
$("#gSearch").addEventListener("input", e => {
  POS.q = e.target.value; POS.shown = 40;
  if (CUR !== "pos") go("pos"); else paintGrid();
});
$("#gSearch").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const list = posList(); if (list.length) { addToCart(list[0]); e.target.select(); }
});

/* ================= alarmas ================= */
function dueState(d) {
  if (d.status !== "activo") return "done";
  const x = dayDiff(d.nextDue);
  return x < 0 ? "late" : x === 0 ? "today" : x <= 3 ? "soon" : "ok";
}
const activeDebts = () => DEBTS.filter(d => d.status === "activo");
function checkAlarms() {
  const due = activeDebts().filter(d => ["late", "today"].includes(dueState(d)));
  const n = due.length;
  $("#alarmCount").hidden = !n; $("#alarmCount").textContent = n;
  const nb = $("#nbDebts"); if (nb) { nb.hidden = !n; nb.textContent = n; }
  const key = "saja_alarm_" + today();
  if (n && sessionStorage.getItem(key) !== String(n)) {
    sessionStorage.setItem(key, String(n));
    beep();
    toast(`⏰ Tienes ${n} cobro${n > 1 ? "s" : ""} pendiente${n > 1 ? "s" : ""} hoy`);
    if ("Notification" in window && Notification.permission === "granted") {
      try { new Notification("SAJA · Cobros pendientes", { body: due.slice(0, 4).map(d => `${d.clientName}: ${money(d.installment)}`).join("\n"), icon: "logo.png" }); } catch (e) {}
    }
  }
}
function beep() {
  try {
    const C = new (window.AudioContext || window.webkitAudioContext)();
    [0, .18].forEach(t => { const o = C.createOscillator(), g = C.createGain(); o.frequency.value = 880; o.connect(g); g.connect(C.destination);
      g.gain.setValueAtTime(.0001, C.currentTime + t); g.gain.exponentialRampToValueAtTime(.2, C.currentTime + t + .02); g.gain.exponentialRampToValueAtTime(.0001, C.currentTime + t + .15);
      o.start(C.currentTime + t); o.stop(C.currentTime + t + .16); });
  } catch (e) {}
}
$("#alarmBtn").onclick = () => {
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  ADEUDO_FILTER = "cobrar"; go("abonos");
};

function reminderMsg(d) {
  return `Hola ${d.clientName} 👋, te saluda SAJA Perfumes.\n` +
    `Te recordamos tu pago ${d.frequency || "quincenal"} de *${money(Math.min(d.installment || d.balance, d.balance))}* por: ${d.concept}.\n` +
    `📅 Fecha de pago: ${fdate(d.nextDue)}${dayDiff(d.nextDue) < 0 ? " (vencido)" : ""}\n` +
    `💰 Saldo pendiente: ${money(d.balance)}\n` +
    `Puedes pagar en tienda, por transferencia o en efectivo. ¡Gracias por tu preferencia! ✨`;
}
async function sendReminder(id) {
  const d = DEBTS.find(x => x.id === id); if (!d) return;
  if (!d.phone) return toast("Este cliente no tiene WhatsApp registrado", true);
  wa(d.phone, reminderMsg(d));
  try { await updateDoc(doc(db, "debts", id), { lastReminder: now() }); } catch (e) {}
}

/* ================= vistas ================= */
const RENDER = {};
function thumb(p) {
  return `<div class="thumb">${p && p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">` : `<span>${esc((p && (p.brand || p.name) || "S")[0])}</span>`}</div>`;
}
function debtRow(d) {
  const st = dueState(d);
  const pill = st === "late" ? `<span class="pill bad">Vencido ${-dayDiff(d.nextDue)}d</span>` : st === "today" ? `<span class="pill warn">Hoy</span>` : `<span class="pill blue">${fdate(d.nextDue)}</span>`;
  return `<div class="item"><div class="grow"><b>${esc(d.clientName)}</b><div class="small mut">${money(d.installment)} ${esc(d.frequency)} · saldo ${money(d.balance)}</div></div>${pill}
    <button class="btn xs wa" data-remind="${d.id}" title="Enviar recordatorio">${svg("wa")}</button>
    <button class="btn xs" data-abono="${d.id}">Abono</button></div>`;
}
function saleRow(s) {
  return `<div class="item"><div class="grow"><b>${esc(s.folio || "")} · ${money(s.total)}</b><div class="small mut">${hhmm(s.date)} · ${METHODS[s.method] || s.method} · ${esc(s.user || "")}${s.clientName ? " · " + esc(s.clientName) : ""}</div></div>
    ${s.status === "cancelada" ? '<span class="pill bad">Cancelada</span>' : ""}<button class="btn xs" data-ticket="${s.id}">${svg("print")}</button></div>`;
}
document.addEventListener("click", e => {
  const r = e.target.closest("[data-remind]"); if (r) return sendReminder(r.dataset.remind);
  const a = e.target.closest("[data-abono]"); if (a) return abonoModal(a.dataset.abono);
  const t = e.target.closest("[data-ticket]"); if (t) { const s = SALES_SEEN[t.dataset.ticket]; if (s) ticketModal(s); }
});
function seedBanner() {
  const b = $("#seedBanner"); if (!b) return;
  if (PRODUCTS.length || !isAdmin()) { b.innerHTML = ""; return; }
  b.innerHTML = `<div class="card" style="margin-bottom:14px;border-color:#6e5530;background:linear-gradient(135deg,#2b2114,#141414)"><div class="row"><div class="sp"><b>Tu inventario está vacío.</b><div class="mut">Importa los ${window.SAJA_SEED.length} perfumes de tus catálogos de Excel (Caballero y Dama) con precios, existencias y fotos.</div></div><button class="btn gold" id="btnSeed">Importar catálogo inicial</button></div></div>`;
  $("#btnSeed").onclick = seed;
}
async function seed() {
  if (!(await confirmBox("Importar catálogo", `Se agregarán ${window.SAJA_SEED.length} productos al inventario.`, "Importar"))) return;
  toast("Importando productos…");
  try {
    const list = window.SAJA_SEED;
    for (let i = 0; i < list.length; i += 400) {
      const b = writeBatch(db);
      list.slice(i, i + 400).forEach(p => { const { id, ...rest } = p; b.set(doc(db, "products", id), Object.assign(rest, { updatedAt: now() })); });
      await b.commit();
    }
    await bump(); toast("Catálogo importado ✔");
  } catch (e) { toast(errMsg(e), true); }
}

/* ---------- RESUMEN ---------- */
RENDER.resumen = el => {
  el.innerHTML = `<div id="seedBanner"></div><div class="kpis" id="kp"></div>
    <div class="cols"><div class="card"><h3>Cobros por hacer</h3><div class="list" id="dueList"></div></div>
    <div><div class="card"><h3>Ventas de hoy</h3><div class="list" id="todayList"></div></div>
    <div class="card"><h3>Más buscados sin existencia</h3><div class="list" id="lowList"></div></div></div></div>`;
  PAINT = () => {
    seedBanner();
    const sold = SALES_TODAY.filter(s => s.status !== "cancelada");
    const cobrado = sold.reduce((a, s) => a + (s.paidNow || 0), 0) + ABONOS_TODAY.filter(a => a.status !== "cancelado").reduce((a, x) => a + x.amount, 0);
    const act = activeDebts(); const late = act.filter(d => dueState(d) === "late"); const td = act.filter(d => dueState(d) === "today");
    $("#kp").innerHTML = `
      <div class="kpi dark"><small>Ventas de hoy</small><b>${money(sold.reduce((a, s) => a + s.total, 0))}</b><span>${sold.length} venta(s)</span></div>
      <div class="kpi ok"><small>Dinero cobrado hoy</small><b>${money(cobrado)}</b><span>Ventas + abonos</span></div>
      <div class="kpi gold"><small>Por cobrar</small><b>${money(act.reduce((a, d) => a + d.balance, 0))}</b><span>${act.length} cuenta(s) activas</span></div>
      <div class="kpi ${late.length ? "bad" : ""}"><small>Vencidos / Hoy</small><b>${late.length} / ${td.length}</b><span>Cobros pendientes</span></div>`;
    const due = act.filter(d => dueState(d) !== "ok").sort((a, b) => a.nextDue.localeCompare(b.nextDue));
    $("#dueList").innerHTML = due.length ? due.slice(0, 12).map(debtRow).join("") : `<div class="empty">Sin cobros próximos 🎉</div>`;
    $("#todayList").innerHTML = sold.length ? sold.slice(0, 8).map(saleRow).join("") : `<div class="empty">Aún no hay ventas hoy</div>`;
    const low = PRODUCTS.filter(p => p.featured && !(p.stock > 0));
    $("#lowList").innerHTML = low.length ? low.slice(0, 8).map(p => `<div class="item">${thumb(p)}<div class="grow pname"><b>${esc(p.name)}</b><small>${esc(p.brand)}</small></div><span class="pill bad">0 pzas</span></div>`).join("") : `<div class="empty">Todo en existencia</div>`;
  };
  PAINT();
};

/* ---------- PUNTO DE VENTA ---------- */
let CART = [];
const POS = { tab: "perfumes", sub: "", q: "", shown: 40, mode: "full", method: "efectivo", discType: "$", disc: "", recv: "", client: null, cq: "",
  notes: "", seller: "", date: "", delivery: "Entrega inmediata", ref: "", down: "", downMethod: "efectivo", freq: "quincenal", n: "", inst: "", first: "", nextFolio: "" };
const TABS = [["perfumes", "Perfumes", "perfume"], ["ropa", "Ropa", "ropa"], ["tenis", "Tenis", "tenis"], ["accesorios", "Accesorios", "acc"]];
const unitPrice = (p, mode = POS.mode) => mode === "abonos" ? (p.credit || p.cash || 0) : (p.cash || p.credit || 0);
function posList() {
  const q = norm(POS.q);
  return PRODUCTS.filter(p => {
    if (p.active === false && !q) return false;
    if (q) return q.split(/\s+/).every(w => norm(p.name + " " + p.brand + " " + (CATS[p.cat] || "")).includes(w));
    if (POS.tab === "perfumes") { if (!isPerfume(p.cat)) return false; if (POS.sub === "stock") return p.stock > 0; return !POS.sub || p.cat === POS.sub; }
    return p.cat === POS.tab;
  }).sort((a, b) => ((b.stock > 0) - (a.stock > 0)) || (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
}
function cartTotals() {
  const sub = CART.reduce((a, l) => a + l.qty * l.price, 0);
  const d = Math.max(0, num(POS.disc)); const disc = round2(Math.min(sub, POS.discType === "%" ? sub * Math.min(d, 100) / 100 : d));
  return { sub: round2(sub), disc, total: round2(Math.max(0, sub - disc)) };
}
async function loadNextFolio() {
  try { const s = await getDoc(doc(db, "meta", "counters")); POS.nextFolio = "NV-" + String(((s.exists() && s.data().sale) || 0) + 1).padStart(6, "0"); }
  catch (e) { POS.nextFolio = "NV-……"; }
  const f = $("#cartFolio"); if (f) f.textContent = "#" + POS.nextFolio;
}

RENDER.pos = el => {
  if (!POS.seller) POS.seller = ME.name; if (!POS.date) POS.date = today(); if (!POS.first) POS.first = addPeriod(today(), POS.freq);
  el.innerHTML = `<div id="seedBanner"></div><div class="pos">
    <div class="pos-left">
      <div class="pnl"><div class="cattabs" id="catTabs"></div><div class="subf" id="subF"></div><div class="pgrid" id="pGrid"></div></div>
      <div class="pos-bottom">
        <div class="pnl"><h3>Cliente <small>(Opcional)</small></h3>
          <div class="suggest"><div class="inline-add"><input id="cliQ" placeholder="Buscar cliente..." autocomplete="off" value="${esc(POS.cq)}"><button class="btn" id="cliNew" title="Nuevo cliente">${svg("plus")}</button></div><div class="suggest-list" id="cliSug" hidden></div></div>
          <div id="cliSel"></div>
          <h3 style="margin-top:16px">Notas <small>(Opcional)</small></h3>
          <textarea id="posNotes" rows="4" placeholder="Agregar notas de la venta...">${esc(POS.notes)}</textarea></div>
        <div class="pnl"><h3>Información de venta</h3><div style="display:grid;gap:12px">
          <div class="grid2"><label>Vendedor<select id="posSeller"></select></label><label>Fecha<input type="date" id="posDate" value="${POS.date}" max="${today()}"></label></div>
          <label>Método de entrega<select id="posDel">${["Entrega inmediata", "Envío a domicilio", "Apartado / recoger después", "Envío por paquetería"].map(o => `<option ${POS.delivery === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
          <label>Referencia <small class="mut">(Opcional)</small><input id="posRef" placeholder="Referencia o número de pedido..." value="${esc(POS.ref)}"></label></div></div>
      </div>
      <div class="pos-actions"><button class="btn" id="bClear">LIMPIAR CARRITO</button><button class="btn" id="bQuote">GUARDAR COTIZACIÓN</button><button class="btn gold" id="bFinish">FINALIZAR VENTA</button></div>
    </div>
    <div class="pos-right">
      <div class="pnl"><div class="cart-h"><h3>Venta actual</h3><span class="folio" id="cartFolio">#${esc(POS.nextFolio || "NV-……")}</span>
        <button class="icon" id="bQuotes" title="Cotizaciones guardadas">${svg("doc")}</button><button class="trash" id="bTrash" title="Vaciar venta">${svg("trash")}</button></div>
        <div id="cartBox"></div>
        <button class="add-line" id="bAddLine">${svg("plus")} Agregar producto</button>
        <div class="sum" id="sumBox"></div></div>
      <div class="pnl" id="payBox"></div>
    </div></div>`;
  seedBanner(); loadNextFolio();
  // pestañas
  const paintTabs = () => {
    $("#catTabs").innerHTML = TABS.map(([k, l, i]) => `<button class="cattab ${POS.tab === k && !POS.q ? "on" : ""}" data-tab="${k}">${svg(i)} ${l}</button>`).join("");
    $("#subF").innerHTML = POS.tab === "perfumes" && !POS.q ? [["", "Todos"], ["hombre", "Caballero"], ["mujer", "Dama"], ["unisex", "Unisex"], ["stock", "Con existencia"]].map(([k, l]) => `<button data-sub="${k}" class="${POS.sub === k ? "on" : ""}">${l}</button>`).join("") : "";
  };
  $("#catTabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; POS.tab = b.dataset.tab; POS.sub = ""; POS.q = ""; $("#gSearch").value = ""; POS.shown = 40; paintTabs(); paintGrid(); };
  $("#subF").onclick = e => { const b = e.target.closest("[data-sub]"); if (!b) return; POS.sub = b.dataset.sub; POS.shown = 40; paintTabs(); paintGrid(); };
  $("#pGrid").onclick = e => {
    if (e.target.closest("#gMore")) { POS.shown += 40; return paintGrid(); }
    const b = e.target.closest("[data-pid]"); if (b) addToCart(P(b.dataset.pid));
  };
  // cliente
  $("#cliQ").oninput = e => { POS.cq = e.target.value; suggestClients(); };
  $("#cliSug").onclick = e => { const r = e.target.closest("[data-cl]"); if (!r) return; selectClient(CLIENTS.find(c => c.id === r.dataset.cl)); };
  $("#cliNew").onclick = () => clientModal(null, c => selectClient(c));
  $("#cliSel").onclick = e => { if (e.target.closest("[data-unsel]")) selectClient(null); };
  $("#posNotes").oninput = e => POS.notes = e.target.value;
  $("#posDate").onchange = e => { POS.date = e.target.value && e.target.value <= today() ? e.target.value : today(); e.target.value = POS.date; POS.first = addPeriod(POS.date, POS.freq); const pf = $("#pFirst"); if (pf) pf.value = POS.first; };
  $("#posDel").onchange = e => POS.delivery = e.target.value;
  $("#posRef").oninput = e => POS.ref = e.target.value;
  $("#posSeller").onchange = e => POS.seller = e.target.value;
  // acciones
  $("#bClear").onclick = $("#bTrash").onclick = async () => { if (CART.length && !(await confirmBox("Limpiar carrito", "Se quitarán todos los productos de la venta actual.", "Limpiar"))) return; resetSale(); };
  $("#bQuote").onclick = saveQuote;
  $("#bQuotes").onclick = quotesModal;
  $("#bFinish").onclick = checkout;
  $("#bAddLine").onclick = addLineModal;
  paintTabs(); paintGrid(); paintClient(); paintSellers(); paintCart();
  PAINT = () => { seedBanner(); paintGrid(); paintSellers(); if (!$(".pos-right").contains(document.activeElement)) paintCart(); };
};
function paintSellers() {
  const s = $("#posSeller"); if (!s) return;
  const names = [...new Set([ME.name, ...USERS.filter(u => u.active !== false).map(u => u.name || u.username)])];
  s.innerHTML = names.map(n => `<option ${POS.seller === n ? "selected" : ""}>${esc(n)}</option>`).join("");
}
function paintGrid() {
  const g = $("#pGrid"); if (!g) return;
  const list = posList();
  g.innerHTML = list.slice(0, POS.shown).map(p => `<button class="pcard" data-pid="${p.id}">
      <div class="pimg">${p.img ? `<img src="${esc(p.img)}" alt="" loading="lazy" onerror="this.remove()">` : `<span>${esc((p.brand || p.name || "S")[0])}</span>`}<i class="st ${p.stock > 0 ? "" : "no"}">${p.stock > 0 ? p.stock + " pzs" : "Agotado"}</i></div>
      <div class="pb"><b>${esc(p.name)}</b><small>${isPerfume(p.cat) ? "Perfume · " + esc(p.brand) : esc(CATS[p.cat] || p.cat) + (p.brand ? " · " + esc(p.brand) : "")}</small>
      <div class="pr">${money(unitPrice(p))}</div></div></button>`).join("") +
    (list.length > POS.shown ? `<button class="btn" id="gMore" style="grid-column:1/-1">Ver más (${list.length - POS.shown})</button>` : "") ||
    `<div class="empty" style="grid-column:1/-1">${PRODUCTS.length ? (POS.q ? "Sin resultados para “" + esc(POS.q) + "”" : "No hay productos en esta categoría. Agrégalos en Productos.") : "No hay productos en inventario."}</div>`;
}
function suggestClients() {
  const box = $("#cliSug"); if (!box) return;
  const q = norm(POS.cq); if (q.length < 2) { box.hidden = true; return; }
  const list = CLIENTS.filter(c => norm(c.name + " " + c.phone).includes(q)).slice(0, 8);
  box.hidden = false;
  box.innerHTML = list.map(c => { const d = activeDebts().filter(x => x.clientId === c.id).reduce((a, x) => a + x.balance, 0);
    return `<div data-cl="${c.id}"><b>${esc(c.name)}</b> <span class="mut small">${esc(c.phone || "")}${d ? " · debe " + money(d) : ""}</span></div>`; }).join("") ||
    `<div class="mut" data-none>Sin coincidencias · usa el botón + para registrarlo</div>`;
}
function selectClient(c) { POS.client = c || null; POS.cq = ""; const q = $("#cliQ"); if (q) q.value = ""; const s = $("#cliSug"); if (s) s.hidden = true; paintClient(); paintPay(); }
function paintClient() {
  const el = $("#cliSel"); if (!el) return; const c = POS.client;
  if (!c) { el.innerHTML = ""; return; }
  const owe = activeDebts().filter(x => x.clientId === c.id).reduce((a, x) => a + x.balance, 0);
  el.innerHTML = `<div class="selcli"><div class="avatar">${esc(c.name[0] || "?")}</div><div class="sp"><b>${esc(c.name)}</b><br><small>${esc(c.phone || "sin WhatsApp")}${owe ? " · debe " + money(owe) : ""}</small></div><button class="icon" data-unsel title="Quitar">✕</button></div>`;
}
function addToCart(p, qty = 1) {
  if (!p) return;
  const l = CART.find(x => x.pid === p.id && !x.note);
  if (l) l.qty += qty; else CART.push({ pid: p.id, name: p.name, brand: p.brand, cat: p.cat, img: p.img || "", qty, price: unitPrice(p), manual: false, note: "" });
  if (!(p.stock > 0)) toast(`Aviso: ${p.name} no tiene existencia registrada`);
  paintCart();
}
function paintCart() {
  const box = $("#cartBox"); if (!box) return;
  box.innerHTML = CART.length ? `<div class="cart-lines">${CART.map((l, i) => `<div class="cl">
      ${thumb({ img: l.img, name: l.name, brand: l.brand })}
      <div style="min-width:0"><b>${esc(l.name)}</b><small>${isPerfume(l.cat) ? esc(l.brand) : esc(CATS[l.cat] || "Artículo")}${l.note ? " · " + esc(l.note) : ""}</small><small>${money(l.price)}${l.manual ? " ✎" : ""}</small></div>
      <input class="q" data-qty="${i}" value="${l.qty}" inputmode="numeric">
      <div class="lt">${money(l.qty * l.price)}</div>
      <button class="icon" data-menu="${i}">${svg("dots")}</button></div>`).join("")}</div>`
    : `<div class="empty" style="border:1px dashed var(--line2);border-radius:8px">Toca un producto para agregarlo</div>`;
  box.oninput = e => { const i = e.target.dataset.qty; if (i !== undefined) { CART[i].qty = Math.max(1, Math.round(num(e.target.value)) || 1); paintSum(); } };
  box.onchange = e => { if (e.target.dataset.qty !== undefined) paintCart(); };
  box.onclick = e => {
    const m = e.target.closest("[data-menu]"); if (!m) return;
    $$(".cl-menu").forEach(x => x.remove());
    const i = +m.dataset.menu, l = CART[i];
    const menu = document.createElement("div"); menu.className = "cl-menu";
    menu.innerHTML = `<button data-a="price">Cambiar precio</button><button data-a="note">${isPerfume(l.cat) ? "Nota" : "Talla / nota"}</button><button data-a="plus">+1 pieza</button><button data-a="del" class="del">Quitar de la venta</button>`;
    m.closest(".cl").appendChild(menu);
    menu.onclick = async ev => {
      const a = ev.target.dataset.a; if (!a) return; menu.remove();
      if (a === "price") { const v = await promptBox("Cambiar precio", `Precio unitario de ${l.name}`, l.price); if (v !== null && num(v) >= 0) { l.price = num(v); l.manual = true; } }
      if (a === "note") { const v = await promptBox(isPerfume(l.cat) ? "Nota" : "Talla / nota", "Ej. Talla M, 27 MX, color negro…", l.note); if (v !== null) l.note = v.trim(); }
      if (a === "plus") l.qty++;
      if (a === "del") CART.splice(i, 1);
      paintCart();
    };
    setTimeout(() => document.addEventListener("click", function h(ev) { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener("click", h); } }), 0);
  };
  paintSum();
}
function paintSum() {
  const s = $("#sumBox"); if (!s) return;
  const { sub, disc, total } = cartTotals();
  if (!s.dataset.built) {
    s.dataset.built = 1;
    s.innerHTML = `<div><span>Subtotal</span><span id="sSub"></span></div>
      <div><span class="disc">Descuento <button id="dType" title="Cambiar $ / %"></button><input id="dVal" inputmode="decimal" placeholder="0"></span><span id="sDisc"></span></div>
      <div class="tot"><span>Total</span><span id="sTot"></span></div>`;
    $("#dVal").value = POS.disc;
    $("#dVal").oninput = e => { POS.disc = e.target.value; paintSum(); };
    $("#dType").onclick = () => { POS.discType = POS.discType === "$" ? "%" : "$"; paintSum(); };
  }
  $("#dType").textContent = POS.discType;
  $("#sSub").textContent = money(sub); $("#sDisc").textContent = disc ? "-" + money(disc) : money(0); $("#sTot").textContent = money(total);
  paintPay();
}
function paintPay() {
  const box = $("#payBox"); if (!box) return;
  if (box.contains(document.activeElement) && box.dataset.sig === POS.mode + POS.method) return updatePayCalc();
  box.dataset.sig = POS.mode + POS.method;
  const { total } = cartTotals();
  const methodBtns = key => `<div class="methods">${[["efectivo", "Efectivo", "cash"], ["tarjeta", "Tarjeta", "card"], ["transferencia", "Transferencia", "transfer"]].map(([k, l, i]) => `<button data-${key}="${k}" class="${(key === "met" ? POS.method : POS.downMethod) === k ? "on" : ""}">${svg(i)}${l}</button>`).join("")}</div>`;
  box.innerHTML = `<div class="paytabs"><button data-mode="full" class="${POS.mode === "full" ? "on" : ""}">Pago completo</button><button data-mode="abonos" class="${POS.mode === "abonos" ? "on" : ""}">En abonos</button></div>
    <div class="paybox">${POS.mode === "full" ? `
      <div class="lbl">Método de pago</div>${methodBtns("met")}
      ${POS.method === "efectivo" ? `<div class="lbl">Recibido de cliente</div><div class="money-in"><span>$</span><input id="pRecv" inputmode="decimal" value="${esc(POS.recv)}" placeholder="0.00"></div>
      <div class="lbl">Cambio</div><div class="change" id="pChange">$0.00</div>` : `<div class="small mut">Confirma que el pago con ${POS.method} fue aprobado antes de cobrar.</div>`}`
    : `${POS.client ? `<div class="small">Cliente: <b class="gold-t">${esc(POS.client.name)}</b> · ${esc(POS.client.phone || "sin WhatsApp")}</div>` : `<div class="pill warn" style="height:auto;padding:8px 10px;white-space:normal">Selecciona o registra al cliente en el panel "Cliente" (botón +).</div>`}
      <div class="grid2"><label>Enganche<div class="money-in"><span>$</span><input id="pDown" inputmode="decimal" value="${esc(POS.down)}" placeholder="0.00"></div></label>
        <label>Frecuencia de pago<select id="pFreq">${Object.keys(FREQ).map(f => `<option ${POS.freq === f ? "selected" : ""}>${f}</option>`).join("")}</select></label>
        <label>Número de pagos<input id="pN" type="number" min="1" value="${esc(POS.n)}" placeholder="Ej. 3"></label>
        <label>Monto por pago<div class="money-in"><span>$</span><input id="pInst" inputmode="decimal" value="${esc(POS.inst)}"></div></label></div>
      <label>Fecha del primer pago<input type="date" id="pFirst" value="${esc(POS.first)}"></label>
      <div class="lbl">Método del enganche</div>${methodBtns("dm")}
      <div class="small mut" id="pPlan"></div>`}
      <button class="btn gold wide big" id="bPay"></button></div>`;
  box.onclick = e => {
    const m = e.target.closest("[data-mode]"); if (m) { POS.mode = m.dataset.mode; CART.forEach(l => { const p = l.pid && P(l.pid); if (p && !l.manual) l.price = unitPrice(p); }); paintGrid(); return paintCart(); }
    const mt = e.target.closest("[data-met]"); if (mt) { POS.method = mt.dataset.met; return paintPay(); }
    const dm = e.target.closest("[data-dm]"); if (dm) { POS.downMethod = dm.dataset.dm; return paintPay(); }
    if (e.target.closest("#bPay")) checkout();
  };
  box.oninput = e => {
    const id = e.target.id;
    if (id === "pRecv") POS.recv = e.target.value;
    if (id === "pDown") POS.down = e.target.value;
    if (id === "pInst") POS.inst = e.target.value;
    if (id === "pN") POS.n = e.target.value;
    if ((id === "pN" || id === "pDown") && num(POS.n) > 0) { POS.inst = String(Math.ceil(Math.max(0, cartTotals().total - num(POS.down)) / num(POS.n))); $("#pInst").value = POS.inst; }
    if (id === "pFirst") POS.first = e.target.value;
    updatePayCalc();
  };
  box.onchange = e => { if (e.target.id === "pFreq") { POS.freq = e.target.value; POS.first = addPeriod(POS.date || today(), POS.freq); $("#pFirst").value = POS.first; updatePayCalc(); } if (e.target.id === "pFirst") POS.first = e.target.value; };
  updatePayCalc();
}
function updatePayCalc() {
  const { total } = cartTotals();
  const b = $("#bPay"); if (b) b.textContent = POS.mode === "abonos" ? `COBRAR ENGANCHE ${money(num(POS.down))}` : `COBRAR ${money(total)}`;
  const ch = $("#pChange"); if (ch) { const c = num(POS.recv) - total; ch.textContent = POS.recv ? money(c) : "$0.00"; ch.classList.toggle("neg", !!POS.recv && c < 0); }
  const pl = $("#pPlan"); if (pl) {
    const rest = Math.max(0, total - num(POS.down)), inst = num(POS.inst);
    pl.innerHTML = `Total a crédito <b>${money(total)}</b> · financiado <b>${money(rest)}</b>${inst ? ` · ${Math.ceil(rest / inst)} pago(s) ${POS.freq}es de <b>${money(inst)}</b>` : ""}`;
  }
}
function resetSale() {
  CART = []; Object.assign(POS, { disc: "", discType: "$", recv: "", client: null, cq: "", notes: "", ref: "", down: "", n: "", inst: "", mode: "full", method: "efectivo", downMethod: "efectivo", freq: "quincenal", date: today(), first: addPeriod(today(), "quincenal"), seller: ME.name });
  if (CUR === "pos") RENDER.pos($("#view"));
}
function addLineModal() {
  modal(`<h3>Agregar producto</h3><input type="search" id="alQ" placeholder="Buscar en inventario…" autocomplete="off"><div class="list" id="alL" style="margin:10px 0;max-height:300px;overflow:auto"></div>
    <h3 style="margin-top:8px">Artículo libre <small class="mut">(no registrado en inventario)</small></h3>
    <form id="alF"><label>Descripción<input id="fN" required placeholder="Ej. Playera, tenis Nike talla 27…"></label>
    <div class="grid3"><label>Precio<input id="fP" inputmode="decimal" required></label><label>Cantidad<input id="fQ" type="number" value="1" min="1"></label>
    <label>Tipo<select id="fC"><option value="ropa">Ropa</option><option value="tenis">Tenis</option><option value="accesorios">Accesorio</option><option value="hombre">Perfume</option></select></label></div>
    <div class="modal-foot"><button type="button" class="btn" data-x>Cerrar</button><button class="btn gold">Agregar artículo libre</button></div></form>`);
  const paint = () => {
    const q = norm($("#alQ").value);
    $("#alL").innerHTML = q.length < 2 ? `<div class="small mut">Escribe al menos 2 letras…</div>` : PRODUCTS.filter(p => q.split(/\s+/).every(w => norm(p.name + " " + p.brand).includes(w))).slice(0, 15)
      .map(p => `<div class="item" data-al="${p.id}" style="cursor:pointer">${thumb(p)}<div class="grow pname"><b>${esc(p.name)}</b><small>${esc(p.brand)} · ${p.stock || 0} pzs</small></div><b>${money(unitPrice(p))}</b></div>`).join("") || `<div class="small mut">Sin resultados</div>`;
  };
  $("#alQ").oninput = paint; paint();
  $("#alL").onclick = e => { const r = e.target.closest("[data-al]"); if (r) { addToCart(P(r.dataset.al)); toast("Agregado ✔"); } };
  $("#alF").onsubmit = e => { e.preventDefault(); CART.push({ pid: null, name: $("#fN").value.trim(), brand: "", cat: $("#fC").value, img: "", qty: Math.max(1, num($("#fQ").value)), price: num($("#fP").value), manual: true, note: "" }); closeModal(); paintCart(); };
}
async function nextFolio() {
  const ref = doc(db, "meta", "counters");
  const n = await runTransaction(db, async tx => { const s = await tx.get(ref); const n = ((s.exists() && s.data().sale) || 0) + 1; tx.set(ref, { sale: n }, { merge: true }); return n; });
  return "NV-" + String(n).padStart(6, "0");
}
async function checkout() {
  if (!CART.length) return toast("Agrega productos a la venta", true);
  const noPrice = CART.find(l => !(l.price > 0)); if (noPrice) return toast(`"${noPrice.name}" no tiene precio. Usa ⋮ › Cambiar precio`, true);
  const { sub, disc, total } = cartTotals();
  if (!(total > 0)) return toast("El total de la venta debe ser mayor a $0", true);
  const abonos = POS.mode === "abonos";
  let plan = null;
  if (abonos) {
    if (!POS.client) return toast("Selecciona o registra al cliente para vender en abonos", true);
    const down = num(POS.down), inst = num(POS.inst);
    if (!inst) return toast("Indica el monto de cada pago", true);
    if (down >= total) return toast("El enganche cubre el total: cobra como pago completo", true);
    if (!POS.first) return toast("Indica la fecha del primer pago", true);
    plan = { down, inst, freq: POS.freq, first: POS.first };
  }
  const recv = !abonos && POS.method === "efectivo" ? num(POS.recv) : 0;
  if (recv && recv < total) return toast("El efectivo recibido es menor al total", true);
  const ok = await confirmBox("Confirmar venta", `Total <b class="gold-t">${money(total)}</b> · ${abonos ? "En abonos" : METHODS[POS.method]}${POS.client ? `<br>Cliente: <b>${esc(POS.client.name)}</b>` : ""}${plan ? `<br>Enganche ${money(plan.down)} (${POS.downMethod}) · ${money(plan.inst)} ${plan.freq} desde ${fdate(plan.first)}` : ""}${recv ? `<br>Cambio: <b>${money(recv - total)}</b>` : ""}`, "Cobrar");
  if (!ok) return;
  $$("#bPay,#bFinish").forEach(b => b.disabled = true);
  try {
    const folio = await nextFolio();
    const b = writeBatch(db);
    const items = CART.map(l => { const p = l.pid && P(l.pid); const dec = p ? Math.min(l.qty, Math.max(0, p.stock || 0)) : 0; return { id: l.pid, name: l.name, brand: l.brand || "", cat: l.cat || "", note: l.note || "", qty: l.qty, price: l.price, dec }; });
    const concept = items.map(i => (i.qty > 1 ? i.qty + "× " : "") + i.name + (i.note ? ` (${i.note})` : "")).join(", ");
    const c = POS.client;
    let debtId = null;
    if (plan) {
      const dref = doc(collection(db, "debts")); debtId = dref.id;
      b.set(dref, { clientId: c.id, clientName: c.name, phone: c.phone || "", concept, items, total, downPayment: plan.down, paid: plan.down, balance: total - plan.down,
        installment: plan.inst, frequency: plan.freq, nextDue: plan.first, status: "activo", folio, createdAt: now(), createdBy: ME.name, lastReminder: 0 });
    }
    const date = POS.date === today() ? now() : parseD(POS.date).getTime() + 12 * 36e5;
    const sref = doc(collection(db, "sales"));
    const sale = { folio, date, items, subtotal: sub, discount: disc, total, method: abonos ? "plazos" : POS.method, downMethod: abonos ? POS.downMethod : null,
      paidNow: plan ? plan.down : total, received: recv, change: recv ? recv - total : 0,
      clientId: c ? c.id : null, clientName: c ? c.name : "", debtId, user: POS.seller || ME.name, cashier: ME.name, uid: ME.uid,
      notes: POS.notes, delivery: POS.delivery, ref: POS.ref, status: "ok" };
    b.set(sref, sale);
    items.forEach(i => { if (i.id && i.dec) { b.update(doc(db, "products", i.id), { stock: increment(-i.dec), updatedAt: now() }); b.set(doc(collection(db, "stockLog")), { productId: i.id, name: i.name, qty: -i.dec, type: "venta", ref: folio, user: ME.name, date: now() }); } });
    bumpCatalog(b);
    await b.commit();
    const full = Object.assign({ id: sref.id }, sale); SALES_SEEN[sref.id] = full;
    toast(`Venta ${folio} registrada ✔`);
    resetSale(); loadNextFolio();
    ticketModal(full);
  } catch (e) { toast(errMsg(e), true); }
  $$("#bPay,#bFinish").forEach(b => b.disabled = false);
}
function ticketHTML(s, title = "") {
  return `<h4>SAJA PERFUMES</h4><p style="text-align:center">${esc(SITE.phoneLabel || "")}<br>${ftime(s.date)}<br>${title || "Folio " + esc(s.folio)}</p><hr>
    <table>${s.items.map(i => `<tr><td>${i.qty}× ${esc(i.name)}${i.note ? " (" + esc(i.note) + ")" : ""}</td><td style="text-align:right">${money(i.qty * i.price)}</td></tr>`).join("")}</table><hr>
    <table><tr><td>Subtotal</td><td style="text-align:right">${money(s.subtotal)}</td></tr>${s.discount ? `<tr><td>Descuento</td><td style="text-align:right">-${money(s.discount)}</td></tr>` : ""}
    <tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${money(s.total)}</b></td></tr>${s.method ? `<tr><td>Pago</td><td style="text-align:right">${METHODS[s.method]}</td></tr>` : ""}
    ${s.method === "plazos" ? `<tr><td>Enganche</td><td style="text-align:right">${money(s.paidNow)}</td></tr><tr><td>Saldo</td><td style="text-align:right">${money(s.total - s.paidNow)}</td></tr>` : ""}
    ${s.received ? `<tr><td>Recibido</td><td style="text-align:right">${money(s.received)}</td></tr><tr><td>Cambio</td><td style="text-align:right">${money(s.change)}</td></tr>` : ""}</table>
    ${s.clientName ? `<p>Cliente: ${esc(s.clientName)}</p>` : ""}${s.delivery && s.delivery !== "Entrega inmediata" ? `<p>Entrega: ${esc(s.delivery)}</p>` : ""}${s.user ? `<p>Atendió: ${esc(s.user)}</p>` : ""}${s.notes ? `<p>Notas: ${esc(s.notes)}</p>` : ""}<hr><p style="text-align:center">${title ? "Cotización válida por 7 días" : "¡Gracias por tu compra! Perfumes 100% originales"}</p>`;
}
function ticketModal(s) {
  const ph = (CLIENTS.find(c => c.id === s.clientId) || {}).phone;
  modal(`<h3>Venta ${esc(s.folio)} ${s.status === "cancelada" ? '<span class="pill bad">Cancelada</span>' : (s.method === "plazos" ? '<span class="pill warn">En abonos</span>' : '<span class="pill ok">Pagada</span>')}</h3>
    <div class="ticket-paper">${ticketHTML(s)}</div>
    <div class="modal-foot">${s.status !== "cancelada" ? `<button class="btn red" id="tkCancel">Cancelar venta</button>` : ""}<span class="sp"></span>
      ${ph ? `<button class="btn wa" id="tkWa">${svg("wa")} WhatsApp</button>` : ""}
      <button class="btn" id="tkPrint">${svg("print")} Imprimir</button><button class="btn gold" data-x>Listo</button></div>`);
  $("#tkPrint").onclick = () => { $("#printArea").innerHTML = ticketHTML(s); window.print(); };
  const w = $("#tkWa"); if (w) w.onclick = () => wa(ph, `Hola ${s.clientName || ""} 👋 Gracias por tu compra en SAJA Perfumes.\nFolio ${s.folio}\n${s.items.map(i => `• ${i.qty}× ${i.name} ${money(i.price * i.qty)}`).join("\n")}\nTotal: ${money(s.total)}${s.method === "plazos" ? `\nEnganche: ${money(s.paidNow)}\nSaldo: ${money(s.total - s.paidNow)}` : ""}`);
  const c = $("#tkCancel"); if (c) c.onclick = () => cancelSale(s);
}
async function cancelSale(s) {
  closeModal();
  await asAdmin("Cancelar una venta requiere autorización del administrador.", async (dbx, who) => {
    if (!(await confirmBox("Cancelar venta " + s.folio, "Se regresará el inventario. Si fue en abonos, se cancela la cuenta del cliente y sus abonos dejan de contar como cobrados (devolución).", "Cancelar venta", true))) return;
    const b = writeBatch(dbx);
    b.update(doc(dbx, "sales", s.id), { status: "cancelada", cancelledBy: who, cancelledAt: now() });
    (s.items || []).forEach(i => { if (i.id && i.dec) { b.update(doc(dbx, "products", i.id), { stock: increment(i.dec), updatedAt: now() }); b.set(doc(collection(dbx, "stockLog")), { productId: i.id, name: i.name, qty: i.dec, type: "cancelación", ref: s.folio, user: who, date: now() }); } });
    if (s.debtId) {
      b.update(doc(dbx, "debts", s.debtId), { status: "cancelado", cancelledBy: who, cancelledAt: now() });
      const ab = await getDocs(query(collection(dbx, "abonos"), where("debtId", "==", s.debtId)));
      ab.docs.forEach(x => b.update(doc(dbx, "abonos", x.id), { status: "cancelado", cancelledBy: who, cancelledAt: now() }));
    }
    b.set(doc(dbx, "meta", "catalog"), { v: now() }, { merge: true });
    await b.commit(); s.status = "cancelada"; toast("Venta cancelada"); if (PAINT) PAINT();
  });
}
/* cotizaciones */
async function saveQuote() {
  if (!CART.length) return toast("Agrega productos para cotizar", true);
  const { sub, disc, total } = cartTotals(); const c = POS.client;
  const q = { date: now(), items: CART.map(l => ({ id: l.pid, name: l.name, brand: l.brand || "", cat: l.cat || "", img: l.img || "", note: l.note || "", qty: l.qty, price: l.price })),
    subtotal: sub, discount: disc, total, mode: POS.mode, clientId: c ? c.id : null, clientName: c ? c.name : "", phone: c ? c.phone || "" : "", notes: POS.notes, user: ME.name };
  try { await setDoc(doc(collection(db, "quotes")), q); } catch (e) { return toast(errMsg(e), true); }
  modal(`<h3>Cotización guardada ✔</h3><div class="ticket-paper">${ticketHTML(q, "COTIZACIÓN")}</div><div class="modal-foot">
    ${q.phone ? `<button class="btn wa" id="qWa">${svg("wa")} Enviar por WhatsApp</button>` : ""}<button class="btn" id="qPr">${svg("print")} Imprimir</button><button class="btn gold" data-x>Listo</button></div>`);
  $("#qPr").onclick = () => { $("#printArea").innerHTML = ticketHTML(q, "COTIZACIÓN"); window.print(); };
  const w = $("#qWa"); if (w) w.onclick = () => wa(q.phone, `Hola ${q.clientName} 👋 Te comparto tu cotización de SAJA Perfumes:\n${q.items.map(i => `• ${i.qty}× ${i.name} ${money(i.price * i.qty)}`).join("\n")}\nTotal: ${money(q.total)}\nVálida por 7 días. ¡Quedo atento!`);
}
async function quotesModal() {
  modal(`<h3>Cotizaciones guardadas</h3><div class="list" id="qL"><div class="empty">Cargando…</div></div><div class="modal-foot"><button class="btn gold" data-x>Cerrar</button></div>`, { wide: true });
  try {
    const rows = await rangeDocs("quotes", now() - 60 * 864e5, now() + 864e5);
    const paint = () => $("#qL").innerHTML = rows.map(q => `<div class="item" data-q="${q.id}"><div class="grow"><b>${money(q.total)} · ${esc(q.clientName || "Sin cliente")}</b><div class="small mut">${ftime(q.date)} · ${q.items.length} producto(s) · ${esc(q.user)}</div><div class="small mut">${esc(q.items.map(i => i.name).join(", ").slice(0, 120))}</div></div>
      <button class="btn sm gold" data-load>Cargar</button><button class="btn sm" data-del>${svg("trash")}</button></div>`).join("") || `<div class="empty">No hay cotizaciones en los últimos 60 días</div>`;
    paint();
    $("#qL").onclick = async e => {
      const it = e.target.closest("[data-q]"); if (!it) return; const q = rows.find(x => x.id === it.dataset.q);
      if (e.target.closest("[data-load]")) {
        CART = q.items.map(i => ({ pid: i.id, name: i.name, brand: i.brand, cat: i.cat, img: i.img, qty: i.qty, price: i.price, manual: true, note: i.note }));
        POS.mode = q.mode || "full"; POS.client = CLIENTS.find(c => c.id === q.clientId) || null; POS.notes = q.notes || "";
        closeModal(); RENDER.pos($("#view")); toast("Cotización cargada");
      }
      if (e.target.closest("[data-del]")) { try { await deleteDoc(doc(db, "quotes", q.id)); rows.splice(rows.indexOf(q), 1); paint(); } catch (err) { toast(errMsg(err), true); } }
    };
  } catch (err) { $("#qL").innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; }
}

/* ---------- VENTAS ---------- */
let VEN = { from: "", to: "", q: "", m: "" }, VEN_LIST = [];
RENDER.ventas = el => {
  if (!VEN.from) VEN.from = VEN.to = today();
  el.innerHTML = `<div class="tools"><input type="date" id="vF" value="${VEN.from}"><input type="date" id="vT" value="${VEN.to}">
    <select id="vM"><option value="">Todos los métodos</option>${Object.entries(METHODS).map(([k, v]) => `<option value="${k}" ${VEN.m === k ? "selected" : ""}>${v}</option>`).join("")}</select>
    <input type="search" id="vQ" placeholder="Buscar folio, cliente o producto…" value="${esc(VEN.q)}"><button class="btn gold" id="vGo">Consultar</button></div>
    <div class="kpis" id="vK"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Vendedor</th><th class="num">Total</th><th>Estado</th><th></th></tr></thead><tbody id="vB"></tbody></table></div>`;
  const paint = () => {
    const q = norm(VEN.q);
    const list = VEN_LIST.filter(s => (!VEN.m || s.method === VEN.m) && (!q || norm(s.folio + " " + s.clientName + " " + s.items.map(i => i.name).join(" ")).includes(q)));
    const ok = list.filter(s => s.status !== "cancelada");
    $("#vK").innerHTML = `<div class="kpi dark"><small>Total vendido</small><b>${money(ok.reduce((a, s) => a + s.total, 0))}</b><span>${ok.length} venta(s)</span></div>
      <div class="kpi ok"><small>Cobrado en la venta</small><b>${money(ok.reduce((a, s) => a + (s.paidNow || 0), 0))}</b></div>
      <div class="kpi"><small>Piezas vendidas</small><b>${ok.reduce((a, s) => a + s.items.reduce((x, i) => x + i.qty, 0), 0)}</b></div>
      <div class="kpi bad"><small>Canceladas</small><b>${list.length - ok.length}</b></div>`;
    $("#vB").innerHTML = list.map(s => `<tr><td><b>${esc(s.folio)}</b></td><td>${ftime(s.date)}</td><td>${esc(s.clientName || "—")}</td>
      <td class="small">${esc(s.items.map(i => i.qty + "× " + i.name).join(", ").slice(0, 70))}</td><td><span class="pill ${s.method === "plazos" ? "warn" : ""}">${METHODS[s.method] || s.method}</span></td><td>${esc(s.user || "")}</td>
      <td class="num"><b>${money(s.total)}</b></td><td>${s.status === "cancelada" ? '<span class="pill bad">Cancelada</span>' : (s.method === "plazos" ? '<span class="pill warn">En abonos</span>' : '<span class="pill ok">Pagada</span>')}</td>
      <td><button class="btn xs" data-ticket="${s.id}">${svg("print")} Ver</button></td></tr>`).join("") || `<tr><td colspan="9"><div class="empty">Sin ventas en el periodo</div></td></tr>`;
  };
  const run = async () => {
    VEN.from = $("#vF").value || today(); VEN.to = $("#vT").value || VEN.from; if (VEN.from > VEN.to) { [VEN.from, VEN.to] = [VEN.to, VEN.from]; $("#vF").value = VEN.from; $("#vT").value = VEN.to; }
    $("#vB").innerHTML = `<tr><td colspan="9"><div class="empty">Cargando…</div></td></tr>`;
    try { VEN_LIST = seen(await rangeDocs("sales", parseD(VEN.from).getTime(), endOf(VEN.to))); paint(); }
    catch (err) { $("#vB").innerHTML = `<tr><td colspan="9"><div class="empty">${esc(errMsg(err))}</div></td></tr>`; }
  };
  $("#vGo").onclick = run; $("#vM").onchange = e => { VEN.m = e.target.value; paint(); }; $("#vQ").oninput = e => { VEN.q = e.target.value; paint(); };
  PAINT = () => { if (VEN.to === today()) run(); };
  run();
};

/* ---------- PRODUCTOS ---------- */
let INV = { q: "", cat: "", st: "", shown: 60 };
RENDER.productos = el => {
  el.innerHTML = `<div id="seedBanner"></div><div class="tools">
      <input type="search" id="iQ" placeholder="Buscar por nombre o marca…" value="${esc(INV.q)}">
      <select id="iCat"><option value="">Todas las categorías</option>${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${INV.cat === k ? "selected" : ""}>${v}</option>`).join("")}</select>
      <select id="iSt"><option value="">Todo</option><option value="in">Con existencia</option><option value="out">Sin existencia</option><option value="hid">Ocultos</option><option value="nophoto">Sin foto</option></select>
      <button class="btn gold" id="iNew">${svg("plus")} Nuevo producto</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Producto</th><th>Categoría</th><th>Existencia</th><th class="num">Contado</th><th class="num">Crédito</th>${isAdmin() ? "<th>Visible</th><th>Top</th>" : ""}<th></th></tr></thead><tbody id="iBody"></tbody></table></div>
    <div class="more-row"><button class="btn" id="iMore" hidden>Ver más</button></div>`;
  $("#iSt").value = INV.st;
  $("#iQ").oninput = e => { INV.q = e.target.value; INV.shown = 60; paint(); };
  $("#iCat").onchange = e => { INV.cat = e.target.value; INV.shown = 60; paint(); };
  $("#iSt").onchange = e => { INV.st = e.target.value; INV.shown = 60; paint(); };
  $("#iMore").onclick = () => { INV.shown += 60; paint(); };
  $("#iNew").onclick = () => productModal(null);
  const paint = () => {
    seedBanner();
    const q = norm(INV.q);
    const list = PRODUCTS.filter(p => (!INV.cat || p.cat === INV.cat) && (!q || q.split(/\s+/).every(w => norm(p.name + " " + p.brand).includes(w))) &&
      (INV.st !== "in" || p.stock > 0) && (INV.st !== "out" || !(p.stock > 0)) && (INV.st !== "hid" || p.active === false) && (INV.st !== "nophoto" || !p.img));
    $("#iBody").innerHTML = list.slice(0, INV.shown).map(p => `<tr data-id="${p.id}"><td>${thumb(p)}</td>
      <td class="pname"><b>${esc(p.name)}</b><small>${esc(p.brand)}${p.tags && p.tags.includes("sets") ? " · Set" : ""}${p.sizes ? " · " + esc(p.sizes) : ""}</small></td>
      <td><span class="pill">${CATS[p.cat] || p.cat}</span></td>
      <td><span class="pill ${p.stock > 0 ? "ok" : "bad"}">${p.stock || 0} pzs</span></td>
      ${isAdmin() ? `<td class="num"><input data-f="cash" value="${p.cash || 0}" style="width:96px;text-align:right"></td><td class="num"><input data-f="credit" value="${p.credit || 0}" style="width:96px;text-align:right"></td>
        <td><input type="checkbox" data-t="active" ${p.active !== false ? "checked" : ""}></td><td><input type="checkbox" data-t="featured" ${p.featured ? "checked" : ""}></td>`
      : `<td class="num">${money(p.cash)}</td><td class="num">${money(p.credit)}</td>`}
      <td><button class="btn xs" data-edit>${svg("edit")} Editar</button></td></tr>`).join("") || `<tr><td colspan="9"><div class="empty">Sin productos</div></td></tr>`;
    $("#iMore").hidden = list.length <= INV.shown;
  };
  $("#iBody").onclick = e => { const tr = e.target.closest("tr[data-id]"); if (tr && e.target.closest("[data-edit]")) productModal(P(tr.dataset.id)); };
  $("#iBody").onchange = async e => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const id = tr.dataset.id;
    try {
      if (e.target.dataset.f) await updateDoc(doc(db, "products", id), { [e.target.dataset.f]: num(e.target.value), updatedAt: now() });
      if (e.target.dataset.t) await updateDoc(doc(db, "products", id), { [e.target.dataset.t]: e.target.checked, updatedAt: now() });
      await bump(); toast("Guardado ✔");
    } catch (err) { toast(errMsg(err), true); }
  };
  PAINT = () => { if (!$("#iBody").contains(document.activeElement)) paint(); };
  paint();
};
async function compressImage(file, max = 700) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  let out = c.toDataURL("image/webp", .8); if (!out.startsWith("data:image/webp")) out = c.toDataURL("image/jpeg", .8);
  return out;
}
function productModal(p) {
  const isNew = !p;
  const open = (dbx, who, done) => {
    const x = p || { name: "", brand: "", cat: "hombre", tags: [], stock: 0, cash: 0, credit: 0, img: "", featured: false, active: true, desc: "", sizes: "" };
    const brands = [...new Set(PRODUCTS.map(q => q.brand).filter(Boolean))].sort();
    modal(`<h3>${isNew ? "Nuevo producto" : "Editar producto"}</h3><form id="pF">
      <div class="imgbox"><div class="thumb" id="pTh">${x.img ? `<img src="${esc(x.img)}">` : "<span>Foto</span>"}</div>
        <div style="flex:1;display:grid;gap:8px"><label>Enlace (URL) de la foto<input id="pImg" value="${esc(x.img && !x.img.startsWith("data:") ? x.img : "")}" placeholder="https://…"></label>
        <div class="row"><label class="btn sm" style="display:inline-flex">Subir foto<input type="file" id="pFile" accept="image/*" hidden></label>
        <a class="btn sm" id="pGoogle" target="_blank" rel="noopener">${svg("search")} Buscar en Google</a><button type="button" class="btn sm" id="pNoImg">Quitar</button></div></div></div>
      <div class="grid2"><label>Nombre<input id="pName" value="${esc(x.name)}" required></label>
        <label>Marca<input id="pBrand" value="${esc(x.brand)}" list="brandList"><datalist id="brandList">${brands.map(b => `<option value="${esc(b)}">`).join("")}</datalist></label></div>
      <div class="grid3"><label>Categoría<select id="pCat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${x.cat === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label>Precio contado<input id="pCash" inputmode="decimal" value="${x.cash || 0}"></label><label>Precio crédito<input id="pCredit" inputmode="decimal" value="${x.credit || 0}"></label></div>
      <div class="grid3"><label>Existencia${isNew ? "" : " (usa Inventario)"}<input id="pStock" type="number" value="${x.stock || 0}" ${isNew ? "" : "readonly"}></label>
        <label>Tallas (ropa/tenis)<input id="pSizes" value="${esc(x.sizes || "")}" placeholder="Ej. CH, M, G / 25–29"></label>
        <div style="display:grid;gap:8px;align-content:end"><label class="row" style="display:flex"><input type="checkbox" id="pSet" ${(x.tags || []).includes("sets") ? "checked" : ""}> Set / regalo</label>
        <label class="row" style="display:flex"><input type="checkbox" id="pFeat" ${x.featured ? "checked" : ""}> Más buscado</label>
        <label class="row" style="display:flex"><input type="checkbox" id="pAct" ${x.active !== false ? "checked" : ""}> Visible en catálogo</label></div></div>
      <label>Descripción (opcional)<textarea id="pDesc" rows="3">${esc(x.desc || "")}</textarea></label>
      <div class="modal-foot">${!isNew ? `<button type="button" class="btn red" id="pDel">${svg("trash")} Eliminar</button><span class="sp"></span>` : ""}
        <button type="button" class="btn" data-x>Cancelar</button><button class="btn gold" id="pSave">Guardar</button></div></form>`, { onClose: done });
    let img = x.img || "";
    const setImg = v => { img = v; $("#pTh").innerHTML = v ? `<img src="${esc(v)}" onerror="this.outerHTML='<span>Error</span>'">` : "<span>Foto</span>"; };
    const g = () => $("#pGoogle").href = "https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(`${$("#pBrand").value} ${$("#pName").value} ${isPerfume($("#pCat").value) ? "perfume" : ""}`);
    g(); $("#pName").oninput = g; $("#pBrand").oninput = g;
    $("#pImg").oninput = e => setImg(e.target.value.trim());
    $("#pNoImg").onclick = () => { $("#pImg").value = ""; setImg(""); };
    $("#pFile").onchange = async e => { const f = e.target.files[0]; if (!f) return; try { setImg(await compressImage(f)); $("#pImg").value = ""; toast("Foto lista, presiona Guardar"); } catch (err) { toast("No se pudo leer la imagen", true); } };
    $("#pF").onsubmit = async e => {
      e.preventDefault(); $("#pSave").disabled = true;
      const data = { name: $("#pName").value.trim(), brand: $("#pBrand").value.trim(), cat: $("#pCat").value, cash: num($("#pCash").value), credit: num($("#pCredit").value),
        sizes: $("#pSizes").value.trim(), desc: $("#pDesc").value.trim(), img, featured: $("#pFeat").checked, active: $("#pAct").checked,
        tags: $("#pSet").checked ? ["sets"] : [], updatedAt: now() };
      try {
        if (isNew) {
          let id = slug(`${data.cat} ${data.brand} ${data.name}`) || "p-" + now(); if (P(id)) id += "-" + now().toString(36).slice(-4);
          data.stock = num($("#pStock").value); data.createdBy = who;
          await setDoc(doc(dbx, "products", id), data);
          if (data.stock) await setDoc(doc(collection(dbx, "stockLog")), { productId: id, name: data.name, qty: data.stock, type: "entrada", note: "Alta de producto", user: who, date: now() });
        } else await updateDoc(doc(dbx, "products", p.id), data);
        await bump(dbx); closeModal(); toast("Producto guardado ✔");
      } catch (err) { toast(errMsg(err), true); $("#pSave").disabled = false; }
    };
    const del = $("#pDel"); if (del) del.onclick = async () => {
      const keep = modalClose; modalClose = null;
      if (!(await confirmBox("Eliminar producto", `¿Eliminar <b>${esc(p.name)}</b> de forma permanente? Si solo quieres ocultarlo, desmarca "Visible en catálogo".`, "Eliminar", true))) { keep && keep(); return; }
      try { await deleteDoc(doc(dbx, "products", p.id)); await bump(dbx); toast("Producto eliminado"); } catch (err) { toast(errMsg(err), true); }
      keep && keep();
    };
  };
  if (isNew || isAdmin()) open(db, ME.name);
  else adminSession("Editar o eliminar productos requiere autorización del administrador.").then(s => open(s.db, s.name, s.done)).catch(() => {});
}

/* ---------- INVENTARIO ---------- */
let INVT = { tab: "stock", q: "", days: 7 };
RENDER.inventario = el => {
  el.innerHTML = `<div class="kpis" id="nK"></div><div class="tools"><div class="seg" id="nT"><button data-t="stock">Existencias</button><button data-t="low">Agotados / última pieza</button><button data-t="mov">Movimientos</button></div>
    <input type="search" id="nQ" placeholder="Buscar producto…" value="${esc(INVT.q)}"><button class="btn gold" id="nIn">${svg("plus")} Entrada de mercancía</button></div><div id="nB"></div>`;
  $("#nT").onclick = e => { const b = e.target.closest("button"); if (b) { INVT.tab = b.dataset.t; paint(); } };
  $("#nQ").oninput = e => { INVT.q = e.target.value; paint(); };
  $("#nIn").onclick = () => pickProduct("Entrada de mercancía", p => stockModal(p, 1));
  const rowsHTML = list => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Producto</th><th>Categoría</th><th class="num">Valor contado</th><th>Existencia</th></tr></thead><tbody>${list.slice(0, 150).map(p => `<tr data-id="${p.id}"><td>${thumb(p)}</td><td class="pname"><b>${esc(p.name)}</b><small>${esc(p.brand)}</small></td><td><span class="pill">${CATS[p.cat] || p.cat}</span></td><td class="num">${money(Math.max(0, p.stock || 0) * (p.cash || 0))}</td>
    <td><div class="stockctl"><button data-s="-1" title="Ajuste (quitar)">−</button><b>${p.stock || 0}</b><button data-s="1" title="Entrada de mercancía">+</button></div></td></tr>`).join("") || `<tr><td colspan="5"><div class="empty">Sin productos</div></td></tr>`}</tbody></table></div>`;
  const paint = async () => {
    $$("#nT button").forEach(b => b.classList.toggle("on", b.dataset.t === INVT.tab));
    const units = PRODUCTS.reduce((a, p) => a + Math.max(0, p.stock || 0), 0);
    $("#nK").innerHTML = `<div class="kpi dark"><small>Piezas en existencia</small><b>${units}</b><span>${PRODUCTS.length} productos</span></div>
      <div class="kpi gold"><small>Valor del inventario</small><b>${money(PRODUCTS.reduce((a, p) => a + Math.max(0, p.stock || 0) * (p.cash || 0), 0))}</b><span>A precio de contado</span></div>
      <div class="kpi bad"><small>Agotados</small><b>${PRODUCTS.filter(p => !(p.stock > 0)).length}</b></div>
      <div class="kpi warn"><small>Última pieza</small><b>${PRODUCTS.filter(p => p.stock === 1).length}</b></div>`;
    const q = norm(INVT.q), match = p => !q || q.split(/\s+/).every(w => norm(p.name + " " + p.brand).includes(w));
    if (INVT.tab === "stock") $("#nB").innerHTML = rowsHTML(PRODUCTS.filter(p => p.stock > 0 && match(p)).sort((a, b) => b.stock - a.stock));
    if (INVT.tab === "low") $("#nB").innerHTML = rowsHTML(PRODUCTS.filter(p => (p.stock || 0) <= 1 && match(p)).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)));
    if (INVT.tab === "mov") {
      $("#nB").innerHTML = `<div class="empty">Cargando…</div>`;
      try {
        const rows = (await rangeDocs("stockLog", now() - 30 * 864e5, now() + 864e5)).filter(m => !q || norm(m.name).includes(q));
        $("#nB").innerHTML = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th class="num">Cantidad</th><th>Referencia / nota</th><th>Usuario</th></tr></thead><tbody>${rows.map(m => `<tr><td>${ftime(m.date)}</td><td><b>${esc(m.name)}</b></td>
          <td><span class="pill ${m.type === "entrada" ? "ok" : m.type === "venta" ? "blue" : m.type === "ajuste" ? "bad" : "warn"}">${esc(m.type)}</span></td><td class="num"><b class="${m.qty > 0 ? "ok-t" : "bad-t"}">${m.qty > 0 ? "+" : ""}${m.qty}</b></td><td class="small">${esc(m.ref || m.note || "")}</td><td>${esc(m.user)}</td></tr>`).join("") || `<tr><td colspan="6"><div class="empty">Sin movimientos en los últimos 30 días</div></td></tr>`}</tbody></table></div>`;
      } catch (err) { $("#nB").innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; }
    }
  };
  $("#nB").onclick = e => { const tr = e.target.closest("tr[data-id]"); const s = e.target.closest("[data-s]"); if (tr && s) stockModal(P(tr.dataset.id), +s.dataset.s); };
  PAINT = () => { if (INVT.tab !== "mov") paint(); };
  paint();
};
function pickProduct(title, cb) {
  modal(`<h3>${esc(title)}</h3><input type="search" id="ppQ" placeholder="Buscar producto…" autocomplete="off"><div class="list" id="ppL" style="margin-top:10px;max-height:380px;overflow:auto"></div><div class="modal-foot"><button class="btn" data-x>Cerrar</button></div>`);
  const paint = () => { const q = norm($("#ppQ").value);
    $("#ppL").innerHTML = PRODUCTS.filter(p => !q || q.split(/\s+/).every(w => norm(p.name + " " + p.brand).includes(w))).slice(0, 30)
      .map(p => `<div class="item" data-pp="${p.id}" style="cursor:pointer">${thumb(p)}<div class="grow pname"><b>${esc(p.name)}</b><small>${esc(p.brand)}</small></div><span class="pill">${p.stock || 0} pzs</span></div>`).join("") || `<div class="empty">Sin resultados</div>`; };
  $("#ppQ").oninput = paint; paint();
  $("#ppL").onclick = e => { const r = e.target.closest("[data-pp]"); if (r) { closeModal(); cb(P(r.dataset.pp)); } };
}
function stockModal(p, dir) {
  const inn = dir > 0;
  const run = (dbx, who) => {
    modal(`<h3>${inn ? "Entrada de mercancía" : "Ajuste de inventario"}</h3><p class="mut" style="margin-bottom:12px">${esc(p.brand)} · ${esc(p.name)} — existencia actual <b>${p.stock || 0}</b></p>
      <form id="sF"><div class="grid2"><label>Cantidad ${inn ? "que entra" : "a quitar"}<input id="sQ" type="number" min="1" value="1" required></label><label>Nota<input id="sN" placeholder="${inn ? "Proveedor, factura…" : "Motivo"}"></label></div>
      <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold">Guardar</button></div></form>`);
    $("#sF").onsubmit = async e => {
      e.preventDefault(); const q = Math.max(1, num($("#sQ").value)) * (inn ? 1 : -1);
      try {
        const b = writeBatch(dbx);
        b.update(doc(dbx, "products", p.id), { stock: increment(q), updatedAt: now() });
        b.set(doc(collection(dbx, "stockLog")), { productId: p.id, name: p.name, qty: q, type: inn ? "entrada" : "ajuste", note: $("#sN").value, user: who, date: now() });
        b.set(doc(dbx, "meta", "catalog"), { v: now() }, { merge: true });
        await b.commit(); closeModal(); toast(inn ? "Entrada registrada ✔" : "Ajuste registrado ✔");
      } catch (err) { toast(errMsg(err), true); }
    };
  };
  if (inn || isAdmin()) run(db, ME.name);
  else adminSession("Quitar piezas del inventario requiere autorización del administrador.").then(s => { run(s.db, s.name); modalClose = s.done; }).catch(() => {});
}

/* ---------- ABONOS ---------- */
let ADEUDO_FILTER = "cobrar";
function debtCard(d) {
  const st = dueState(d), pct = d.total ? Math.min(100, (d.paid / d.total) * 100) : 0;
  const pill = { late: `<span class="pill bad">Vencido hace ${-dayDiff(d.nextDue)} día(s)</span>`, today: `<span class="pill warn">⏰ Cobrar hoy</span>`, soon: `<span class="pill blue">En ${dayDiff(d.nextDue)} día(s)</span>`, ok: `<span class="pill">${fdate(d.nextDue)}</span>`, done: `<span class="pill ${d.status === "liquidado" ? "ok" : "dark"}">${d.status}</span>` }[st];
  return `<div class="debt ${st}"><div class="debt-h"><div class="sp"><b>${esc(d.clientName)}</b><div class="small mut">${esc(d.phone || "sin WhatsApp")}${d.folio ? " · " + esc(d.folio) : ""}</div></div>${pill}</div>
    <div class="small" style="color:var(--ink2)">${esc(d.concept)}</div><div class="prog"><i style="width:${pct}%"></i></div>
    <dl><div><dt>Total</dt><dd>${money(d.total)}</dd></div><div><dt>Pagado</dt><dd class="ok-t">${money(d.paid)}</dd></div><div><dt>Saldo</dt><dd class="bad-t">${money(d.balance)}</dd></div>
      <div><dt>Pago</dt><dd>${money(d.installment)}</dd></div><div><dt>Frecuencia</dt><dd style="text-transform:capitalize">${esc(d.frequency)}</dd></div><div><dt>Próximo</dt><dd>${d.status === "activo" ? fdate(d.nextDue) : "—"}</dd></div></dl>
    ${d.lastReminder ? `<div class="small mut">Último recordatorio: ${ftime(d.lastReminder)}</div>` : ""}
    <div class="acts">${d.status === "activo" ? `<button class="btn sm wa" data-remind="${d.id}">${svg("wa")} Recordar pago a ${esc((d.clientName || "").split(" ")[0])}</button><button class="btn sm gold" data-abono="${d.id}">${svg("cash")} Abono</button>` : ""}
      <button class="btn sm" data-hist="${d.id}">Historial</button>${isAdmin() && d.status === "activo" ? `<button class="btn sm" data-dedit="${d.id}">${svg("edit")}</button>` : ""}</div></div>`;
}
RENDER.abonos = el => {
  el.innerHTML = `<div class="kpis" id="dK"></div><div class="tools"><div class="seg" id="dF">
      <button data-f="cobrar">⏰ Por cobrar</button><button data-f="activos">Activos</button><button data-f="liquidados">Liquidados</button><button data-f="todos">Todos</button></div>
      <input type="search" id="dQ" placeholder="Buscar cliente, producto o WhatsApp…"><button class="btn gold" id="dNew">${svg("plus")} Nueva cuenta</button></div>
    <div class="debts" id="dList"></div>`;
  $("#dF").onclick = e => { const b = e.target.closest("button"); if (b) { ADEUDO_FILTER = b.dataset.f; paint(); } };
  $("#dQ").oninput = () => paint();
  $("#dNew").onclick = () => debtModal(null);
  const paint = () => {
    $$("#dF button").forEach(b => b.classList.toggle("on", b.dataset.f === ADEUDO_FILTER));
    const act = activeDebts(), q = norm($("#dQ").value);
    $("#dK").innerHTML = `<div class="kpi dark"><small>Total por cobrar</small><b>${money(act.reduce((a, d) => a + d.balance, 0))}</b><span>${act.length} cuenta(s) activas</span></div>
      <div class="kpi bad"><small>Vencidos</small><b>${act.filter(d => dueState(d) === "late").length}</b><span>${money(act.filter(d => dueState(d) === "late").reduce((a, d) => a + Math.min(d.installment, d.balance), 0))} en pagos</span></div>
      <div class="kpi warn"><small>Cobrar hoy</small><b>${act.filter(d => dueState(d) === "today").length}</b></div>
      <div class="kpi"><small>Próximos 3 días</small><b>${act.filter(d => dueState(d) === "soon").length}</b></div>
      <div class="kpi ok"><small>Abonos de hoy</small><b>${money(ABONOS_TODAY.filter(x => x.status !== "cancelado").reduce((a, x) => a + x.amount, 0))}</b><span>${ABONOS_TODAY.filter(x => x.status !== "cancelado").length} abono(s)</span></div>`;
    let list = DEBTS.slice();
    if (ADEUDO_FILTER === "cobrar") list = act.filter(d => ["late", "today", "soon"].includes(dueState(d)));
    if (ADEUDO_FILTER === "activos") list = act;
    if (ADEUDO_FILTER === "liquidados") list = DEBTS.filter(d => d.status === "liquidado");
    if (q) list = list.filter(d => norm(d.clientName + " " + d.phone + " " + d.concept).includes(q));
    list.sort((a, b) => (a.status === "activo" ? 0 : 1) - (b.status === "activo" ? 0 : 1) || (a.nextDue || "").localeCompare(b.nextDue || ""));
    $("#dList").innerHTML = list.map(debtCard).join("") || `<div class="empty">${ADEUDO_FILTER === "cobrar" ? "No hay cobros pendientes 🎉" : "Nada por aquí"}</div>`;
  };
  PAINT = paint; paint();
};
document.addEventListener("click", e => {
  const h = e.target.closest("[data-hist]"); if (h) return debtHistory(h.dataset.hist);
  const d = e.target.closest("[data-dedit]"); if (d) return debtModal(DEBTS.find(x => x.id === d.dataset.dedit));
});
function abonoModal(id) {
  const d = DEBTS.find(x => x.id === id); if (!d) return;
  modal(`<h3>Registrar abono</h3><p class="mut" style="margin-bottom:12px"><b style="color:var(--ink)">${esc(d.clientName)}</b> · ${esc(d.concept)}<br>Saldo actual <b class="bad-t">${money(d.balance)}</b> · pago ${d.frequency} de ${money(d.installment)}</p>
    <form id="abF"><div class="grid2"><label>Monto recibido<input id="abM" inputmode="decimal" value="${Math.min(d.installment || d.balance, d.balance)}" required></label>
      <label>Forma de pago<select id="abMet"><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></label></div>
      <label>Siguiente fecha de pago<input type="date" id="abN" value="${addPeriod(d.nextDue || today(), d.frequency)}"></label>
      <label class="row" style="display:flex"><input type="checkbox" id="abWa" ${d.phone ? "checked" : ""}> Enviar comprobante por WhatsApp</label>
      <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold" id="abOk">Registrar abono</button></div></form>`);
  $("#abF").onsubmit = async e => {
    e.preventDefault();
    const amt = round2(num($("#abM").value)); if (amt <= 0) return toast("Monto inválido", true);
    if (amt > round2(d.balance) + 0.009) return toast(`El abono no puede ser mayor al saldo (${money(d.balance)})`, true);
    const paid = round2((d.paid || 0) + amt), balance = round2(Math.max(0, d.total - paid)), done = balance <= 0.009;
    $("#abOk").disabled = true;
    try {
      const b = writeBatch(db);
      b.set(doc(collection(db, "abonos")), { debtId: d.id, clientId: d.clientId, clientName: d.clientName, amount: amt, method: $("#abMet").value, date: now(), user: ME.name, balanceAfter: balance, status: "ok" });
      b.update(doc(db, "debts", d.id), { paid, balance, nextDue: done ? d.nextDue : $("#abN").value, status: done ? "liquidado" : "activo", lastPayment: now() });
      await b.commit();
      if ($("#abWa").checked && d.phone) wa(d.phone, `Hola ${d.clientName} 👋 Recibimos tu abono de *${money(amt)}* en SAJA Perfumes. ✅\n${done ? "🎉 ¡Tu cuenta quedó liquidada! Gracias por tu confianza." : `Saldo restante: ${money(balance)}\nPróximo pago: ${fdate($("#abN").value)}`}`);
      closeModal(); toast(done ? "¡Cuenta liquidada! 🎉" : "Abono registrado ✔");
    } catch (err) { toast(errMsg(err), true); $("#abOk").disabled = false; }
  };
}
async function debtHistory(id) {
  const d = DEBTS.find(x => x.id === id); if (!d) return;
  modal(`<h3>Historial · ${esc(d.clientName)}</h3><div class="list" id="hL"><div class="empty">Cargando…</div></div><div class="modal-foot">${isAdmin() && d.status === "activo" ? `<button class="btn red" id="hCancel">Cancelar cuenta</button><span class="sp"></span>` : ""}<button class="btn gold" data-x>Cerrar</button></div>`);
  try {
    const s = await getDocs(query(collection(db, "abonos"), where("debtId", "==", id)));
    const rows = s.docs.map(x => x.data()).sort((a, b) => a.date - b.date);
    $("#hL").innerHTML = `<div class="item"><div class="grow"><b>Compra ${esc(d.folio || "")}</b><div class="small mut">${ftime(d.createdAt)} · ${esc(d.concept)}</div></div><b>${money(d.total)}</b></div>
      ${d.downPayment ? `<div class="item"><div class="grow"><b>Enganche</b></div><b class="ok-t">-${money(d.downPayment)}</b></div>` : ""}` +
      rows.map(a => `<div class="item"><div class="grow"><b>Abono</b><div class="small mut">${ftime(a.date)} · ${METHODS[a.method] || a.method} · ${esc(a.user)}</div></div><b class="ok-t">-${money(a.amount)}</b></div>`).join("") +
      `<div class="item"><div class="grow"><b>Saldo</b></div><b class="bad-t">${money(d.balance)}</b></div>`;
  } catch (err) { $("#hL").innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; }
  const c = $("#hCancel"); if (c) c.onclick = async () => {
    if (!(await confirmBox("Cancelar cuenta", "La cuenta dejará de aparecer en cobros. ¿Continuar?", "Cancelar cuenta", true))) return;
    try { await updateDoc(doc(db, "debts", id), { status: "cancelado", cancelledBy: ME.name, cancelledAt: now() }); toast("Cuenta cancelada"); } catch (err) { toast(errMsg(err), true); }
  };
}
function debtModal(d) {
  const isNew = !d;
  const x = d || { clientName: "", phone: "", concept: "", total: 0, downPayment: 0, installment: 0, frequency: "quincenal", nextDue: addPeriod(today(), "quincenal") };
  modal(`<h3>${isNew ? "Nueva cuenta en abonos" : "Editar cuenta"}</h3><form id="dFm">
    ${isNew ? `<div class="suggest"><label>Cliente (busca o escribe uno nuevo)<input id="dCn" autocomplete="off" required></label><div class="suggest-list" id="dSug" hidden></div></div>
      <label>WhatsApp<input id="dCp" inputmode="tel" placeholder="10 dígitos"></label><div class="small" id="dCinfo"><span class="pill blue">Cliente nuevo</span></div>
      <div class="suggest"><label>Producto(s) que se llevó<input id="dCon" autocomplete="off" required placeholder="Busca en inventario o escribe"></label><div class="suggest-list" id="dPSug" hidden></div></div>`
    : `<p class="mut"><b style="color:var(--ink)">${esc(x.clientName)}</b> · ${esc(x.concept)}</p>`}
    <div class="grid3"><label>Total${isNew ? "" : " (monto original)"}<input id="dTot" inputmode="decimal" value="${x.total}" ${isNew ? "" : "readonly"}></label>
      ${isNew ? `<label>Enganche / ya pagado<input id="dDown" inputmode="decimal" value="0"></label>` : `<label>Saldo<input readonly value="${x.balance}"></label>`}
      <label>Monto por pago<input id="dInst" inputmode="decimal" value="${x.installment || ""}" required></label></div>
    <div class="grid2"><label>Frecuencia<select id="dFreq">${Object.keys(FREQ).map(f => `<option ${x.frequency === f ? "selected" : ""}>${f}</option>`).join("")}</select></label>
      <label>Próxima fecha de pago<input type="date" id="dNext" value="${x.nextDue}" required></label></div>
    ${!isNew ? `<label>WhatsApp<input id="dPh" value="${esc(x.phone || "")}"></label>` : ""}
    <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold" id="dOk">Guardar</button></div></form>`);
  let cl = null, prodId = null;
  if (isNew) {
    $("#dCn").oninput = e => {
      cl = null; $("#dCinfo").innerHTML = '<span class="pill blue">Cliente nuevo</span>'; $("#dCp").readOnly = false;
      const q = norm(e.target.value), list = q.length < 2 ? [] : CLIENTS.filter(c => norm(c.name + " " + c.phone).includes(q)).slice(0, 8);
      $("#dSug").hidden = !list.length; $("#dSug").innerHTML = list.map(c => `<div data-c="${c.id}"><b>${esc(c.name)}</b> <span class="small mut">${esc(c.phone || "")}</span></div>`).join("");
    };
    $("#dSug").onclick = e => { const r = e.target.closest("[data-c]"); if (!r) return; cl = CLIENTS.find(c => c.id === r.dataset.c); $("#dCn").value = cl.name; $("#dCp").value = cl.phone || ""; $("#dCp").readOnly = true; $("#dSug").hidden = true; $("#dCinfo").innerHTML = '<span class="pill ok">Cliente registrado</span>'; };
    $("#dCon").oninput = e => {
      prodId = null; const q = norm(e.target.value), list = q.length < 2 ? [] : PRODUCTS.filter(p => q.split(/\s+/).every(w => norm(p.name + " " + p.brand).includes(w))).slice(0, 8);
      $("#dPSug").hidden = !list.length; $("#dPSug").innerHTML = list.map(p => `<div data-p="${p.id}"><b>${esc(p.name)}</b> <span class="small mut">${esc(p.brand)} · crédito ${money(p.credit)} · existencia ${p.stock || 0}</span></div>`).join("");
    };
    $("#dPSug").onclick = e => { const r = e.target.closest("[data-p]"); if (!r) return; const p = P(r.dataset.p); prodId = p.id; $("#dCon").value = `${p.name} (${p.brand})`; $("#dTot").value = p.credit || p.cash; $("#dPSug").hidden = true; };
  }
  $("#dFreq").onchange = e => { if (isNew) $("#dNext").value = addPeriod(today(), e.target.value); };
  $("#dFm").onsubmit = async e => {
    e.preventDefault(); $("#dOk").disabled = true;
    try {
      if (isNew) {
        const total = num($("#dTot").value), down = num($("#dDown").value);
        if (total <= down) throw new Error("El total debe ser mayor a lo ya pagado.");
        const name = $("#dCn").value.trim(), phone = $("#dCp").value.trim();
        const b = writeBatch(db); let clientId = cl && cl.id;
        if (!cl) { const r = doc(collection(db, "clients")); clientId = r.id; b.set(r, { name, phone, notes: "", createdAt: now(), createdBy: ME.name }); }
        const p = prodId && P(prodId);
        b.set(doc(collection(db, "debts")), { clientId, clientName: cl ? cl.name : name, phone: cl ? cl.phone || "" : phone, concept: $("#dCon").value.trim(),
          items: p ? [{ id: p.id, name: p.name, brand: p.brand, qty: 1, price: total, dec: 0 }] : [], total, downPayment: down, paid: down, balance: total - down,
          installment: num($("#dInst").value), frequency: $("#dFreq").value, nextDue: $("#dNext").value, status: "activo", folio: "", createdAt: now(), createdBy: ME.name, lastReminder: 0 });
        await b.commit();
      } else {
        await updateDoc(doc(db, "debts", d.id), { installment: num($("#dInst").value), frequency: $("#dFreq").value, nextDue: $("#dNext").value, phone: $("#dPh").value.trim() });
      }
      closeModal(); toast("Cuenta guardada ✔");
    } catch (err) { toast(errMsg(err), true); $("#dOk").disabled = false; }
  };
}

/* ---------- CLIENTES ---------- */
RENDER.clientes = el => {
  el.innerHTML = `<div class="tools"><input type="search" id="cQ" placeholder="Buscar por nombre o WhatsApp…"><button class="btn gold" id="cNew">${svg("plus")} Nuevo cliente</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Cliente</th><th>WhatsApp</th><th class="num">Debe</th><th>Cuentas</th><th></th></tr></thead><tbody id="cBody"></tbody></table></div>`;
  $("#cQ").oninput = () => paint(); $("#cNew").onclick = () => clientModal(null);
  const paint = () => {
    const q = norm($("#cQ").value);
    $("#cBody").innerHTML = CLIENTS.filter(c => !q || norm(c.name + " " + c.phone).includes(q)).map(c => {
      const ds = DEBTS.filter(d => d.clientId === c.id), act = ds.filter(d => d.status === "activo"), owe = act.reduce((a, d) => a + d.balance, 0);
      return `<tr data-id="${c.id}"><td class="pname"><b>${esc(c.name)}</b><small>${esc(c.notes || "")}</small></td><td>${esc(c.phone || "—")}</td>
        <td class="num ${owe ? "bad-t" : ""}"><b>${money(owe)}</b></td><td>${act.length ? `<span class="pill warn">${act.length} activa(s)</span>` : ""} ${ds.length - act.length ? `<span class="pill">${ds.length - act.length} cerrada(s)</span>` : ""}</td>
        <td class="right"><div class="row" style="justify-content:flex-end">${c.phone ? `<button class="btn xs wa" data-cwa>${svg("wa")}</button>` : ""}<button class="btn xs" data-cview>Ver</button><button class="btn xs" data-cedit>${svg("edit")}</button></div></td></tr>`;
    }).join("") || `<tr><td colspan="5"><div class="empty">Sin clientes registrados</div></td></tr>`;
  };
  $("#cBody").onclick = e => {
    const tr = e.target.closest("tr[data-id]"); if (!tr) return; const c = CLIENTS.find(x => x.id === tr.dataset.id);
    if (e.target.closest("[data-cwa]")) wa(c.phone, `Hola ${c.name} 👋, te saluda SAJA Perfumes.`);
    if (e.target.closest("[data-cedit]")) clientModal(c);
    if (e.target.closest("[data-cview]")) {
      const ds = DEBTS.filter(d => d.clientId === c.id);
      modal(`<h3>${esc(c.name)}</h3><p class="mut" style="margin-bottom:12px">${esc(c.phone || "")} ${c.notes ? "· " + esc(c.notes) : ""}</p><div class="debts">${ds.map(debtCard).join("") || '<div class="empty">Sin cuentas</div>'}</div><div class="modal-foot"><button class="btn gold" data-x>Cerrar</button></div>`, { wide: true });
    }
  };
  PAINT = paint; paint();
};
function clientModal(c, onSaved) {
  const isNew = !c; const x = c || { name: "", phone: "", notes: "" };
  modal(`<h3>${isNew ? "Nuevo cliente" : "Editar cliente"}</h3><form id="clF"><label>Nombre<input id="clN" value="${esc(x.name)}" required></label>
    <label>WhatsApp<input id="clP" value="${esc(x.phone)}" inputmode="tel" placeholder="10 dígitos"></label><label>Notas<textarea id="clO" rows="2">${esc(x.notes || "")}</textarea></label>
    <div class="modal-foot">${!isNew && isAdmin() ? `<button type="button" class="btn red" id="clDel">Eliminar</button><span class="sp"></span>` : ""}<button type="button" class="btn" data-x>Cancelar</button><button class="btn gold">Guardar</button></div></form>`);
  $("#clF").onsubmit = async e => {
    e.preventDefault(); const data = { name: $("#clN").value.trim(), phone: $("#clP").value.trim(), notes: $("#clO").value.trim() };
    if (isNew && data.phone && waNum(data.phone).length < 12) return toast("El WhatsApp debe tener 10 dígitos", true);
    try {
      if (isNew) { const r = doc(collection(db, "clients")); const full = Object.assign(data, { createdAt: now(), createdBy: ME.name }); await setDoc(r, full); onSaved && onSaved(Object.assign({ id: r.id }, full)); }
      else {
        const b = writeBatch(db); b.update(doc(db, "clients", c.id), data);
        DEBTS.filter(d => d.clientId === c.id).forEach(d => b.update(doc(db, "debts", d.id), { clientName: data.name, phone: data.phone }));
        await b.commit();
      }
      closeModal(); toast("Cliente guardado ✔");
    } catch (err) { toast(errMsg(err), true); }
  };
  const del = $("#clDel"); if (del) del.onclick = async () => {
    if (DEBTS.some(d => d.clientId === c.id && d.status === "activo")) return toast("No se puede eliminar: tiene cuentas activas", true);
    if (!(await confirmBox("Eliminar cliente", `¿Eliminar a <b>${esc(c.name)}</b>?`, "Eliminar", true))) return;
    try { await deleteDoc(doc(db, "clients", c.id)); toast("Cliente eliminado"); } catch (err) { toast(errMsg(err), true); }
  };
}

/* Flujo de dinero: misma fórmula para Reportes y Cajas */
function flows(sales, abonos, gastos) {
  const inc = { efectivo: 0, tarjeta: 0, transferencia: 0 }, out = { efectivo: 0, tarjeta: 0, transferencia: 0 };
  sales.filter(s => s.status !== "cancelada").forEach(s => { const m = s.method === "plazos" ? (s.downMethod || "efectivo") : s.method; inc[m] = (inc[m] || 0) + (s.paidNow || 0); });
  abonos.filter(x => x.status !== "cancelado").forEach(x => { const m = x.method || "efectivo"; inc[m] = (inc[m] || 0) + x.amount; });
  gastos.forEach(g => { const m = g.method || "efectivo"; out[m] = (out[m] || 0) + g.amount; });
  Object.keys(inc).forEach(k => inc[k] = round2(inc[k])); Object.keys(out).forEach(k => out[k] = round2(out[k]));
  return { inc, out, totIn: round2(Object.values(inc).reduce((x, y) => x + y, 0)), totOut: round2(Object.values(out).reduce((x, y) => x + y, 0)) };
}

/* ---------- REPORTES ---------- */
let REP = { range: "mes", from: "", to: "" }, REP_SALES = [];
RENDER.reportes = el => {
  if (!REP.from) { const d = new Date(); REP.from = dstr(new Date(d.getFullYear(), d.getMonth(), 1)); REP.to = today(); }
  el.innerHTML = `<div class="tools"><div class="seg" id="rS"><button data-r="hoy">Hoy</button><button data-r="semana">7 días</button><button data-r="mes">Este mes</button><button data-r="anio">Este año</button></div>
    <input type="date" id="rF" value="${REP.from}"><input type="date" id="rT" value="${REP.to}"><button class="btn gold" id="rGo">Consultar</button><button class="btn" id="rCsv">Exportar CSV</button></div>
    <div id="rOut"><div class="empty">Cargando…</div></div>`;
  const setR = r => {
    const d = new Date(); REP.range = r; REP.to = today();
    REP.from = r === "hoy" ? today() : r === "semana" ? dstr(new Date(d.getTime() - 6 * 864e5)) : r === "mes" ? dstr(new Date(d.getFullYear(), d.getMonth(), 1)) : dstr(new Date(d.getFullYear(), 0, 1));
    $("#rF").value = REP.from; $("#rT").value = REP.to; run();
  };
  $("#rS").onclick = e => { const b = e.target.closest("button"); if (b) setR(b.dataset.r); };
  $("#rGo").onclick = () => { REP.from = $("#rF").value || today(); REP.to = $("#rT").value || REP.from; if (REP.from > REP.to) [REP.from, REP.to] = [REP.to, REP.from]; $("#rF").value = REP.from; $("#rT").value = REP.to; REP.range = ""; run(); };
  let LAST = null;
  $("#rCsv").onclick = () => {
    if (!LAST) return;
    const q = v => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const rows = [["REPORTE SAJA PERFUMES", REP.from + " a " + REP.to], [],
      ["Fecha", "Ventas", "Num. ventas", "Cobrado", "Gastos", "Neto"], ...LAST.dayRows.map(d => [d.k, d.v, d.n, d.c, d.g, round2(d.c - d.g)]),
      ["TOTAL", LAST.total, LAST.S.length, LAST.cob, LAST.gas, round2(LAST.cob - LAST.gas)], [],
      ["Folio", "Fecha", "Metodo", "Cliente", "Productos", "Subtotal", "Descuento", "Total", "Cobrado en la venta", "Vendedor", "Estado"],
      ...LAST.sales.map(s => [s.folio, new Date(s.date).toLocaleString("es-MX"), METHODS[s.method], s.clientName || "", s.items.map(i => i.qty + "x " + i.name).join(" | "), s.subtotal, s.discount, s.total, s.status === "cancelada" ? 0 : s.paidNow, s.user, s.status]), [],
      ["Abonos"], ["Fecha", "Cliente", "Metodo", "Monto", "Estado", "Registro"], ...LAST.abonos.map(a => [new Date(a.date).toLocaleString("es-MX"), a.clientName, METHODS[a.method] || a.method, a.amount, a.status || "ok", a.user]), [],
      ["Gastos"], ["Fecha", "Concepto", "Categoria", "Metodo", "Monto", "Registro"], ...LAST.gastos.map(g => [new Date(g.date).toLocaleString("es-MX"), g.concept, g.category, METHODS[g.method] || g.method, g.amount, g.user])];
    const csv = "\ufeff" + rows.map(r => r.map(q).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "reporte_" + REP.from + "_" + REP.to + ".csv"; a.click();
  };
  async function run() {
    $$("#rS button").forEach(b => b.classList.toggle("on", b.dataset.r === REP.range));
    $("#rOut").innerHTML = `<div class="empty">Cargando…</div>`;
    const a = parseD(REP.from).getTime(), b = endOf(REP.to);
    try {
      const [sales, abonos, gastos] = await Promise.all([rangeDocs("sales", a, b), rangeDocs("abonos", a, b), rangeDocs("gastos", a, b)]);
      REP_SALES = seen(sales);
      const S = sales.filter(x => x.status !== "cancelada");
      const F = flows(sales, abonos, gastos);
      const total = round2(S.reduce((q, x) => q + x.total, 0)), cob = F.totIn, gas = F.totOut;
      const byM = {}; S.forEach(x => byM[x.method] = round2((byM[x.method] || 0) + x.total));
      const byU = {}; S.forEach(x => byU[x.user || "—"] = round2((byU[x.user || "—"] || 0) + x.total));
      const byG = {}; gastos.forEach(x => byG[x.category] = round2((byG[x.category] || 0) + x.amount));
      // productos: el descuento de cada venta se reparte proporcionalmente para que la suma cuadre con el total
      const prod = {}; S.forEach(x => { const k0 = x.subtotal ? x.total / x.subtotal : 1; x.items.forEach(i => { const k = i.name + (i.brand ? " · " + i.brand : ""); prod[k] = prod[k] || { q: 0, t: 0 }; prod[k].q += i.qty; prod[k].t += i.qty * i.price * k0; }); });
      // día por día (misma lógica que Cajas)
      const dayMap = {}; for (let d = parseD(REP.from); d.getTime() < b; d.setDate(d.getDate() + 1)) dayMap[dstr(d)] = { k: dstr(d), v: 0, n: 0, c: 0, g: 0 };
      const dk = t => dayMap[dstr(new Date(t))];
      S.forEach(x => { const d = dk(x.date); if (d) { d.v += x.total; d.n++; d.c += x.paidNow || 0; } });
      abonos.filter(x => x.status !== "cancelado").forEach(x => { const d = dk(x.date); if (d) d.c += x.amount; });
      gastos.forEach(x => { const d = dk(x.date); if (d) d.g += x.amount; });
      const dayRows = Object.values(dayMap).map(d => ({ ...d, v: round2(d.v), c: round2(d.c), g: round2(d.g) }));
      // gráfica: por día hasta 62 días; si el rango es mayor, por mes
      let bars = dayRows.map(d => ({ l: String(+d.k.slice(8)), t: d.k, v: d.v }));
      if (bars.length > 62) { const m = {}; dayRows.forEach(d => { const k = d.k.slice(0, 7); m[k] = (m[k] || 0) + d.v; }); bars = Object.entries(m).map(([k, v]) => ({ l: k.slice(5) + "/" + k.slice(2, 4), t: k, v })); }
      const mx = Math.max(1, ...bars.map(x => x.v));
      LAST = { total, cob, gas, S, sales, abonos, gastos, dayRows };
      const act = activeDebts();
      const lst = (o, f = k => k) => Object.entries(o).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<div class="item"><div class="grow"><b>${esc(f(k))}</b></div><b>${money(v)}</b></div>`).join("") || '<div class="empty">—</div>';
      const shown = dayRows.filter(d => d.n || d.c || d.g);
      $("#rOut").innerHTML = `<p class="small mut" style="margin-bottom:10px">Periodo: <b style="color:var(--ink)">${fdate(REP.from)} al ${fdate(REP.to)}</b> (${dayRows.length} día(s)) · incluye ventas, abonos y gastos registrados en esas fechas; las ventas canceladas no suman.</p>
        <div class="kpis" id="repKpis">
        <div class="kpi dark"><small>Ventas</small><b data-k="ventas">${money(total)}</b><span>${S.length} ventas · ticket prom. ${money(S.length ? total / S.length : 0)}</span></div>
        <div class="kpi ok"><small>Dinero cobrado</small><b data-k="cobrado">${money(cob)}</b><span>Contado + enganches + abonos</span></div>
        <div class="kpi bad"><small>Gastos</small><b data-k="gastos">${money(gas)}</b><span>${gastos.length} registro(s)</span></div>
        <div class="kpi gold"><small>Cobrado − gastos</small><b data-k="neto">${money(round2(cob - gas))}</b></div>
        <div class="kpi warn"><small>Cartera por cobrar (actual)</small><b>${money(act.reduce((q, d) => q + d.balance, 0))}</b><span>${act.length} cuentas · ${sales.length - S.length} venta(s) cancelada(s) en el periodo</span></div></div>
        <div class="card"><h3>Ventas por ${bars.length && bars[0].t.length === 7 ? "mes" : "día"}</h3><div class="bars">${bars.map(x => `<div title="${x.t}: ${money(x.v)}"><i style="height:${(x.v / mx) * 100}%"></i><span>${x.l}</span></div>`).join("")}</div></div>
        <div class="card"><h3>Cuadre de dinero por método <small>(misma fórmula que Cajas)</small></h3><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Método</th><th class="num">Entradas</th><th class="num">Salidas</th><th class="num">Neto</th></tr></thead><tbody>
          ${["efectivo", "tarjeta", "transferencia"].map(m => `<tr><td><b>${METHODS[m]}</b></td><td class="num ok-t">${money(F.inc[m])}</td><td class="num bad-t">${money(F.out[m])}</td><td class="num"><b>${money(F.inc[m] - F.out[m])}</b></td></tr>`).join("")}
          <tr><td><b>TOTAL</b></td><td class="num ok-t"><b>${money(cob)}</b></td><td class="num bad-t"><b>${money(gas)}</b></td><td class="num gold-t"><b>${money(round2(cob - gas))}</b></td></tr></tbody></table></div></div>
        <div class="card"><h3>Detalle por día <small>(solo días con movimiento)</small></h3><div class="tbl-wrap" style="border:0;max-height:420px;overflow:auto"><table class="tbl" id="repDays"><thead><tr><th>Fecha</th><th class="num">Ventas</th><th class="num">Núm.</th><th class="num">Cobrado</th><th class="num">Gastos</th><th class="num">Neto</th></tr></thead><tbody>
          ${shown.map(d => `<tr data-day="${d.k}"><td>${fdate(d.k)}</td><td class="num">${money(d.v)}</td><td class="num">${d.n}</td><td class="num ok-t">${money(d.c)}</td><td class="num bad-t">${money(d.g)}</td><td class="num"><b>${money(d.c - d.g)}</b></td></tr>`).join("") || '<tr><td colspan="6"><div class="empty">Sin movimientos</div></td></tr>'}
          <tr><td><b>TOTAL</b></td><td class="num"><b>${money(total)}</b></td><td class="num"><b>${S.length}</b></td><td class="num ok-t"><b>${money(cob)}</b></td><td class="num bad-t"><b>${money(gas)}</b></td><td class="num gold-t"><b>${money(round2(cob - gas))}</b></td></tr></tbody></table></div></div>
        <div class="cols" style="margin-top:14px"><div class="card"><h3>Productos más vendidos <small>(con descuento aplicado)</small></h3><div class="list">${Object.entries(prod).sort((x, y) => y[1].q - x[1].q).slice(0, 15).map(([k, v]) => `<div class="item"><div class="grow"><b>${esc(k)}</b></div><span class="pill">${v.q} pzs</span><b>${money(v.t)}</b></div>`).join("") || '<div class="empty">Sin ventas</div>'}</div></div>
        <div><div class="card"><h3>Vendido por forma de pago</h3><div class="list">${lst(byM, k => METHODS[k] || k)}</div></div>
        <div class="card"><h3>Por vendedor</h3><div class="list">${lst(byU)}</div></div>
        <div class="card"><h3>Gastos por categoría</h3><div class="list">${lst(byG)}</div></div></div></div>`;
    } catch (err) { $("#rOut").innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; }
  }
  PAINT = null; run();
};

/* ---------- GASTOS ---------- */
let GAS = { from: "", to: "" };
RENDER.gastos = el => {
  if (!GAS.from) { const d = new Date(); GAS.from = dstr(new Date(d.getFullYear(), d.getMonth(), 1)); GAS.to = today(); }
  el.innerHTML = `<div class="tools"><input type="date" id="gF" value="${GAS.from}"><input type="date" id="gT" value="${GAS.to}"><button class="btn" id="gGo">Consultar</button><span class="sp"></span><button class="btn gold" id="gNew">${svg("plus")} Registrar gasto</button></div>
    <div class="kpis" id="gK"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Método</th><th>Registró</th><th class="num">Monto</th><th></th></tr></thead><tbody id="gB"></tbody></table></div>`;
  let rows = [];
  const run = async () => {
    GAS.from = $("#gF").value || today(); GAS.to = $("#gT").value || GAS.from; if (GAS.from > GAS.to) [GAS.from, GAS.to] = [GAS.to, GAS.from];
    try { rows = await rangeDocs("gastos", parseD(GAS.from).getTime(), endOf(GAS.to)); paint(); }
    catch (err) { $("#gB").innerHTML = `<tr><td colspan="7"><div class="empty">${esc(errMsg(err))}</div></td></tr>`; }
  };
  const paint = () => {
    const by = {}; rows.forEach(g => by[g.category] = (by[g.category] || 0) + g.amount);
    $("#gK").innerHTML = `<div class="kpi bad"><small>Total de gastos</small><b>${money(rows.reduce((a, g) => a + g.amount, 0))}</b><span>${rows.length} registro(s)</span></div>` +
      Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => `<div class="kpi"><small>${esc(k)}</small><b>${money(v)}</b></div>`).join("");
    $("#gB").innerHTML = rows.map(g => `<tr data-id="${g.id}"><td>${ftime(g.date)}</td><td><b>${esc(g.concept)}</b>${g.note ? `<div class="small mut">${esc(g.note)}</div>` : ""}</td><td><span class="pill">${esc(g.category)}</span></td><td>${METHODS[g.method] || g.method}</td><td>${esc(g.user)}</td>
      <td class="num bad-t"><b>-${money(g.amount)}</b></td><td><button class="icon" data-gdel title="Eliminar">${svg("trash")}</button></td></tr>`).join("") || `<tr><td colspan="7"><div class="empty">Sin gastos en el periodo</div></td></tr>`;
  };
  $("#gGo").onclick = run;
  $("#gNew").onclick = () => gastoModal(run);
  $("#gB").onclick = async e => {
    const tr = e.target.closest("tr[data-id]"); if (!tr || !e.target.closest("[data-gdel]")) return;
    if (!(await confirmBox("Eliminar gasto", "¿Eliminar este gasto?", "Eliminar", true))) return;
    try { await deleteDoc(doc(db, "gastos", tr.dataset.id)); run(); toast("Gasto eliminado"); } catch (err) { toast(errMsg(err), true); }
  };
  PAINT = null; run();
};
function gastoModal(after, day) {
  modal(`<h3>Registrar gasto / salida de dinero</h3><form id="gsF"><label>Concepto<input id="gsC" required placeholder="Ej. Pago de luz, compra de mercancía…"></label>
    <div class="grid3"><label>Monto<div class="money-in"><span>$</span><input id="gsA" inputmode="decimal" required></div></label>
      <label>Categoría<select id="gsCat">${GASTO_CATS.map(c => `<option>${c}</option>`).join("")}</select></label>
      <label>Pagado con<select id="gsM"><option value="efectivo">Efectivo (sale de caja)</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option></select></label></div>
    <div class="grid2"><label>Fecha<input type="date" id="gsD" value="${day || today()}" max="${today()}"></label><label>Nota<input id="gsN"></label></div>
    <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold">Guardar gasto</button></div></form>`);
  $("#gsF").onsubmit = async e => {
    e.preventDefault(); const amount = num($("#gsA").value); if (amount <= 0) return toast("Monto inválido", true);
    const d = $("#gsD").value && $("#gsD").value <= today() ? $("#gsD").value : today(); const date = d === today() ? now() : parseD(d).getTime() + 12 * 36e5;
    try {
      await setDoc(doc(collection(db, "gastos")), { concept: $("#gsC").value.trim(), amount, category: $("#gsCat").value, method: $("#gsM").value, note: $("#gsN").value.trim(), date, user: ME.name });
      closeModal(); toast("Gasto registrado ✔"); after && after();
    } catch (err) { toast(errMsg(err), true); }
  };
}

/* ---------- CAJAS ---------- */
let CAJA_DATE = "";
RENDER.cajas = el => {
  if (!CAJA_DATE) CAJA_DATE = today();
  el.innerHTML = `<div class="tools"><span class="pill dark" style="height:34px;padding:0 14px">Caja 1</span><input type="date" id="kD" value="${CAJA_DATE}"><span class="sp"></span>
    <button class="btn" id="kG">${svg("gastos")} Registrar salida / gasto</button><button class="btn gold" id="kP">${svg("print")} Imprimir corte</button></div>
    <div id="kOut"><div class="empty">Cargando…</div></div>`;
  let last = null;
  const run = async () => {
    CAJA_DATE = $("#kD").value || today();
    const a = parseD(CAJA_DATE).getTime(), b = endOf(CAJA_DATE);
    try {
      const [sales, abonos, gastos] = await Promise.all([rangeDocs("sales", a, b), rangeDocs("abonos", a, b), rangeDocs("gastos", a, b).catch(() => [])]);
      seen(sales);
      const S = sales.filter(s => s.status !== "cancelada"), A = abonos.filter(x => x.status !== "cancelado");
      const { inc, out, totIn, totOut } = flows(sales, abonos, gastos);
      last = { inc, out, totIn, totOut, S, A, gastos, cash: round2(inc.efectivo - out.efectivo) };
      $("#kOut").innerHTML = `<div class="kpis">
        <div class="kpi dark"><small>Efectivo esperado en caja</small><b>${money(last.cash)}</b><span>Entradas en efectivo − salidas en efectivo</span></div>
        <div class="kpi ok"><small>Total de entradas</small><b>${money(totIn)}</b><span>${S.length} ventas · ${A.length} abonos</span></div>
        <div class="kpi bad"><small>Salidas / gastos</small><b>${money(totOut)}</b><span>${gastos.length} registro(s)</span></div>
        <div class="kpi warn"><small>Vendido en abonos</small><b>${money(S.filter(s => s.method === "plazos").reduce((x, s) => x + s.total, 0))}</b><span>Total de ventas a crédito</span></div></div>
        <div class="card"><h3>Resumen por método</h3><div class="tbl-wrap" style="border:0"><table class="tbl"><thead><tr><th>Método</th><th class="num">Entradas</th><th class="num">Salidas</th><th class="num">Neto</th></tr></thead><tbody>
          ${["efectivo", "tarjeta", "transferencia"].map(m => `<tr><td><b>${METHODS[m]}</b></td><td class="num ok-t">${money(inc[m])}</td><td class="num bad-t">${money(out[m])}</td><td class="num"><b>${money(inc[m] - out[m])}</b></td></tr>`).join("")}
          <tr><td><b>TOTAL</b></td><td class="num ok-t"><b>${money(totIn)}</b></td><td class="num bad-t"><b>${money(totOut)}</b></td><td class="num gold-t"><b>${money(totIn - totOut)}</b></td></tr></tbody></table></div></div>
        <div class="cols" style="margin-top:14px"><div class="card"><h3>Ventas</h3><div class="list">${sales.map(saleRow).join("") || '<div class="empty">Sin ventas</div>'}</div></div>
        <div><div class="card"><h3>Abonos</h3><div class="list">${A.map(x => `<div class="item"><div class="grow"><b>${esc(x.clientName)} · ${money(x.amount)}</b><div class="small mut">${hhmm(x.date)} · ${METHODS[x.method] || x.method} · ${esc(x.user)}</div></div></div>`).join("") || '<div class="empty">Sin abonos</div>'}</div></div>
        <div class="card"><h3>Salidas / gastos</h3><div class="list">${gastos.map(g => `<div class="item"><div class="grow"><b>${esc(g.concept)}</b><div class="small mut">${hhmm(g.date)} · ${METHODS[g.method] || g.method} · ${esc(g.user)}</div></div><b class="bad-t">-${money(g.amount)}</b></div>`).join("") || '<div class="empty">Sin salidas</div>'}</div></div></div></div>`;
    } catch (err) { $("#kOut").innerHTML = `<div class="empty">${esc(errMsg(err))}</div>`; }
  };
  $("#kD").onchange = run;
  $("#kG").onclick = () => gastoModal(run, CAJA_DATE);
  $("#kP").onclick = () => {
    if (!last) return;
    $("#printArea").innerHTML = `<h4>CORTE DE CAJA · CAJA 1</h4><p style="text-align:center">${fdate(CAJA_DATE)}<br>Impreso: ${new Date().toLocaleString("es-MX")}<br>${esc(ME.name)}</p><hr>
      <table><tr><td><b>Entradas</b></td><td></td></tr>${["efectivo", "tarjeta", "transferencia"].map(m => `<tr><td>${METHODS[m]}</td><td style="text-align:right">${money(last.inc[m])}</td></tr>`).join("")}
      <tr><td><b>Salidas</b></td><td style="text-align:right">-${money(last.totOut)}</td></tr><tr><td><b>EFECTIVO EN CAJA</b></td><td style="text-align:right"><b>${money(last.cash)}</b></td></tr></table><hr>
      <p>Ventas: ${last.S.length} · Abonos: ${last.A.length} · Gastos: ${last.gastos.length}</p><br><p>Firma: ____________________</p>`;
    window.print();
  };
  PAINT = () => { if (CAJA_DATE === today()) run(); };
  run();
};

/* ---------- USUARIOS ---------- */
RENDER.usuarios = el => {
  el.innerHTML = `<div class="card"><div class="row" style="margin-bottom:12px"><h3 class="sp" style="margin:0">Usuarios del panel</h3><button class="btn gold" id="uNew">${svg("plus")} Nuevo usuario</button></div>
    <p class="small mut" style="margin-bottom:12px"><b style="color:var(--gold1)">Administrador:</b> acceso total. <b style="color:var(--gold1)">Empleado:</b> Punto de venta, Abonos, Productos, Inventario y Cajas; puede agregar pero no borrar, cancelar ni editar sin la contraseña de un administrador.</p>
    <div class="list" id="uL"></div></div>`;
  $("#uNew").onclick = userModal;
  const paint = () => {
    $("#uL").innerHTML = USERS.slice().sort((a, b) => (a.username || "").localeCompare(b.username || "")).map(u => `<div class="item" data-u="${u.id}"><div class="avatar">${esc((u.name || u.username || "?")[0].toUpperCase())}</div>
      <div class="grow"><b>${esc(u.name || u.username)}</b><div class="small mut">usuario: ${esc(u.username)}</div></div>
      <select data-role style="width:auto" ${u.id === ME.uid ? "disabled" : ""}><option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option><option value="empleado" ${u.role === "empleado" ? "selected" : ""}>Empleado</option></select>
      <span class="pill ${u.active === false ? "bad" : "ok"}">${u.active === false ? "Bloqueado" : "Activo"}</span>
      ${u.id !== ME.uid ? `<button class="btn xs" data-toggle>${u.active === false ? "Activar" : "Bloquear"}</button>` : '<span class="pill dark">Tú</span>'}</div>`).join("");
  };
  $("#uL").onchange = async e => { const it = e.target.closest("[data-u]"); if (e.target.dataset.role !== undefined) { try { await updateDoc(doc(db, "users", it.dataset.u), { role: e.target.value }); toast("Rol actualizado ✔"); } catch (err) { toast(errMsg(err), true); } } };
  $("#uL").onclick = async e => { const it = e.target.closest("[data-u]"); if (e.target.closest("[data-toggle]")) { const u = USERS.find(x => x.id === it.dataset.u); try { await updateDoc(doc(db, "users", u.id), { active: u.active === false }); toast("Usuario actualizado ✔"); } catch (err) { toast(errMsg(err), true); } } };
  PAINT = paint; paint();
};
function userModal() {
  modal(`<h3>Nuevo usuario</h3><form id="nuF"><label>Nombre<input id="nuN" required></label>
    <div class="grid2"><label>Usuario (para entrar)<input id="nuU" required pattern="[a-z0-9._\\-]{3,20}" autocapitalize="none" title="3–20 letras minúsculas, números, punto o guion"></label><label>Contraseña<input id="nuP" type="text" minlength="6" required></label></div>
    <label>Rol<select id="nuR"><option value="empleado">Empleado (caja e inventario)</option><option value="admin">Administrador (todo)</option></select></label>
    <div class="modal-foot"><button type="button" class="btn" data-x>Cancelar</button><button class="btn gold" id="nuOk">Crear usuario</button></div></form>`);
  $("#nuF").onsubmit = async e => {
    e.preventDefault(); $("#nuOk").disabled = true;
    const u = $("#nuU").value.trim().toLowerCase();
    const app2 = initializeApp(window.SAJA_FB, "new-" + now());
    try {
      const a2 = initializeAuth(app2, { persistence: inMemoryPersistence });
      const cred = await createUserWithEmailAndPassword(a2, emailOf(u), $("#nuP").value);
      await setDoc(doc(db, "users", cred.user.uid), { username: u, name: $("#nuN").value.trim(), role: $("#nuR").value, active: true, createdAt: now(), createdBy: ME.name });
      await signOut(a2); closeModal(); toast("Usuario creado ✔");
    } catch (err) { toast(errMsg(err), true); $("#nuOk").disabled = false; }
    finally { deleteApp(app2).catch(() => {}); }
  };
}

/* ---------- CONFIGURACIÓN ---------- */
let CFG_TAB = "sitio";
RENDER.config = el => {
  el.innerHTML = `<div class="row" style="margin-bottom:14px"><div class="seg" id="gTb"><button data-t="sitio">Contacto</button><button data-t="portada">Portada del catálogo</button><button data-t="cuenta">Mi cuenta</button><button data-t="respaldo">Respaldo</button></div></div><div id="gBd"></div>`;
  $("#gTb").onclick = e => { const b = e.target.closest("button"); if (b) { CFG_TAB = b.dataset.t; RENDER.config(el); } };
  $$("#gTb button").forEach(b => b.classList.toggle("on", b.dataset.t === CFG_TAB));
  const B = $("#gBd"); PAINT = null;
  if (CFG_TAB === "sitio") {
    B.innerHTML = `<div class="card" style="max-width:820px"><h3>Datos de contacto del catálogo</h3><form id="sF" style="display:grid;gap:12px">
      <div class="grid2"><label>WhatsApp (con código de país, solo números)<input id="sPh" value="${esc(SITE.phone)}" placeholder="528717557806"></label><label>Teléfono como se muestra<input id="sPl" value="${esc(SITE.phoneLabel)}"></label></div>
      <label>Instagram (URL)<input id="sIg" value="${esc(SITE.instagram)}"></label><label>Ubicación Google Maps (URL)<input id="sMap" value="${esc(SITE.maps)}"></label>
      <label>Texto de dirección / tienda<input id="sAd" value="${esc(SITE.address)}"></label>
      <div><button class="btn gold">Guardar cambios</button></div></form></div>`;
    $("#sF").onsubmit = async e => { e.preventDefault(); await saveSite({ phone: $("#sPh").value.replace(/\D/g, ""), phoneLabel: $("#sPl").value.trim(), instagram: $("#sIg").value.trim(), maps: $("#sMap").value.trim(), address: $("#sAd").value.trim() }); };
  }
  if (CFG_TAB === "portada") {
    const sl = JSON.parse(JSON.stringify(SITE.slides || [])); while (sl.length < 4) sl.push({ title: "", text: "", img: "", cta: "", link: "#catalogo" });
    B.innerHTML = `<p class="mut" style="margin-bottom:12px">Diapositivas de la portada del catálogo. Sin imagen se muestran los frascos 3D con tu logo. Deja el título vacío para ocultar una diapositiva.</p>` +
      sl.map((s, i) => `<div class="card" data-sl="${i}"><h3>Diapositiva ${i + 1}</h3><div class="imgbox"><div class="thumb" data-th>${s.img ? `<img src="${esc(s.img)}">` : "<span>3D</span>"}</div><div style="flex:1;display:grid;gap:10px">
        <div class="grid2"><label>Título<input data-k="title" value="${esc(s.title)}"></label><label>Texto<input data-k="text" value="${esc(s.text)}"></label></div>
        <div class="grid3"><label>Botón<input data-k="cta" value="${esc(s.cta)}"></label><label>Destino<select data-k="link">${[["#catalogo", "Catálogo"], ["#cat=hombre", "Para él"], ["#cat=mujer", "Para ella"], ["#cat=sets", "Sets"], ["#cat=ropa", "Ropa"], ["#cat=tenis", "Tenis"], ["#whatsapp", "WhatsApp"]].map(([v, l]) => `<option value="${v}" ${s.link === v ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Imagen (URL)<input data-k="img" value="${esc(s.img && !s.img.startsWith("data:") ? s.img : "")}" placeholder="https://…"></label></div>
        <div class="row"><label class="btn sm">Subir imagen<input type="file" accept="image/*" data-up hidden></label><button type="button" class="btn sm" data-noimg>Quitar imagen</button></div></div></div></div>`).join("") +
      `<div class="row" style="margin-top:14px"><button class="btn gold" id="slSave">Guardar portada</button></div>`;
    B.oninput = e => { const c = e.target.closest("[data-sl]"); if (!c || !e.target.dataset.k) return; const s = sl[c.dataset.sl]; s[e.target.dataset.k] = e.target.value; if (e.target.dataset.k === "img") $("[data-th]", c).innerHTML = s.img ? `<img src="${esc(s.img)}">` : "<span>3D</span>"; };
    B.onchange = async e => {
      const c = e.target.closest("[data-sl]"); if (!c) return; const s = sl[c.dataset.sl];
      if (e.target.dataset.k === "link") s.link = e.target.value;
      if (e.target.dataset.up !== undefined && e.target.files[0]) { s.img = await compressImage(e.target.files[0], 1400); $("[data-th]", c).innerHTML = `<img src="${s.img}">`; toast("Imagen lista, guarda la portada"); }
    };
    B.onclick = e => { const n = e.target.closest("[data-noimg]"); if (n) { const c = n.closest("[data-sl]"); sl[c.dataset.sl].img = ""; $("[data-k=img]", c).value = ""; $("[data-th]", c).innerHTML = "<span>3D</span>"; } };
    $("#slSave").onclick = () => saveSite({ slides: sl.filter(s => s.title || s.img) });
  }
  if (CFG_TAB === "cuenta") {
    B.innerHTML = `<div class="card" style="max-width:520px"><h3>Cambiar mi contraseña</h3><form id="pwF" style="display:grid;gap:12px"><label>Contraseña actual<input type="password" id="pw0" required></label>
      <label>Nueva contraseña<input type="password" id="pw1" minlength="6" required></label><label>Repetir nueva contraseña<input type="password" id="pw2" minlength="6" required></label><div><button class="btn gold">Cambiar contraseña</button></div></form></div>`;
    $("#pwF").onsubmit = async e => {
      e.preventDefault(); if ($("#pw1").value !== $("#pw2").value) return toast("Las contraseñas no coinciden", true);
      try { await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, $("#pw0").value)); await updatePassword(auth.currentUser, $("#pw1").value); e.target.reset(); toast("Contraseña actualizada ✔"); }
      catch (err) { toast(errMsg(err), true); }
    };
  }
  if (CFG_TAB === "respaldo") {
    B.innerHTML = `<div class="card" style="max-width:620px"><h3>Respaldo de información</h3><p class="mut" style="margin-bottom:14px">Descarga un archivo con productos, clientes, cuentas, abonos, ventas, gastos y cotizaciones.</p><button class="btn gold" id="bk">Descargar respaldo (.json)</button></div>`;
    $("#bk").onclick = async () => {
      toast("Preparando respaldo…"); const out = {};
      try { for (const c of ["products", "clients", "debts", "abonos", "sales", "gastos", "quotes", "stockLog", "config"]) out[c] = (await getDocs(collection(db, c))).docs.map(d => Object.assign({ _id: d.id }, d.data())); }
      catch (err) { return toast(errMsg(err), true); }
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: "application/json" })); a.download = `saja_respaldo_${today()}.json`; a.click();
    };
  }
};
async function saveSite(patch) {
  try { await setDoc(doc(db, "config", "site"), patch, { merge: true }); Object.assign(SITE, patch); await bump(); toast("Guardado ✔ — el catálogo ya muestra los cambios"); }
  catch (err) { toast(errMsg(err), true); }
}
