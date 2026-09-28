/* SAJA Perfumes · Catálogo público */
(function () {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  const money = n => "$" + Math.round(+n || 0).toLocaleString("es-MX");
  const norm = s => (s || "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esc = s => (s ?? "").toString().replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let CFG = Object.assign({}, window.SAJA_DEFAULTS);
  let PRODUCTS = (window.SAJA_SEED || []).slice();
  const state = { cat: "all", brand: "", q: "", sort: "az", favs: false, shown: 24 };
  let favs = new Set(LS.get("saja_favs", []));
  let bag = LS.get("saja_bag", []);

  const CATS = [
    { id: "hombre", label: "Para él", icon: '<path d="M9 3h6v3H9z"/><path d="M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z"/><path d="M10 13h4"/>' },
    { id: "mujer", label: "Para ella", icon: '<path d="M11 3h2v3h-2z"/><path d="m12 6 5 5-2 10H9L7 11z"/><circle cx="12" cy="14" r="2"/>' },
    { id: "sets", label: "Sets y regalos", icon: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-2-4-6-4-6-1.5S10 9 12 9c2 0 6 1 6-1.5S14 5 12 9"/>' },
    { id: "top", label: "Más buscados", icon: '<path d="M12 21c4 0 7-2.6 7-6.5 0-3.5-2.4-5.5-3.5-8.5-1 2-2 3-3.5 3.5C12 6 11 4 9 3c0 4-4 6-4 11.5C5 18.4 8 21 12 21Z"/><path d="M12 21c-1.7 0-3-1.2-3-3 0-2 1.6-3 3-5 1.4 2 3 3 3 5 0 1.8-1.3 3-3 3Z"/>' },
    { id: "ropa", label: "Ropa", icon: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.3 3-4 3S8 4.7 8 3Z"/>' },
    { id: "tenis", label: "Tenis", icon: '<path d="M3 15c0-3 1-7 2-8l3 1c.5 1.3 2 2 3.5 1.5L14 12c2 1 7 1 7 4v2H3z"/><path d="M3 18h18M9 10.5l1.2 1.5M11 9.6l1.3 1.6"/>' },
    { id: "accesorios", label: "Accesorios", icon: '<path d="M4 16c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M2 16h17c1.7 0 3 .5 3 1.5S20.7 19 19 19H4"/><path d="M12 8V6"/>' },
    { id: "stock", label: "Disponibles", icon: '<path d="M12 3 4 7v10l8 4 8-4V7z"/><path d="m4 7 8 4 8-4M12 11v10"/>' }
  ];
  const CAT_TITLES = { all: "Catálogo", hombre: "Perfumes para él", mujer: "Perfumes para ella", sets: "Sets y regalos", top: "Los más buscados", ropa: "Ropa", tenis: "Tenis", accesorios: "Accesorios", stock: "Disponibles hoy" };
  const CHIPS = [["all", "Todo"], ["hombre", "Para él"], ["mujer", "Para ella"], ["sets", "Sets"], ["top", "Más buscados"], ["stock", "Disponibles"], ["ropa", "Ropa"], ["tenis", "Tenis"], ["accesorios", "Accesorios"]];

  /* ---------- placeholder 3D bottle ---------- */
  function hash(s) { let h = 0; for (const c of s || "") h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
  function bottleSVG(p) {
    const h = hash(p.brand + p.name);
    const dark = p.cat === "hombre" ? h % 3 !== 0 : h % 4 === 0;
    const hue = p.cat === "mujer" ? [340, 20, 300, 35, 5][h % 5] : [30, 210, 0, 45, 190][h % 5];
    const sat = dark ? 12 : (p.cat === "mujer" ? 55 : 28);
    const c1 = dark ? `hsl(${hue} ${sat}% 18%)` : `hsl(${hue} ${sat}% 88%)`;
    const c2 = dark ? `hsl(${hue} ${sat}% 5%)` : `hsl(${hue} ${sat}% 70%)`;
    const txt = dark ? "#f3efe8" : "#1a1816";
    const shape = h % 3, id = "g" + h;
    const body = shape === 0 ? '<rect x="18" y="44" width="64" height="104" rx="8"/>'
      : shape === 1 ? '<path d="M28 44h44l12 18v76a10 10 0 0 1-10 10H26a10 10 0 0 1-10-10V62z"/>'
      : '<rect x="14" y="50" width="72" height="98" rx="22"/>';
    const brand = esc((p.brand || "SAJA").toUpperCase().slice(0, 16));
    const name = esc((p.name || "").split(" ").slice(0, 2).join(" ").toUpperCase().slice(0, 14));
    return `<svg class="bottle" viewBox="0 0 100 160" aria-hidden="true"><defs>
      <linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".35" stop-color="${c1}"/><stop offset=".7" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <linearGradient id="${id}c" x1="0" x2="1"><stop offset="0" stop-color="#050505"/><stop offset=".4" stop-color="#3c3c3c"/><stop offset="1" stop-color="#0a0a0a"/></linearGradient></defs>
      <rect x="40" y="30" width="20" height="16" fill="#1c1c1c"/><rect x="${shape === 2 ? 30 : 33}" y="8" width="${shape === 2 ? 40 : 34}" height="26" rx="4" fill="url(#${id}c)"/>
      <g fill="url(#${id})" stroke="${dark ? "#000" : "rgba(255,255,255,.9)"}" stroke-width="1">${body}</g>
      <rect x="${shape === 2 ? 22 : 24}" y="${shape === 2 ? 58 : 52}" width="6" height="84" rx="3" fill="#fff" opacity=".35"/>
      <text x="50" y="98" text-anchor="middle" font-family="Libre Caslon Text,Georgia,serif" font-size="${brand.length > 10 ? 6.5 : 8.5}" font-weight="700" fill="${txt}" letter-spacing=".5">${brand}</text>
      <text x="50" y="110" text-anchor="middle" font-family="Inter,sans-serif" font-size="5" fill="${txt}" opacity=".75" letter-spacing="1">${name}</text></svg>`;
  }
  const photo = p => p.img ? `<img src="${esc(p.img)}" alt="${esc(p.name)}" loading="lazy" onerror="this.outerHTML=window.__sajaBottle('${esc(p.id)}')">` : bottleSVG(p);
  window.__sajaBottle = id => bottleSVG(PRODUCTS.find(p => p.id === id) || {});

  /* ---------- links ---------- */
  const waURL = msg => `https://wa.me/${(CFG.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  const pageURL = () => location.origin + location.pathname;
  const productURL = p => pageURL() + "#p=" + encodeURIComponent(p.id);
  const kind = p => p.cat === "ropa" ? "esta prenda" : p.cat === "tenis" ? "estos tenis" : p.cat === "accesorios" ? "este accesorio" : "este perfume";
  function interestMsg(p) {
    return `Hola SAJA Perfumes 👋\nMe interesa ${kind(p)} llamado *${p.name}*${p.brand ? " de " + p.brand : ""}.\nPrecio de contado: ${money(p.cash)}${p.credit ? " · a crédito: " + money(p.credit) : ""}\n${productURL(p)}`;
  }

  function applyConfig() {
    const general = "Hola SAJA Perfumes 👋 Vi su catálogo y me gustaría más información.\n" + pageURL();
    ["navWa", "drawerWa", "footWa", "emptyWa"].forEach(id => { const a = $("#" + id); if (a) a.href = waURL(general); });
    ["lnkIg", "navIg", "drawerIg", "footIg"].forEach(id => { const a = $("#" + id); if (a) a.href = CFG.instagram; });
    ["lnkMap", "drawerMap", "footMap"].forEach(id => { const a = $("#" + id); if (a) a.href = CFG.maps; });
    $("#footPhone").textContent = CFG.phoneLabel || ("+" + CFG.phone);
    $("#footAddr").textContent = CFG.address || "";
    $("#year").textContent = new Date().getFullYear();
    renderHero();
  }

  /* ---------- hero ---------- */
  let heroIdx = 0, heroTimer;
  function renderHero() {
    const slides = (CFG.slides || []).filter(s => s && (s.title || s.img));
    $("#heroTrack").innerHTML = slides.map((s, i) => `
      <div class="slide">
        ${s.img ? `<div class="slide-bg" style="background-image:url('${esc(s.img)}')"></div>` : `
        <div class="stage">
          <div class="pedestal ped1"></div><div class="pedestal ped2"></div>
          <div class="bottle3d b1"><div class="cap"></div><div class="glass"><img src="logo.png" alt="" onerror="this.outerHTML='<div class=logo-mark>SAJA</div>'"></div></div>
          <div class="bottle3d b2 black"><div class="cap"></div><div class="glass"><img src="logo.png" alt="" onerror="this.outerHTML='<div class=logo-mark>SAJA</div>'"></div></div>
        </div>`}
        <div class="slide-text">
          <h1>${esc(s.title)}</h1>
          ${s.text ? `<p>${esc(s.text)}</p>` : ""}
          ${s.cta ? `<a class="btn dark" href="${esc(s.link || "#catalogo")}" data-slide-link="${esc(s.link || "#catalogo")}">${esc(s.cta).toUpperCase()} <svg class="spark" viewBox="0 0 24 24"><path d="M12 2c.6 5 2 7 10 10-8 3-9.4 5-10 10-.6-5-2-7-10-10 8-3 9.4-5 10-10Z"/></svg></a>` : ""}
        </div>
      </div>`).join("");
    $("#heroDots").innerHTML = slides.map((_, i) => `<button aria-label="Diapositiva ${i + 1}" data-i="${i}"></button>`).join("");
    heroIdx = 0; goHero(0);
  }
  function goHero(i) {
    const n = $$("#heroTrack .slide").length; if (!n) return;
    heroIdx = (i + n) % n;
    $("#heroTrack").style.transform = `translateX(-${heroIdx * 100}%)`;
    $$("#heroDots button").forEach((b, j) => b.classList.toggle("on", j === heroIdx));
    clearTimeout(heroTimer); heroTimer = setTimeout(() => goHero(heroIdx + 1), 6000);
  }
  $("#heroDots").addEventListener("click", e => { const b = e.target.closest("button"); if (b) goHero(+b.dataset.i); });
  (() => { let x0 = null; const t = $("#hero");
    t.addEventListener("touchstart", e => x0 = e.touches[0].clientX, { passive: true });
    t.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) goHero(heroIdx + (dx < 0 ? 1 : -1)); x0 = null; });
  })();
  $("#heroTrack").addEventListener("click", e => {
    const a = e.target.closest("[data-slide-link]"); if (!a) return;
    const l = a.dataset.slideLink;
    if (l === "#whatsapp") { e.preventDefault(); window.open(waURL("Hola SAJA Perfumes 👋 Me interesa información sobre sus planes a plazos.\n" + pageURL()), "_blank"); }
    else if (l.startsWith("#cat=")) { e.preventDefault(); setCat(l.slice(5)); }
  });

  /* ---------- categories / chips ---------- */
  function renderCats() {
    $("#cats").innerHTML = CATS.map(c => `<button class="cat${state.cat === c.id ? " on" : ""}" data-cat="${c.id}"><i><svg viewBox="0 0 24 24">${c.icon}</svg></i>${c.label}</button>`).join("");
    $("#chips").innerHTML = CHIPS.map(([id, l]) => `<button class="chip${state.cat === id && !state.favs ? " on" : ""}" data-cat="${id}">${l}</button>`).join("") +
      `<button class="chip${state.favs ? " on" : ""}" data-favs="1">♥ Favoritos</button>`;
    $("#drawerNav").innerHTML = `<h4>Categorías</h4>` + CATS.map(c => `<a data-cat="${c.id}"><svg viewBox="0 0 24 24">${c.icon}</svg>${c.label}</a>`).join("") +
      `<a data-cat="all"><svg viewBox="0 0 24 24"><circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/></svg>Ver todo el catálogo</a>
       <a data-favs="1"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>Mis favoritos</a>`;
  }
  function setCat(cat, scroll = true) {
    state.cat = cat; state.favs = false; state.shown = 24; closeAll();
    renderCats(); renderGrid();
    if (scroll) $("#catalogo").scrollIntoView({ behavior: "smooth" });
  }
  function showFavs() {
    state.favs = true; state.cat = "all"; state.shown = 60; closeAll();
    renderCats(); renderGrid(); $("#catalogo").scrollIntoView({ behavior: "smooth" });
    if (!favs.size) toast("Toca el ♥ de un producto para guardarlo aquí");
  }
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-cat]"); if (c) { e.preventDefault(); setCat(c.dataset.cat); return; }
    const f = e.target.closest("[data-favs]"); if (f) { e.preventDefault(); showFavs(); }
  });

  /* ---------- filtering ---------- */
  function visible() { return PRODUCTS.filter(p => p.active !== false); }
  function matches(p) {
    if (state.favs && !favs.has(p.id)) return false;
    const c = state.cat;
    if (c === "sets" && !(p.tags || []).includes("sets")) return false;
    if (c === "top" && !p.featured) return false;
    if (c === "stock" && !(p.stock > 0)) return false;
    if (["hombre", "mujer", "ropa", "tenis", "unisex", "accesorios"].includes(c) && p.cat !== c) return false;
    if (state.brand && p.brand !== state.brand) return false;
    if (state.q) { const t = norm(p.name + " " + p.brand + " " + (p.cat === "hombre" ? "hombre caballero el" : p.cat === "mujer" ? "mujer dama ella" : p.cat)); if (!norm(state.q).split(/\s+/).every(w => t.includes(w))) return false; }
    return true;
  }
  function sorted(list) {
    const s = state.sort;
    return list.sort((a, b) =>
      s === "lo" ? (a.cash || 9e9) - (b.cash || 9e9) :
      s === "hi" ? (b.cash || 0) - (a.cash || 0) :
      s === "stock" ? ((b.stock > 0) - (a.stock > 0)) || a.name.localeCompare(b.name) :
      (a.brand + a.name).localeCompare(b.brand + b.name));
  }

  function card(p) {
    const tag = p.stock > 0 ? (p.stock === 1 ? '<span class="tag">Última pieza</span>' : "") : '<span class="tag out">Sobre pedido</span>';
    const inBag = bag.includes(p.id);
    return `<article class="card" data-id="${esc(p.id)}">
      <div class="ph">${tag}<button class="fav${favs.has(p.id) ? " on" : ""}" data-fav aria-label="Favorito"><svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg></button>${photo(p)}</div>
      <div class="info"><div class="nm">${esc(p.name)}</div><div class="br">${esc(p.brand)}</div>
      <div class="pr">${p.cash ? money(p.cash) : "Consultar"}${p.credit ? `<small>${money(p.credit)} a crédito</small>` : ""}</div>
      <button class="add${inBag ? " in" : ""}" data-add aria-label="Agregar a mi lista"><svg viewBox="0 0 24 24"><path d="${inBag ? "m5 12 5 5 9-10" : "M12 5v14M5 12h14"}"/></svg></button></div></article>`;
  }

  function renderRail() {
    let list = visible().filter(p => p.featured);
    if (list.length < 4) list = visible().filter(p => p.stock > 0).slice(0, 12);
    $("#rail").innerHTML = list.slice(0, 16).map(card).join("");
  }
  function renderBrands() {
    const brands = [...new Set(visible().map(p => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    $("#brandSel").innerHTML = `<option value="">Todas las marcas (${brands.length})</option>` + brands.map(b => `<option${b === state.brand ? " selected" : ""}>${esc(b)}</option>`).join("");
  }
  function renderGrid() {
    const list = sorted(visible().filter(matches));
    $("#catTitle").textContent = state.favs ? "Mis favoritos" : state.q ? `Resultados para “${state.q}”` : (CAT_TITLES[state.cat] || "Catálogo");
    $("#resultCount").textContent = list.length + (list.length === 1 ? " producto" : " productos");
    $("#grid").innerHTML = list.slice(0, state.shown).map(card).join("");
    $("#empty").hidden = list.length > 0;
    if (!list.length && ["ropa", "tenis", "accesorios"].includes(state.cat)) $("#empty p").textContent = `Muy pronto más ${state.cat} en el catálogo. ¡Pregúntanos por lo que tenemos en tienda!`;
    else $("#empty p").textContent = "No encontramos productos con esos filtros.";
    $("#btnMore").hidden = list.length <= state.shown;
    $("#btnMore").textContent = `Ver más productos (${list.length - state.shown})`;
  }
  $("#btnMore").onclick = () => { state.shown += 24; renderGrid(); };
  $("#brandSel").onchange = e => { state.brand = e.target.value; state.shown = 24; renderGrid(); };
  $("#sortSel").onchange = e => { state.sort = e.target.value; renderGrid(); };

  /* ---------- search ---------- */
  let qT;
  $("#btnSearch").onclick = () => { $("#searchBar").classList.add("open"); $("#searchInput").focus(); };
  $("#searchClose").onclick = () => { $("#searchBar").classList.remove("open"); $("#searchInput").value = ""; state.q = ""; renderGrid(); };
  $("#searchInput").addEventListener("input", e => {
    clearTimeout(qT); qT = setTimeout(() => {
      state.q = e.target.value.trim(); state.shown = 24; state.favs = false;
      if (state.q) state.cat = "all";
      renderCats(); renderGrid();
      if (state.q) $("#catalogo").scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  });

  /* ---------- card interactions ---------- */
  function onCardClick(e) {
    const el = e.target.closest(".card"); if (!el) return;
    const id = el.dataset.id;
    if (e.target.closest("[data-fav]")) { toggleFav(id); return; }
    if (e.target.closest("[data-add]")) { toggleBag(id); return; }
    openProduct(id);
  }
  $("#grid").addEventListener("click", onCardClick);
  $("#rail").addEventListener("click", onCardClick);

  // 3D tilt
  if (matchMedia("(hover:hover) and (pointer:fine)").matches) {
    document.addEventListener("pointermove", e => {
      const c = e.target.closest && e.target.closest(".card");
      $$(".card.tilt").forEach(x => { if (x !== c) { x.classList.remove("tilt"); x.style.transform = ""; } });
      if (!c) return;
      const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.classList.add("tilt");
      c.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : (favs.add(id), toast("Guardado en favoritos ♥"));
    LS.set("saja_favs", [...favs]);
    $$(`.card[data-id="${CSS.escape(id)}"] .fav`).forEach(b => b.classList.toggle("on", favs.has(id)));
    if (state.favs) renderGrid();
    const pb = $("#sheetBody [data-pfav]"); if (pb) pb.textContent = favs.has(id) ? "♥ En favoritos" : "♡ Favorito";
  }
  function toggleBag(id) {
    const i = bag.indexOf(id);
    if (i >= 0) bag.splice(i, 1); else { bag.push(id); toast("Agregado a tu lista · envíala por WhatsApp"); }
    LS.set("saja_bag", bag); updateBag();
    $$(`.card[data-id="${CSS.escape(id)}"] .add`).forEach(b => { const on = bag.includes(id); b.classList.toggle("in", on); b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${on ? "m5 12 5 5 9-10" : "M12 5v14M5 12h14"}"/></svg>`; });
    const pb = $("#sheetBody [data-pbag]"); if (pb) pb.textContent = bag.includes(id) ? "✓ En mi lista" : "+ Mi lista";
  }
  function updateBag() { bag = bag.filter(id => PRODUCTS.some(p => p.id === id)); $("#bagCount").textContent = bag.length; }

  /* ---------- product sheet ---------- */
  function describe(p) {
    if (p.desc) return esc(p.desc);
    if (p.cat === "ropa") return "Prenda disponible en tienda. Pregúntanos por tallas y colores disponibles.";
    if (p.cat === "tenis") return "Tenis disponibles en tienda. Pregúntanos por tallas disponibles.";
    return `Fragancia ${p.cat === "mujer" ? "para dama" : p.cat === "hombre" ? "para caballero" : ""} de ${esc(p.brand)}, 100% original. Compra de contado o llévatela a crédito con pagos cómodos.`;
  }
  function openProduct(id, push = true) {
    const p = PRODUCTS.find(x => x.id === id); if (!p) return;
    $("#sheetBody").innerHTML = `<div class="pd">
      <div class="pd-ph">${photo(p)}</div>
      <div>
        <div class="pd-br">${esc(p.brand)} · ${p.cat === "hombre" ? "Caballero" : p.cat === "mujer" ? "Dama" : esc(p.cat)}</div>
        <h3>${esc(p.name)}</h3>
        <div class="prices">
          <div><small>Contado</small><b>${p.cash ? money(p.cash) : "Consultar"}</b></div>
          ${p.credit ? `<div><small>A crédito</small><b>${money(p.credit)}</b></div>` : ""}
        </div>
        <div class="stock${p.stock > 0 ? "" : " no"}">${p.stock > 0 ? (p.stock === 1 ? "Disponible · última pieza" : "Disponible en tienda") : "Sobre pedido · pregunta disponibilidad"}</div>
        ${p.sizes ? `<p class="pd-desc"><b>Tallas:</b> ${esc(p.sizes)}</p>` : ""}
        <p class="pd-desc">${describe(p)}</p>
        <div class="pd-actions">
          <a class="btn wa" href="${waURL(interestMsg(p))}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" style="stroke:#fff"><path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/></svg> ME INTERESA · WHATSAPP</a>
          <div class="row">
            <button class="btn ghost" data-pbag>${bag.includes(p.id) ? "✓ En mi lista" : "+ Mi lista"}</button>
            <button class="btn ghost" data-pfav>${favs.has(p.id) ? "♥ En favoritos" : "♡ Favorito"}</button>
          </div>
          <button class="btn ghost" data-share>Compartir enlace</button>
        </div>
      </div></div>`;
    $("#sheetBody [data-pbag]").onclick = () => toggleBag(p.id);
    $("#sheetBody [data-pfav]").onclick = () => toggleFav(p.id);
    $("#sheetBody [data-share]").onclick = async () => {
      const url = productURL(p);
      try { if (navigator.share) await navigator.share({ title: p.name + " · SAJA Perfumes", url }); else { await navigator.clipboard.writeText(url); toast("Enlace copiado"); } } catch (e) {}
    };
    openSheet("#sheet");
    if (push) history.replaceState(null, "", "#p=" + encodeURIComponent(p.id));
  }

  /* ---------- bag ---------- */
  function renderBagSheet() {
    const items = bag.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
    if (!items.length) { $("#bagBody").innerHTML = `<p class="pd-desc">Tu lista está vacía. Toca <b>+</b> en los productos que te interesan y envíanos la lista completa por WhatsApp.</p><button class="btn dark" data-close style="width:100%">Explorar catálogo</button>`; return; }
    const total = items.reduce((s, p) => s + (+p.cash || 0), 0);
    $("#bagBody").innerHTML = items.map(p => `<div class="bag-item"><div class="mini">${photo(p)}</div><div><b>${esc(p.name)}</b><span>${esc(p.brand)} · ${p.cash ? money(p.cash) : "Consultar"}</span></div><button data-rm="${esc(p.id)}" aria-label="Quitar">✕</button></div>`).join("") +
      `<div class="bag-total"><span>Total de contado aprox.</span><span>${money(total)}</span></div>
       <a class="btn wa" style="width:100%" target="_blank" rel="noopener" href="${waURL("Hola SAJA Perfumes 👋 Me interesan estos productos:\n" + items.map(p => `• *${p.name}* (${p.brand}) – ${p.cash ? money(p.cash) : "consultar"}\n  ${productURL(p)}`).join("\n") + `\nTotal aprox.: ${money(total)}`)}">ENVIAR MI LISTA POR WHATSAPP</a>`;
    $$("#bagBody [data-rm]").forEach(b => b.onclick = () => { toggleBag(b.dataset.rm); renderBagSheet(); });
  }
  $("#btnBag").onclick = () => { renderBagSheet(); openSheet("#bag"); };

  /* ---------- overlays ---------- */
  function openSheet(sel) { $$(".sheet.on").forEach(s => s.classList.remove("on")); $(sel).classList.add("on"); document.body.style.overflow = "hidden"; }
  function closeAll() {
    $$(".sheet.on,.drawer.on,.scrim.on").forEach(s => s.classList.remove("on"));
    document.body.style.overflow = "";
    if (location.hash.startsWith("#p=")) history.replaceState(null, "", location.pathname + location.search);
  }
  $("#btnMenu").onclick = () => { $("#drawer").classList.add("on"); $("#scrim").classList.add("on"); };
  $("#scrim").onclick = closeAll;
  document.addEventListener("click", e => { if (e.target.closest("[data-close]") || e.target.classList.contains("sheet")) closeAll(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });
  $$(".bottom-nav a[data-nav]").forEach(a => a.addEventListener("click", e => {
    const n = a.dataset.nav;
    if (n === "home") { e.preventDefault(); closeAll(); scrollTo({ top: 0, behavior: "smooth" }); }
    if (n === "favs") { e.preventDefault(); showFavs(); }
    if (n === "cats") { e.preventDefault(); setCat("all"); }
    $$(".bottom-nav a").forEach(x => x.classList.toggle("on", x === a));
  }));

  let tT; function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tT); tT = setTimeout(() => t.classList.remove("on"), 2400); }

  /* ---------- hash routing ---------- */
  function route() {
    const h = decodeURIComponent(location.hash || "");
    if (h.startsWith("#p=")) openProduct(h.slice(3), false);
    else if (h.startsWith("#cat=")) setCat(h.slice(5));
  }
  window.addEventListener("hashchange", route);

  function renderAll() { updateBag(); renderCats(); renderRail(); renderBrands(); renderGrid(); }

  /* ---------- datos en vivo (Firebase) ---------- */
  async function live() {
    const sdk = window.SAJA_FB_SDK;
    const { initializeApp } = await import(sdk + "firebase-app.js");
    const fs = await import(sdk + "firebase-firestore.js");
    const db = fs.getFirestore(initializeApp(window.SAJA_FB));
    const [meta, site] = await Promise.all([fs.getDoc(fs.doc(db, "meta", "catalog")), fs.getDoc(fs.doc(db, "config", "site"))]);
    let changed = false;
    if (site.exists()) { CFG = Object.assign({}, window.SAJA_DEFAULTS, site.data()); changed = true; }
    const v = meta.exists() ? meta.data().v : 0;
    const cache = LS.get("saja_cache", null);
    if (v) {
      if (cache && cache.v === v) PRODUCTS = cache.products;
      else {
        const snap = await fs.getDocs(fs.collection(db, "products"));
        PRODUCTS = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
        LS.set("saja_cache", { v, products: PRODUCTS });
      }
      changed = true;
    }
    LS.set("saja_cfg", CFG);
    return changed;
  }

  /* ---------- arranque ---------- */
  const cachedCfg = LS.get("saja_cfg", null); if (cachedCfg) CFG = Object.assign({}, window.SAJA_DEFAULTS, cachedCfg);
  const cached = LS.get("saja_cache", null); if (cached && cached.products) PRODUCTS = cached.products;
  applyConfig(); renderAll(); route();
  Promise.race([live(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 9000))])
    .then(ch => { if (ch) { const open = $("#sheet.on"); applyConfig(); renderAll(); if (!open) route(); } })
    .catch(err => console.warn("Catálogo sin conexión a Firebase, usando datos locales:", err && err.message));
})();
