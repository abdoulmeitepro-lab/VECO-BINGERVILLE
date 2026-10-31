/* Widget "Donner mon avis" — Véco Bingerville
 * Les visiteurs cliquent sur un élément de la page, écrivent un commentaire,
 * et il est envoyé vers ton Google Sheet (voir LISEZ-MOI.md).
 */
(function () {
  "use strict";
  var CFG = window.FEEDBACK_CONFIG || {};
  var ENDPOINT = CFG.endpoint || "";
  var BLUE = "#0412F2", ORANGE = "#FF3D0A", INK = "#0B0E33";

  var host = document.createElement("div");
  host.id = "vf-host";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483000;left:0;top:0;width:0;height:0;";
  document.body.appendChild(host);
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    '<style>' +
    '*{box-sizing:border-box;font-family:Poppins,"Segoe UI",system-ui,sans-serif}' +
    '.fab{position:fixed;right:16px;bottom:16px;background:' + BLUE + ';color:#fff;border:0;border-radius:999px;padding:12px 18px;font-weight:600;font-size:14px;cursor:pointer;box-shadow:0 6px 20px rgba(4,18,242,.35)}' +
    '.fab:hover{background:#020A9E}' +
    '.hl{position:fixed;pointer-events:none;border:2px solid ' + ORANGE + ';background:rgba(255,61,10,.12);border-radius:6px;display:none;transition:all .05s}' +
    '.bar{position:fixed;left:50%;top:12px;transform:translateX(-50%);background:' + INK + ';color:#fff;border-radius:12px;padding:10px 14px;font-size:13px;display:none;align-items:center;gap:12px;box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:92vw}' +
    '.bar button{background:#fff;color:' + INK + ';border:0;border-radius:8px;padding:6px 10px;font-weight:600;font-size:12px;cursor:pointer}' +
    '.panel{position:fixed;right:16px;bottom:16px;width:min(360px,calc(100vw - 32px));background:#fff;color:' + INK + ';border-radius:16px;padding:16px;box-shadow:0 12px 40px rgba(2,10,158,.3);display:none;border:1px solid #DADDF5}' +
    '.panel h3{margin:0 0 4px;font-size:16px}' +
    '.ctx{font-size:12px;color:#5A5E86;background:#F3F4FF;border-radius:8px;padding:8px;margin:8px 0;word-break:break-word}' +
    'label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px}' +
    'input,textarea,select{width:100%;border:1px solid #DADDF5;border-radius:8px;padding:9px;font-size:14px;color:' + INK + ';background:#fff}' +
    'textarea{min-height:90px;resize:vertical}' +
    '.row{display:flex;gap:8px;margin-top:12px}' +
    '.row button{flex:1;border:0;border-radius:10px;padding:10px;font-weight:600;font-size:14px;cursor:pointer}' +
    '.send{background:' + BLUE + ';color:#fff}.send[disabled]{opacity:.6}' +
    '.cancel{background:#F3F4FF;color:' + INK + '}' +
    '.link{background:none;border:0;color:' + BLUE + ';font-size:12px;text-decoration:underline;cursor:pointer;padding:0;margin-top:6px}' +
    '.msg{font-size:13px;margin-top:8px}.ok{color:#0E9F6E}.err{color:#C62828}' +
    '</style>' +
    '<button class="fab" type="button">💬 Donner mon avis</button>' +
    '<div class="hl"></div>' +
    '<div class="bar"><span>Touche ou clique sur l\'élément à commenter</span><button type="button" data-a="general">Commentaire général</button><button type="button" data-a="stop">Annuler</button></div>' +
    '<form class="panel">' +
    '<h3>Ton avis</h3>' +
    '<div class="ctx"></div>' +
    '<label>Ton prénom (facultatif)</label><input name="name" autocomplete="given-name">' +
    '<label>Type</label><select name="type"><option>💡 Idée / suggestion</option><option>🐞 Problème</option><option>❤️ J\'aime</option><option>❓ Question</option></select>' +
    '<label>Ton commentaire</label><textarea name="comment" required placeholder="Dis-moi ce que tu en penses…"></textarea>' +
    '<button type="button" class="link" data-a="repick">Choisir un autre élément</button>' +
    '<div class="msg"></div>' +
    '<div class="row"><button type="button" class="cancel" data-a="close">Fermer</button><button class="send" type="submit">Envoyer</button></div>' +
    '</form>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".fab"), hl = $(".hl"), bar = $(".bar"), panel = $(".panel"),
      ctx = $(".ctx"), msg = $(".msg"), sendBtn = $(".send");
  var picking = false, target = null, current = {};

  function isOurs(el) { return el === host || host.contains(el); }
  function truncate(s, n) { s = (s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function selectorFor(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.body && parts.length < 6) {
      var p = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(p + "#" + el.id); break; }
      var cls = (el.className && typeof el.className === "string") ? el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
      if (cls) p += "." + cls;
      var sib = el.parentNode ? Array.prototype.filter.call(el.parentNode.children, function (c) { return c.tagName === el.tagName; }) : [];
      if (sib.length > 1) p += ":nth-of-type(" + (sib.indexOf(el) + 1) + ")";
      parts.unshift(p);
      el = el.parentNode;
    }
    return parts.join(" > ");
  }

  function sectionOf(el) {
    var s = el && el.closest ? el.closest("section[id], header, footer, nav") : null;
    if (!s) return { id: "haut-de-page", title: "Haut de page" };
    var h = s.querySelector("h1,h2,h3");
    return { id: s.id || s.tagName.toLowerCase(), title: h ? truncate(h.textContent, 80) : "" };
  }

  function describe(el) {
    if (!el) return { section: "(général)", sectionTitle: "", selector: "", elementText: "" };
    var sec = sectionOf(el);
    return { section: sec.id, sectionTitle: sec.title, selector: selectorFor(el), elementText: truncate(el.innerText || el.alt || el.getAttribute("aria-label") || "", 120) };
  }

  var h2cPromise;
  function loadH2C() {
    if (window.html2canvas) return Promise.resolve();
    if (!h2cPromise) h2cPromise = new Promise(function (res, rej) {
      var sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      sc.onload = res; sc.onerror = rej; document.head.appendChild(sc);
    });
    return h2cPromise;
  }
  // Capture la section de l'élément choisi, recadrée autour de lui, avec un cadre orange.
  function capture(el) {
    var sec = el.closest("section, header, footer, nav") || document.body;
    var sr = sec.getBoundingClientRect(), er = el.getBoundingClientRect(), SC = 0.5;
    return loadH2C().then(function () {
      return window.html2canvas(sec, { scale: SC, useCORS: true, logging: false, backgroundColor: "#ffffff", ignoreElements: function (n) { return n === host; } });
    }).then(function (c) {
      var ex = (er.left - sr.left) * SC, ey = (er.top - sr.top) * SC, ew = er.width * SC, eh = er.height * SC;
      var ch = Math.min(c.height, 700 * SC);
      var cy = Math.max(0, Math.min(c.height - ch, ey + eh / 2 - ch / 2));
      var out = document.createElement("canvas"); out.width = c.width; out.height = ch;
      var g = out.getContext("2d");
      g.drawImage(c, 0, cy, c.width, ch, 0, 0, c.width, ch);
      g.strokeStyle = ORANGE; g.lineWidth = 3; g.strokeRect(ex, ey - cy, ew, eh);
      return out.toDataURL("image/jpeg", 0.65);
    }).catch(function () { return ""; });
  }
  var shot = null;

  function startPicking() {
    picking = true; panel.style.display = "none"; fab.style.display = "none"; bar.style.display = "flex";
  }
  function stopPicking() {
    picking = false; hl.style.display = "none"; bar.style.display = "none";
  }
  function openPanel(el) {
    stopPicking();
    target = el; current = describe(el);
    shot = el ? capture(el) : null;
    ctx.textContent = el
      ? "📍 Section : " + (current.sectionTitle || current.section || "Page") + (current.elementText ? " — « " + current.elementText + " »" : "")
      : "📍 Commentaire général sur le site";
    msg.textContent = ""; msg.className = "msg";
    panel.style.display = "block"; fab.style.display = "none";
    panel.comment.focus();
  }
  function closeAll() { stopPicking(); panel.style.display = "none"; fab.style.display = "block"; }

  fab.addEventListener("click", startPicking);
  root.addEventListener("click", function (e) {
    var a = e.target && e.target.getAttribute && e.target.getAttribute("data-a");
    if (a === "stop" || a === "close") closeAll();
    else if (a === "general") openPanel(null);
    else if (a === "repick") startPicking();
  });

  function pick(e) { return document.elementFromPoint(e.clientX, e.clientY); }
  document.addEventListener("mousemove", function (e) {
    if (!picking) return;
    var el = pick(e);
    if (!el || isOurs(el)) { hl.style.display = "none"; return; }
    var r = el.getBoundingClientRect();
    hl.style.cssText = "display:block;left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px";
  }, true);
  document.addEventListener("click", function (e) {
    if (!picking) return;
    var el = pick(e);
    if (!el || isOurs(el)) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    openPanel(el);
  }, true);

  panel.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = panel;
    var payload = {
      date: new Date().toISOString(),
      name: f.name.value.trim(),
      type: f.type.value,
      comment: f.comment.value.trim(),
      section: current.section, sectionTitle: current.sectionTitle,
      selector: current.selector, elementText: current.elementText,
      page: location.href,
      viewport: window.innerWidth + "x" + window.innerHeight,
      theme: document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
      userAgent: navigator.userAgent
    };
    if (!payload.comment) return;
    sendBtn.disabled = true; msg.className = "msg"; msg.textContent = "Envoi…";

    function done() {
      msg.className = "msg ok"; msg.textContent = "Merci ! Ton avis a bien été envoyé 🙌";
      f.comment.value = "";
      setTimeout(function () { closeAll(); sendBtn.disabled = false; }, 1500);
    }
    if (!ENDPOINT) { // mode test : rien n'est configuré
      console.log("[feedback] (aucun endpoint configuré)", payload);
      msg.className = "msg err"; msg.textContent = "Envoi non configuré (voir LISEZ-MOI).";
      sendBtn.disabled = false; return;
    }
    var wait = new Promise(function (r) { setTimeout(function () { r(""); }, 8000); });
    Promise.race([shot || Promise.resolve(""), wait]).then(function (img) {
      payload.screenshot = img || "";
      return fetch(ENDPOINT, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    }).then(done)
      .catch(function () { msg.className = "msg err"; msg.textContent = "Échec de l'envoi, réessaie."; sendBtn.disabled = false; });
  });
})();
