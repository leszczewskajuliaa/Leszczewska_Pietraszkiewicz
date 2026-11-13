/* MARGINES — interakcje strony (czysty JavaScript, bez bibliotek)
   Koszyk, panel książki, wyszukiwarka, menu mobilne, filtry sklepu,
   punkty na zdjęciu strony głównej i formularz kontaktowy. */
(function () {
  "use strict";

  var DATA = window.MARGINES_DATA || { products: [], categories: [] };
  var STORAGE_KEY = "margines-cart";

  /* ---------- Pomocnicze ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function getProduct(id) {
    for (var i = 0; i < DATA.products.length; i++) if (DATA.products[i].id === id) return DATA.products[i];
    return null;
  }
  function formatPrice(n) { return n.toFixed(2).replace(".", ",") + " zł"; }
  function icon(d) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"></path></svg>';
  }

  /* ---------- Okładka i karta produktu ---------- */
  function cover(p, small) {
    var c = p.cover;
    var style = "--c-bg:" + c.bg + ";--c-fg:" + c.fg + ";--c-acc:" + c.acc + ";--c-r:" + (c.r || "50%") + ";--c-align:" + (c.align || "center");
    return '<div class="m-cover" role="img" aria-label="Okładka: ' + esc(p.title) + ", " + esc(p.author) + '" style="' + style + '">' +
      '<span class="a">' + esc(p.author) + '</span><span class="shape"></span>' +
      '<span class="t"' + (small ? ' style="font-size:1.1rem"' : "") + ">" + esc(p.title) + "</span></div>";
  }
  function productCard(p) {
    return '<article class="card m-card h-100">' +
      '<a class="p-0 border-0 bg-transparent text-start d-block" href="ksiazka-' + p.id + '.html" aria-label="Szczegóły: ' + esc(p.title) + '">' + cover(p) + "</a>" +
      '<div class="card-body d-flex flex-column"><h3 class="card-title">' + esc(p.title) + "</h3>" +
      '<p class="small text-muted-m mb-2">' + esc(p.author) + "</p>" +
      '<div class="d-flex justify-content-between align-items-center mt-auto"><span class="fw-semibold">' + (p.promoOldPrice ? '<del class="small text-muted-m">'+formatPrice(p.promoOldPrice)+'</del> ' : '') + formatPrice(p.price) + "</span>" +
      '<button class="m-icon-btn"' + (p.available ? ' data-add="' + p.id + '"' : " disabled") +
      ' aria-label="' + (p.available ? "Dodaj do koszyka: " + esc(p.title) : esc(p.title) + " — niedostępna") + '">' + icon("M12 5v14M5 12h14") + "</button>" +
      "</div></div></article>";
  }

  /* ---------- Koszyk (zapisywany w przeglądarce) ---------- */
  var items = [];
  try { items = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (e) { items = []; }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); updateCount(); }
  function lines() {
    return items.map(function (l) { return { id: l.id, qty: l.qty, product: getProduct(l.id) }; })
      .filter(function (l) { return l.product; });
  }
  function count() { return lines().reduce(function (s, l) { return s + l.qty; }, 0); }
  function total() { return lines().reduce(function (s, l) { return s + l.qty * l.product.price; }, 0); }

  function add(id) {
    var p = getProduct(id);
    if (!p || !p.available) return;
    var found = items.filter(function (l) { return l.id === id; })[0];
    if (found) found.qty += 1; else items.push({ id: id, qty: 1 });
    save();
    notify("Dodano do koszyka: „" + p.title + "”");
    if (currentPanel === "cart") openCart();
  }
  function setQty(id, qty) {
    items = qty <= 0 ? items.filter(function (l) { return l.id !== id; })
      : items.map(function (l) { return l.id === id ? { id: id, qty: qty } : l; });
    save();
  }

  var cartBtn = $('.m-icon-btn[aria-label^="Koszyk"]');
  function updateCount() {
    if (!cartBtn) return;
    var n = count();
    cartBtn.setAttribute("aria-label", "Koszyk, produktów: " + n);
    var badge = $(".m-count", cartBtn);
    if (n > 0) {
      if (!badge) { badge = document.createElement("span"); badge.className = "m-count"; badge.setAttribute("aria-hidden", "true"); cartBtn.appendChild(badge); }
      badge.textContent = n;
    } else if (badge) badge.remove();
  }

  /* ---------- Powiadomienie ---------- */
  var toastTimer;
  function notify(msg) {
    var box = $("#m-toast");
    box.innerHTML = '<div class="m-toast">' + esc(msg) + "</div>";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.innerHTML = ""; }, 2800);
  }

  /* ---------- Panel boczny ---------- */
  var overlays = $("#m-overlays");
  var currentPanel = null;
  var prevFocus = null;
  function openPanel(label, html, kind) {
    if (!currentPanel) prevFocus = document.activeElement;
    currentPanel = kind || "panel";
    overlays.innerHTML = '<div class="m-backdrop" data-close></div>' +
      '<div class="m-panel" role="dialog" aria-modal="true" aria-label="' + esc(label) + '" tabindex="-1">' +
      '<div class="d-flex justify-content-between align-items-center mb-4"><span class="m-eyebrow">' + esc(label) + "</span>" +
      '<button class="m-close" aria-label="Zamknij panel" data-close>×</button></div>' + html + "</div>";
    $(".m-panel", overlays).focus();
  }
  function closePanel() {
    if (!currentPanel) return;
    overlays.innerHTML = "";
    currentPanel = null;
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function openProduct(id) {
    var p = getProduct(id);
    if (!p) return;
    openPanel("Książka",
      '<div><div style="max-width:220px" class="mb-4">' + cover(p) + "</div>" +
      '<span class="badge m-badge mb-2">' + esc(p.category) + "</span>" +
      '<h2 class="mb-1" style="font-size:2.2rem">' + esc(p.title) + "</h2>" +
      '<p class="text-muted-m mb-3">' + esc(p.author) + "</p><p>" + esc(p.description) + "</p>" +
      '<p class="fs-4 fw-semibold mb-1">' + formatPrice(p.price) + "</p>" +
      '<p class="small mb-4 ' + (p.available ? "" : "text-danger") + '">' + esc(p.stockNote) + "</p>" +
      '<div class="d-flex flex-wrap gap-2"><button class="btn btn-m-dark"' + (p.available ? ' data-add="' + p.id + '"' : " disabled") + ">Dodaj do koszyka</button>" +
      '<a href="ksiazka-' + p.id + '.html" class="btn btn-m-line">Zobacz książkę</a></div></div>');
  }

  function openCart() {
    var ls = lines();
    var html;
    if (!ls.length) {
      html = '<div><h2 style="font-size:2rem">Koszyk jest pusty</h2>' +
        '<p class="text-muted-m">Rozejrzyj się po księgarni — coś na pewno wpadnie Ci w oko.</p>' +
        '<a href="ksiazki.html" class="btn btn-m-dark">Przeglądaj książki</a></div>';
    } else {
      html = '<ul class="list-group m-list mb-4">' + ls.map(function (l) {
        var t = esc(l.product.title);
        return '<li class="list-group-item d-flex gap-3 align-items-start"><div style="width:56px;flex:none">' + cover(l.product, true) + "</div>" +
          '<div class="flex-grow-1"><h3 class="mb-0">' + t + "</h3>" +
          '<p class="small text-muted-m mb-2">' + esc(l.product.author) + " · " + formatPrice(l.product.price) + "</p>" +
          '<div class="d-flex align-items-center gap-2">' +
          '<button class="btn btn-m-line px-3" data-qty="' + l.id + '" data-delta="-1" aria-label="Zmniejsz ilość: ' + t + '">−</button>' +
          '<span aria-live="polite">' + l.qty + "</span>" +
          '<button class="btn btn-m-line px-3" data-qty="' + l.id + '" data-delta="1" aria-label="Zwiększ ilość: ' + t + '">+</button>' +
          '<button class="btn btn-link small ms-auto" data-remove="' + l.id + '">Usuń</button></div></div></li>';
      }).join("") + "</ul>" +
        '<div class="d-flex justify-content-between fs-5 mb-3"><span>Razem</span><strong>' + formatPrice(total()) + "</strong></div>" +
        '<button class="btn btn-m-dark w-100" data-checkout>Przejdź do zamówienia</button>' +
        '<p class="small text-muted-m mt-2">Koszyk demonstracyjny — bez płatności online.</p>';
    }
    openPanel("Koszyk", html, "cart");
  }

  /* ---------- Kliknięcia (jeden nasłuch dla całej strony) ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-close],[data-open],[data-add],[data-qty],[data-remove],[data-checkout],[data-spot]");
    if (!t) return;
    if (t.hasAttribute("data-close")) return closePanel();
    if (t.hasAttribute("data-add")) return add(t.getAttribute("data-add"));
    if (t.hasAttribute("data-open")) { currentPanel = null; return openProduct(t.getAttribute("data-open")); }
    if (t.hasAttribute("data-qty")) {
      var id = t.getAttribute("data-qty");
      var l = items.filter(function (x) { return x.id === id; })[0];
      if (l) setQty(id, l.qty + Number(t.getAttribute("data-delta")));
      return openCart();
    }
    if (t.hasAttribute("data-remove")) { setQty(t.getAttribute("data-remove"), 0); return openCart(); }
    if (t.hasAttribute("data-checkout")) { window.location.href = "zamowienie.html"; return; }
    if (t.hasAttribute("data-spot")) {
      var tpl = document.getElementById("spot-" + t.getAttribute("data-spot"));
      if (tpl) openPanel(tpl.getAttribute("data-label"), tpl.innerHTML);
    }
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closePanel(); });

  if (cartBtn) cartBtn.addEventListener("click", openCart);
  updateCount();

  /* ---------- Menu mobilne ---------- */
  var toggler = $(".navbar-toggler");
  var menu = $("#m-menu");
  if (toggler && menu) {
    toggler.addEventListener("click", function () {
      var open = menu.classList.toggle("show");
      toggler.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Wyszukiwarka w nagłówku ---------- */
  var searchBtn = $('.m-icon-btn[aria-controls="m-search"]');
  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      var form = $("#m-search");
      if (form) { form.remove(); searchBtn.setAttribute("aria-expanded", "false"); return; }
      form = document.createElement("form");
      form.id = "m-search";
      form.setAttribute("role", "search");
      form.action = "ksiazki.html";
      form.className = "m-search-form";
      form.innerHTML = '<label for="m-search-input" class="visually-hidden">Szukaj tytułu lub autora</label>' +
        '<input id="m-search-input" name="q" type="search" class="form-control" placeholder="Tytuł lub autor…">' +
        '<button class="btn btn-m-dark" type="submit">Szukaj</button>';
      $("nav.m-nav").appendChild(form);
      searchBtn.setAttribute("aria-expanded", "true");
      $("#m-search-input").focus();
    });
  }

  /* ---------- Sklep: filtry, sortowanie, paginacja ---------- */
  var shopInput = $("#shop-q");
  if (shopInput) {
    var categoryBox = $("#shop-categories"), resultBox = $("#shop-results"), pageBox = $("#shop-pages");
    var countEl = $("#shop-count"), maxEl = $("#shop-max"), maxLabel = $("#shop-max-label");
    var availableEl = $("#shop-available"), sortEl = $("#shop-sort");
    var params = new URLSearchParams(location.search);
    var state = { q: params.get("q") || "", kat: params.get("kat") || "", max: Number(params.get("max") || 200), available: params.get("available") === "1", sort: params.get("sort") || "default", page: 1 };
    state.max = Math.min(200, Math.max(20, state.max));
    shopInput.value = state.q; maxEl.value = state.max; availableEl.checked = state.available;
    if (["default","price-asc","price-desc","popular","name"].indexOf(state.sort) < 0) state.sort = "default";
    sortEl.value = state.sort;
    var cats = [{id:"",label:"Wszystkie"},{id:"nowosci",label:"Nowości"}].concat(DATA.categories);
    categoryBox.innerHTML = cats.map(function(c) {return '<label class="m-shop-category"><input type="radio" name="shop-category" value="'+esc(c.id)+'" '+(state.kat===c.id?'checked':'')+'><span>'+esc(c.label)+'</span></label>';}).join("");
    function render() {
      var query = state.q.trim().toLocaleLowerCase("pl");
      var found = DATA.products.filter(function(p){return (!state.kat || (state.kat==="nowosci" ? p.isNew : p.category===state.kat)) && (!query || (p.title+" "+p.author).toLocaleLowerCase("pl").indexOf(query)!==-1) && p.price<=state.max && (!state.available || p.available);});
      if (state.sort==="price-asc") found.sort(function(a,b){return a.price-b.price;});
      if (state.sort==="price-desc") found.sort(function(a,b){return b.price-a.price;});
      if (state.sort==="name") found.sort(function(a,b){return a.title.localeCompare(b.title,"pl");});
      if (state.sort==="popular") found.sort(function(a,b){return Number(!!b.pick)-Number(!!a.pick) || Number(!!b.isNew)-Number(!!a.isNew);});
      var pageSize=8, pages=Math.max(1,Math.ceil(found.length/pageSize)); state.page=Math.min(state.page,pages);
      maxLabel.textContent=state.max+" zł"; countEl.textContent="Znaleziono produktów: "+found.length;
      var visible=found.slice((state.page-1)*pageSize,state.page*pageSize);
      resultBox.innerHTML=visible.length ? '<div class="row g-4">'+visible.map(function(p){return '<div class="col-6 col-md-4">'+productCard(p)+'</div>';}).join("")+'</div>' : '<div class="m-shop-empty"><h2 class="h4">Brak wyników</h2><p>Zmień filtry lub wyczyść wyszukiwanie.</p><button type="button" class="btn btn-m-dark" id="shop-empty-reset">Wyczyść filtry</button></div>';
      pageBox.innerHTML=found.length>pageSize ? Array.from({length:pages},function(_,i){return '<li class="page-item '+(state.page===i+1?'active':'')+'"><button type="button" class="page-link" data-page-number="'+(i+1)+'" '+(state.page===i+1?'aria-current="page"':'')+' aria-label="Strona '+(i+1)+'">'+(i+1)+'</button></li>';}).join("") : "";
      var u=new URLSearchParams(); if(state.q)u.set("q",state.q);if(state.kat)u.set("kat",state.kat);if(state.max<200)u.set("max",state.max);if(state.available)u.set("available","1");if(state.sort!=="default")u.set("sort",state.sort);
      history.replaceState(null,"",location.pathname+(u.toString()?"?"+u:""));
    }
    function reset(){state={q:"",kat:"",max:200,available:false,sort:"default",page:1};shopInput.value="";maxEl.value=200;availableEl.checked=false;sortEl.value="default";var radio=categoryBox.querySelector('input[value=""]');if(radio)radio.checked=true;render();}
    shopInput.addEventListener("input",function(){state.q=this.value;state.page=1;render();});
    categoryBox.addEventListener("change",function(e){if(e.target.name==="shop-category"){state.kat=e.target.value;state.page=1;render();}});
    maxEl.addEventListener("input",function(){state.max=Number(this.value);state.page=1;render();});
    availableEl.addEventListener("change",function(){state.available=this.checked;state.page=1;render();});
    sortEl.addEventListener("change",function(){state.sort=this.value;state.page=1;render();});
    $("#shop-reset").addEventListener("click",reset);
    resultBox.addEventListener("click",function(e){if(e.target.closest("#shop-empty-reset"))reset();});
    pageBox.addEventListener("click",function(e){var b=e.target.closest("[data-page-number]");if(b){state.page=Number(b.dataset.pageNumber);render();$("#shop-count").scrollIntoView({behavior:"smooth",block:"start"});}});
    render();
  }

  /* ---------- Formularz kontaktowy ---------- */
  var contact = $("#contact-form");
  if (contact) {
    contact.addEventListener("submit", function (e) {
      e.preventDefault();
      var fd = new FormData(contact);
      var name = String(fd.get("name") || "").trim();
      var email = String(fd.get("email") || "").trim();
      var message = String(fd.get("message") || "").trim();
      var box = $('[aria-live="polite"]', contact);
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
        box.innerHTML = '<p class="text-danger small">Uzupełnij imię, poprawny e-mail i wiadomość (min. 10 znaków).</p>';
        return;
      }
      box.innerHTML = '<p class="small" style="color:var(--m-olive)">Dziękujemy! To formularz demonstracyjny — wiadomość nie została faktycznie wysłana.</p>';
      contact.reset();
    });
  }
})();
