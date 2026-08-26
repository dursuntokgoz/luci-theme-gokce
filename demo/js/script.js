/* =====================================================================
   RouterOS Dashboard — Arayüz etkileşimleri (Vanilla JS, bağımlılık yok)
   - Karanlık / aydınlık tema (localStorage'da saklanır) + Otomatik mod
   - Görünüm paneli: tema / vurgu rengi / yoğunluk (kalıcı)
   - Sidebar aç/kapat (masaüstü: daralt, mobil: off-canvas)
   - Sidebar açılır alt menüler (akordiyon) + iç içe 3. seviye gruplar
   - Favoriler: başlıkta yıldızla sabitleme, sürükle-sırala
   - Komut paleti sayfa arama (Ctrl+K)
   - Canvas ile canlı trafik grafiği (degrade dolgulu, demo verisi)
   - CPU/RAM, hız ve uptime değerlerinin simüle güncellenmesi
   ===================================================================== */
(function () {
  "use strict";

  var root = document.documentElement;
  var app = document.querySelector(".app");
  var MOBILE_BREAKPOINT = 768;

  function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  /* ---------------- Yardımcılar ---------------- */
  function store(key, val) {
    try {
      if (val === null || val === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, val);
    } catch (e) {}
  }

  function load(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function prefersDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /* ?theme= ekran görüntüsü parametresi: açık bir tercih gibi davranır */
  var forcedTheme = new URLSearchParams(location.search).get("theme");

  /* ---------------- Tema modu (auto / light / dark) ---------------- */
  function currentMode() {
    if (forcedTheme) return forcedTheme;
    var v = load("theme");
    return v === null ? "auto" : v;
  }

  function applyTheme(isDark, persist) {
    root.setAttribute("data-theme", isDark ? "dark" : "light");
    if (persist) store("theme", isDark ? "dark" : "light");
    else store("theme", null);
    drawChart(); // grafik renkleri CSS değişkenlerinden okunuyor
  }

  var themeToggle = document.getElementById("theme-toggle");

  themeToggle.addEventListener("click", function () {
    applyTheme(root.getAttribute("data-theme") !== "dark", true);
    syncAppearance();
  });

  // Otomatik moddayken işletim sistemi tercihi değişirse takip et
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    if (currentMode() === "auto" && !forcedTheme)
      applyTheme(e.matches, false);
  });

  /* ---------------- Vurgu rengi ve yoğunluk ---------------- */
  function applyAccent(accent) {
    if (accent && accent !== "blue") root.setAttribute("data-accent", accent);
    else root.removeAttribute("data-accent");
    store("gokce-accent", (accent && accent !== "blue") ? accent : null);
    drawChart();
  }

  function applyDensity(density) {
    if (density && density !== "comfortable") root.setAttribute("data-density", density);
    else root.removeAttribute("data-density");
    store("gokce-density", (density && density !== "comfortable") ? density : null);
  }

  /* ---------------- Görünüm paneli ---------------- */
  var appearanceWrap = document.getElementById("appearance");
  var appearanceToggle = document.getElementById("appearance-toggle");
  var appearancePanel = document.getElementById("appearance-panel");

  function openPanel() {
    if (!appearancePanel) return;
    appearancePanel.hidden = false;
    appearanceToggle.setAttribute("aria-expanded", "true");
    syncAppearance();
    document.addEventListener("click", onOutsidePanel, true);
    document.addEventListener("keydown", onPanelKey);
  }

  function closePanel() {
    if (!appearancePanel) return;
    appearancePanel.hidden = true;
    appearanceToggle.setAttribute("aria-expanded", "false");
    document.removeEventListener("click", onOutsidePanel, true);
    document.removeEventListener("keydown", onPanelKey);
  }

  function onOutsidePanel(ev) {
    if (appearanceWrap && !appearanceWrap.contains(ev.target)) closePanel();
  }

  function onPanelKey(ev) {
    if (ev.key === "Escape") { closePanel(); appearanceToggle.focus(); }
  }

  if (appearanceToggle) {
    appearanceToggle.addEventListener("click", function (ev) {
      ev.stopPropagation();
      if (appearancePanel.hidden) openPanel();
      else closePanel();
    });
  }

  var modeSeg = document.getElementById("mode-seg");
  if (modeSeg) modeSeg.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-mode]");
    if (!btn) return;
    var mode = btn.getAttribute("data-mode");
    forcedTheme = null; // kullanıcı tercihi parametreyi geçersiz kılar
    if (mode === "auto") applyTheme(prefersDark(), false);
    else applyTheme(mode === "dark", true);
    syncAppearance();
  });

  var accentList = document.getElementById("accent-list");
  if (accentList) accentList.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-accent]");
    if (!btn) return;
    applyAccent(btn.getAttribute("data-accent"));
    syncAppearance();
  });

  var densitySeg = document.getElementById("density-seg");
  if (densitySeg) densitySeg.addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-density]");
    if (!btn) return;
    applyDensity(btn.getAttribute("data-density"));
    syncAppearance();
  });

  /* Panel kontrollerine o anki durumu yansıt (aktif işaretler) */
  function syncAppearance() {
    var mode = currentMode();
    var accent = load("gokce-accent") || "blue";
    var density = load("gokce-density") || "comfortable";

    document.querySelectorAll("#mode-seg [data-mode]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-mode") === mode);
    });
    document.querySelectorAll("#accent-list [data-accent]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-accent") === accent);
    });
    document.querySelectorAll("#density-seg [data-density]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-density") === density);
    });
  }

  /* ---------------- Sidebar aç/kapat ---------------- */
  var sidebarToggle = document.getElementById("sidebar-toggle");
  var overlay = document.getElementById("overlay");

  sidebarToggle.addEventListener("click", function () {
    if (isMobile()) {
      app.classList.toggle("app--sidebar-open");
    } else {
      app.classList.toggle("app--sidebar-collapsed");
    }
  });

  overlay.addEventListener("click", function () {
    app.classList.remove("app--sidebar-open");
  });

  // Ekran boyutu değişince mobil/masaüstü durum sınıflarını temizle
  window.addEventListener("resize", function () {
    if (isMobile()) {
      app.classList.remove("app--sidebar-collapsed");
    } else {
      app.classList.remove("app--sidebar-open");
    }
  });

  /* ---------------- Açılır alt menüler (akordiyon) ---------------- */
  var groups = document.querySelectorAll(".sidebar__group");

  groups.forEach(function (group) {
    var toggle = group.querySelector(".sidebar__item--toggle");

    toggle.addEventListener("click", function () {
      // Daraltılmış sidebar'da gruba tıklanınca önce menüyü genişlet
      if (!isMobile() && app.classList.contains("app--sidebar-collapsed")) {
        app.classList.remove("app--sidebar-collapsed");
        group.classList.add("sidebar__group--open");
        return;
      }

      var willOpen = !group.classList.contains("sidebar__group--open");

      // Akordiyon davranışı: aynı anda tek grup açık kalsın
      groups.forEach(function (other) {
        other.classList.remove("sidebar__group--open");
      });

      if (willOpen) {
        group.classList.add("sidebar__group--open");
      }
    });
  });

  /* İç içe 3. seviye gruplar: chevron aç/kapat, etiket gezinme */
  document.querySelectorAll(".sidebar__subgroup").forEach(function (sg) {
    sg.querySelector(".sidebar__subitem--parent").addEventListener("click", function (e) {
      if (!e.target.closest(".sidebar__subchevron")) return;
      e.preventDefault();
      sg.classList.toggle("sidebar__subgroup--open");
    });
  });

  /* ---------------- Aktif menü öğesi + sayfa başlığı ---------------- */
  var navLinks = document.querySelectorAll(".sidebar__item[data-page], .sidebar__subitem[data-page]");
  var pageTitle = document.getElementById("page-title");

  navLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      // Üst satırın chevron'ı yalnızca grubu açar/kapatır, gezinmez
      if (e.target.closest(".sidebar__subchevron")) {
        e.preventDefault();
        return;
      }

      e.preventDefault();

      // Tüm aktif işaretlerini temizle
      navLinks.forEach(function (other) {
        other.classList.remove("sidebar__item--active", "sidebar__subitem--active");
      });

      // Öğenin türüne göre doğru aktif sınıfını uygula
      if (link.classList.contains("sidebar__subitem")) {
        link.classList.add("sidebar__subitem--active");
      } else {
        link.classList.add("sidebar__item--active");
        // Düz bir öğe seçilince açık akordiyonları kapat
        groups.forEach(function (g) { g.classList.remove("sidebar__group--open"); });
      }

      pageTitle.textContent = link.getAttribute("data-page");
      syncFavToggle();

      if (isMobile()) {
        app.classList.remove("app--sidebar-open");
      }
    });
  });

  /* ---------------- CBI sekmeleri (ayar sayfası) ---------------- */
  var tabLinks = document.querySelectorAll(".tabs a");
  tabLinks.forEach(function (tab) {
    tab.addEventListener("click", function (e) {
      e.preventDefault();
      tabLinks.forEach(function (t) { t.classList.remove("active"); });
      tab.classList.add("active");
    });
  });

  /* =====================================================================
     Favoriler: başlık yıldızı + sidebar'daki sabitlenmiş sayfalar
     (temadakiyle aynı etkileşim; sürükle-sırala dahil)
     ===================================================================== */
  var FAV_KEY = "gokce-favorites-demo";
  var favBtn = document.getElementById("fav-toggle");
  var nav = document.querySelector(".sidebar__nav");

  function currentPage() {
    return {
      url: location.pathname.split("/").pop() || "index.html",
      title: pageTitle ? pageTitle.textContent : ""
    };
  }

  function loadFavs() {
    try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]") || []; }
    catch (e) { return []; }
  }

  function saveFavs(list) {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function commitFavOrder(section) {
    var urls = Array.prototype.map.call(
      section.querySelectorAll(".sidebar__fav"),
      function (el) { return el.getAttribute("data-url"); });

    var byUrl = {};
    loadFavs().forEach(function (x) { byUrl[x.url] = x; });

    saveFavs(urls.map(function (u) { return byUrl[u]; }).filter(Boolean));
  }

  function renderFavorites() {
    var old = nav.querySelector(".sidebar__favs");
    if (old) old.parentNode.removeChild(old);

    var list = loadFavs();
    if (!list.length) return;

    var cur = currentPage();
    var section = document.createElement("div");
    section.className = "sidebar__favs";

    var title = document.createElement("div");
    title.className = "sidebar__favs-title";
    title.textContent = "Favoriler";
    section.appendChild(title);

    list.forEach(function (f) {
      var link = document.createElement("a");
      link.href = f.url;
      link.className = "sidebar__item sidebar__fav" +
        (f.url === cur.url ? " sidebar__item--active" : "");
      link.setAttribute("data-url", f.url);
      link.draggable = true;

      var icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      icon.setAttribute("class", "icon sidebar__icon");
      icon.innerHTML = '<use href="#icon-star-fill"/>';
      link.appendChild(icon);

      var label = document.createElement("span");
      label.className = "sidebar__label";
      label.textContent = f.title;
      link.appendChild(label);

      var rm = document.createElement("button");
      rm.type = "button";
      rm.className = "sidebar__fav-remove";
      rm.setAttribute("aria-label", "Favorilerden çıkar");
      rm.innerHTML = '<svg class="icon"><use href="#icon-close"/></svg>';
      rm.addEventListener("click", function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        saveFavs(loadFavs().filter(function (x) { return x.url !== f.url; }));
        syncFavToggle();
        renderFavorites();
      });
      link.appendChild(rm);

      link.addEventListener("dragstart", function (ev) {
        ev.dataTransfer.setData("text/plain", f.url);
        ev.dataTransfer.effectAllowed = "move";
        requestAnimationFrame(function () { link.classList.add("sidebar__fav--dragging"); });
      });
      link.addEventListener("dragend", function () {
        link.classList.remove("sidebar__fav--dragging");
        commitFavOrder(section);
      });

      section.appendChild(link);
    });

    section.addEventListener("dragover", function (ev) {
      var dragging = section.querySelector(".sidebar__fav--dragging");
      if (!dragging) return;

      ev.preventDefault();
      ev.dataTransfer.dropEffect = "move";

      var target = ev.target.closest(".sidebar__fav");
      if (!target || target === dragging) return;

      var rect = target.getBoundingClientRect();
      var before = ev.clientY < rect.top + rect.height / 2;
      section.insertBefore(dragging, before ? target : target.nextSibling);
    });

    nav.insertBefore(section, nav.firstChild);
  }

  function syncFavToggle() {
    if (!favBtn) return;
    var page = currentPage();
    if (!page.title) { favBtn.hidden = true; return; }

    var isFav = loadFavs().some(function (f) { return f.url === page.url; });
    favBtn.hidden = false;
    favBtn.classList.toggle("is-active", isFav);
    favBtn.setAttribute("aria-pressed", isFav ? "true" : "false");
    favBtn.setAttribute("aria-label", isFav ? "Favorilerden çıkar" : "Favorilere ekle");
  }

  if (favBtn) {
    favBtn.addEventListener("click", function () {
      var page = currentPage();
      var list = loadFavs();
      var idx = list.findIndex(function (f) { return f.url === page.url; });
      if (idx >= 0) list.splice(idx, 1);
      else list.push(page);

      saveFavs(list);
      syncFavToggle();
      renderFavorites();
    });
  }

  /* =====================================================================
     Komut paleti sayfa arama (Ctrl+K / başlıktaki arama düğmesi)
     Demo menü ağacının düz indeksi; gerçek temada ui.menu.load() gelir.
     ===================================================================== */
  var PAGES = [
    { title: "Genel Bakış",            crumb: "Durum",       href: "index.html" },
    { title: "Güvenlik Duvarı",        crumb: "Durum",       href: "#" },
    { title: "Yönlendirmeler",         crumb: "Durum",       href: "#" },
    { title: "Sistem Günlüğü",         crumb: "Durum",       href: "#" },
    { title: "İşlemler",               crumb: "Durum",       href: "#" },
    { title: "Bant Genişliği",         crumb: "Durum › Gerçek Zamanlı Grafikler", href: "#" },
    { title: "Bağlantılar",            crumb: "Durum › Gerçek Zamanlı Grafikler", href: "#" },
    { title: "Yük",                    crumb: "Durum › Gerçek Zamanlı Grafikler", href: "#" },
    { title: "Sistem",                 crumb: "Sistem",      href: "#" },
    { title: "Yönetim",                crumb: "Sistem",      href: "#" },
    { title: "Yazılım",                crumb: "Sistem",      href: "#" },
    { title: "Başlangıç",              crumb: "Sistem",      href: "#" },
    { title: "Yedekleme / Yazılım Yükleme", crumb: "Sistem", href: "#" },
    { title: "Yeniden Başlat",         crumb: "Sistem",      href: "#" },
    { title: "Arayüzler",              crumb: "Ağ",          href: "settings.html" },
    { title: "Kablosuz",               crumb: "Ağ",          href: "#" },
    { title: "DHCP ve DNS",            crumb: "Ağ",          href: "#" },
    { title: "Tanılama",               crumb: "Ağ",          href: "#" },
    { title: "Güvenlik Duvarı",        crumb: "Ağ",          href: "#" },
    { title: "Dinamik DNS",            crumb: "Hizmetler",   href: "#" },
    { title: "UPnP IGD ve PCP",        crumb: "Hizmetler",   href: "#" },
    { title: "Ağ Paylaşımları",        crumb: "Hizmetler",   href: "#" },
    { title: "Çıkış",                  crumb: "",            href: "login.html" }
  ];

  var searchWrap = document.getElementById("gokce-search");
  var searchInput = document.getElementById("gokce-search-input");
  var searchResults = document.getElementById("gokce-search-results");
  var searchToggle = document.getElementById("search-toggle");

  if (searchWrap && searchInput && searchResults) {
    var INDEX = PAGES.map(function (p) {
      return {
        title: p.title,
        crumb: p.crumb,
        href: p.href,
        hay: (p.title + " " + p.crumb).toLowerCase()
      };
    });

    var active = -1;
    var shown = [];

    function openSearch() {
      searchWrap.hidden = false;
      searchInput.value = "";
      renderResults("");
      setTimeout(function () { searchInput.focus(); }, 0);
    }

    function closeSearch() {
      searchWrap.hidden = true;
      active = -1;
    }

    function renderResults(q) {
      q = (q || "").trim().toLowerCase();
      shown = q
        ? INDEX.filter(function (e) { return e.hay.indexOf(q) >= 0; }).slice(0, 20)
        : INDEX.slice(0, 20);
      active = shown.length ? 0 : -1;

      searchResults.innerHTML = "";
      if (!shown.length) {
        var empty = document.createElement("li");
        empty.className = "gokce-search__empty";
        empty.textContent = "Eşleşen sayfa yok";
        searchResults.appendChild(empty);
        return;
      }

      shown.forEach(function (entry, i) {
        var li = document.createElement("li");
        li.className = "gokce-search__result" + (i === active ? " is-active" : "");
        li.setAttribute("role", "option");

        var t = document.createElement("span");
        t.className = "gokce-search__result-title";
        t.textContent = entry.title;

        var c = document.createElement("span");
        c.className = "gokce-search__result-path";
        c.textContent = entry.crumb;

        li.appendChild(t);
        li.appendChild(c);

        li.addEventListener("click", function () { goTo(entry); });
        li.addEventListener("mousemove", function () {
          if (active === i) return;
          active = i;
          markActive();
        });
        searchResults.appendChild(li);
      });
    }

    function markActive() {
      var kids = searchResults.children;
      for (var i = 0; i < kids.length; i++)
        kids[i].classList.toggle("is-active", i === active);
      if (active >= 0 && kids[active])
        kids[active].scrollIntoView({ block: "nearest" });
    }

    function goTo(entry) {
      closeSearch();
      if (entry.href !== "#") location.href = entry.href;
    }

    if (searchToggle) searchToggle.addEventListener("click", openSearch);

    searchInput.addEventListener("input", function () {
      renderResults(searchInput.value);
    });

    searchInput.addEventListener("keydown", function (ev) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); if (shown.length) { active = (active + 1) % shown.length; markActive(); } }
      else if (ev.key === "ArrowUp") { ev.preventDefault(); if (shown.length) { active = (active - 1 + shown.length) % shown.length; markActive(); } }
      else if (ev.key === "Enter") { ev.preventDefault(); if (active >= 0 && shown[active]) goTo(shown[active]); }
      else if (ev.key === "Escape") { ev.preventDefault(); closeSearch(); }
    });

    searchWrap.addEventListener("click", function (ev) {
      if (ev.target.hasAttribute("data-search-close")) closeSearch();
    });

    document.addEventListener("keydown", function (ev) {
      if ((ev.ctrlKey || ev.metaKey) && (ev.key === "k" || ev.key === "K")) {
        ev.preventDefault();
        if (searchWrap.hidden) openSearch();
        else closeSearch();
      }
    });

    // Ekran görüntüsü yardımcısı: ?panel=search&q=...
    var sp = new URLSearchParams(location.search);
    if (sp.get("panel") === "search") {
      openSearch();
      var sq = sp.get("q");
      if (sq) { searchInput.value = sq; renderResults(sq); }
    }
  }

  // Ekran görüntüsü yardımcısı: ?panel=appearance
  if (new URLSearchParams(location.search).get("panel") === "appearance")
    openPanel();

  /* =====================================================================
     Trafik grafiği (Canvas — kütüphanesiz hafif çizim)
     ===================================================================== */
  // Grafik yalnızca panelde (index.html) var; ayar/login sayfalarında yok.
  var canvas = document.getElementById("traffic-chart");
  var ctx = canvas ? canvas.getContext("2d") : null;

  var POINTS = 40;          // grafikte tutulan örnek sayısı
  var MAX_MBPS = 120;       // dikey eksen üst sınırı
  var CHART_HEIGHT = 400;
  var downData = [];
  var upData = [];

  for (var i = 0; i < POINTS; i++) {
    downData.push(60 + Math.random() * 40);
    upData.push(8 + Math.random() * 10);
  }

  function cssVar(name) {
    return getComputedStyle(root).getPropertyValue(name).trim();
  }

  // "#rrggbb" değerini rgba() karşılığına çevir (degrade dolgu için)
  function hexToRgba(hex, alpha) {
    var v = hex.replace("#", "");
    if (v.length === 3) {
      v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    }
    var n = parseInt(v, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")";
  }

  function resizeCanvas() {
    // CSS genişliğine göre gerçek piksel çözünürlüğünü eşle (retina desteği)
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawSeries(data, color, w, h) {
    var stepX = w / (POINTS - 1);

    // Eğri çizgi (quadratic ara noktalarla yumuşatılmış)
    ctx.beginPath();
    data.forEach(function (value, idx) {
      var x = idx * stepX;
      var y = h - (value / MAX_MBPS) * h;
      if (idx === 0) {
        ctx.moveTo(x, y);
      } else {
        var prevX = (idx - 1) * stepX;
        var prevY = h - (data[idx - 1] / MAX_MBPS) * h;
        var midX = (prevX + x) / 2;
        ctx.quadraticCurveTo(prevX, prevY, midX, (prevY + y) / 2);
      }
    });
    // Son noktaya bağla
    ctx.lineTo(w, h - (data[POINTS - 1] / MAX_MBPS) * h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    ctx.stroke();

    // Çizgi altına dikey degrade dolgu
    var gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, hexToRgba(color, 0.22));
    gradient.addColorStop(1, hexToRgba(color, 0));

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function drawChart() {
    if (!ctx) return;

    var rect = canvas.getBoundingClientRect();
    var w = rect.width;
    var h = CHART_HEIGHT;

    ctx.clearRect(0, 0, w, h);

    // Yatay kılavuz çizgileri ve Mbps etiketleri
    ctx.strokeStyle = cssVar("--c-border") || "#e3e8f1";
    ctx.fillStyle = cssVar("--c-text-muted") || "#7c879c";
    ctx.font = "11px sans-serif";
    ctx.lineWidth = 1;

    for (var g = 0; g <= 4; g++) {
      var gy = (h / 4) * g;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(w, gy);
      ctx.stroke();

      var label = Math.round(MAX_MBPS - (MAX_MBPS / 4) * g);
      if (g < 4) ctx.fillText(label + " Mbps", 6, gy + 14);
    }

    drawSeries(downData, cssVar("--c-primary") || "#3b6ef5", w, h);
    drawSeries(upData, cssVar("--c-warning") || "#ef8c3b", w, h);
  }

  /* ---------------- Canlı veri simülasyonu ---------------- */
  var statDownload = document.getElementById("stat-download");
  var statUpload = document.getElementById("stat-upload");
  var cpuBar = document.getElementById("cpu-bar");
  var cpuValue = document.getElementById("cpu-value");
  var ramBar = document.getElementById("ram-bar");
  var ramValue = document.getElementById("ram-value");

  function nextValue(current, min, max, jitter) {
    var value = current + (Math.random() - 0.5) * jitter;
    return Math.min(max, Math.max(min, value));
  }

  function tick() {
    // Trafik: yeni örnek ekle, en eskisini at
    var newDown = nextValue(downData[POINTS - 1], 20, 115, 25);
    var newUp = nextValue(upData[POINTS - 1], 3, 30, 8);
    downData.push(newDown);
    downData.shift();
    upData.push(newUp);
    upData.shift();

    statDownload.textContent = newDown.toFixed(1);
    statUpload.textContent = newUp.toFixed(1);

    // CPU / RAM
    var cpu = Math.round(nextValue(parseInt(cpuValue.textContent, 10), 8, 95, 14));
    var ram = Math.round(nextValue(parseInt(ramValue.textContent, 10), 40, 85, 6));

    cpuValue.textContent = cpu + "%";
    cpuBar.style.width = cpu + "%";
    cpuBar.className = "progress__bar " +
      (cpu > 80 ? "progress__bar--danger" : "progress__bar--blue");

    ramValue.textContent = ram + "%";
    ramBar.style.width = ram + "%";

    drawChart();
  }

  /* ---------------- Çalışma süresi sayacı ---------------- */
  var uptimeEl = document.getElementById("uptime");
  var uptimeSeconds = 14 * 86400 + 6 * 3600 + 42 * 60 + 18;

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function renderUptime() {
    uptimeSeconds++;
    var days = Math.floor(uptimeSeconds / 86400);
    var hours = Math.floor((uptimeSeconds % 86400) / 3600);
    var mins = Math.floor((uptimeSeconds % 3600) / 60);
    var secs = uptimeSeconds % 60;
    uptimeEl.textContent = days + " gün " + pad(hours) + ":" + pad(mins) + ":" + pad(secs);
  }

  /* ---------------- Başlat ---------------- */
  if (canvas) {
    window.addEventListener("resize", function () {
      resizeCanvas();
      drawChart();
    });

    resizeCanvas();
    drawChart();

    setInterval(tick, 2000);       // trafik + sistem metrikleri
  }

  if (uptimeEl) {
    setInterval(renderUptime, 1000); // uptime saati
  }

  syncAppearance();
  syncFavToggle();

  // Ekran görüntüsü yardımcısı: ?fav=1 boş listede örnek favoriler ekler
  if (new URLSearchParams(location.search).get("fav") === "1" && !loadFavs().length) {
    saveFavs([
      { url: "index.html", title: "Genel Bakış" },
      { url: "settings.html", title: "Arayüzler" }
    ]);
  }
  renderFavorites();
})();
