'use strict';
'require baseclass';
'require ui';

/* Top-level admin menu entries are dynamic (any installed luci-app-* package
 * can contribute one), so this is a best-effort icon lookup by menu node
 * name with a generic fallback - not an exhaustive registry. */
var ICONS = {
	status: 'dashboard',
	system: 'settings',
	network: 'globe',
	services: 'layers',
	vpn: 'shield',
	firewall: 'shield'
};

function iconHtml(name) {
	var id = ICONS[name] || 'dot';
	return '<svg class="icon sidebar__icon"><use href="#gokce-icon-' + id + '"/></svg>';
}

var ROOT = document.documentElement;

function store(key, val) {
	try {
		if (val === null) localStorage.removeItem(key);
		else localStorage.setItem(key, val);
	} catch (e) {}
}

function load(key) {
	try { return localStorage.getItem(key); } catch (e) { return null; }
}

function prefersDark() {
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* Theme mode: 'auto' follows the OS (no stored override), 'light'/'dark'
   force it. The header pre-paint script reads the same key on next load. */
function currentMode() {
	var v = load('gokce-darkmode');
	return v === null ? 'auto' : (v === 'true' ? 'dark' : 'light');
}

function applyMode(mode) {
	if (mode === 'auto') {
		store('gokce-darkmode', null);
		ROOT.setAttribute('data-darkmode', prefersDark() ? 'true' : 'false');
	} else {
		var isDark = mode === 'dark';
		store('gokce-darkmode', isDark ? 'true' : 'false');
		ROOT.setAttribute('data-darkmode', isDark ? 'true' : 'false');
	}
}

function applyAccent(accent) {
	if (accent) ROOT.setAttribute('data-accent', accent);
	else ROOT.removeAttribute('data-accent');
	store('gokce-accent', accent || null);
}

function applyDensity(density) {
	if (density && density !== 'comfortable') ROOT.setAttribute('data-density', density);
	else ROOT.removeAttribute('data-density');
	store('gokce-density', (density && density !== 'comfortable') ? density : null);
}

return baseclass.extend({
	__init__() {
		this.initSidebarToggle();
		this.initThemeToggle();
		this.initAppearance();

		ui.menu.load().then((tree) => this.render(tree));
	},

	initSidebarToggle() {
		var app = document.getElementById('gokce-app');
		var toggle = document.getElementById('gokce-sidebar-toggle');
		var overlay = document.getElementById('gokce-overlay');
		var MOBILE_BREAKPOINT = 768;
		var STORE_KEY = 'gokce-sidebar-collapsed';

		if (!app || !toggle)
			return;

		function isMobile() {
			return window.innerWidth <= MOBILE_BREAKPOINT;
		}

		try {
			if (!isMobile() && localStorage.getItem(STORE_KEY) === 'true')
				app.classList.add('app--sidebar-collapsed');
		} catch (e) {}

		toggle.addEventListener('click', function () {
			if (isMobile()) {
				app.classList.toggle('app--sidebar-open');
				return;
			}

			var collapsed = app.classList.toggle('app--sidebar-collapsed');
			try { localStorage.setItem(STORE_KEY, collapsed ? 'true' : 'false'); } catch (e) {}
		});

		if (overlay) {
			overlay.addEventListener('click', function () {
				app.classList.remove('app--sidebar-open');
			});
		}

		window.addEventListener('resize', function () {
			if (isMobile())
				app.classList.remove('app--sidebar-collapsed');
			else
				app.classList.remove('app--sidebar-open');
		});
	},

	initThemeToggle() {
		var self = this;
		var toggle = document.getElementById('gokce-theme-toggle');

		if (!toggle)
			return;

		/* Quick sun/moon toggle: flip to the opposite explicit mode and keep
		   the appearance panel's segmented control in sync. */
		toggle.addEventListener('click', function () {
			var isDark = ROOT.getAttribute('data-darkmode') === 'true';
			applyMode(isDark ? 'light' : 'dark');
			self.syncAppearance();
		});
	},

	/* Appearance panel: theme mode / accent color / density, all persisted.
	   Everything degrades gracefully - if the panel markup is absent (older
	   cached header), the quick toggle above still works. */
	initAppearance() {
		var self = this;
		var wrap = document.getElementById('gokce-appearance');
		var toggle = document.getElementById('gokce-appearance-toggle');
		var panel = document.getElementById('gokce-appearance-panel');

		if (!wrap || !toggle || !panel)
			return;

		function openPanel() {
			panel.hidden = false;
			toggle.setAttribute('aria-expanded', 'true');
			self.syncAppearance();
			document.addEventListener('click', onOutside, true);
			document.addEventListener('keydown', onKey);
		}

		function closePanel() {
			panel.hidden = true;
			toggle.setAttribute('aria-expanded', 'false');
			document.removeEventListener('click', onOutside, true);
			document.removeEventListener('keydown', onKey);
		}

		function onOutside(ev) {
			if (!wrap.contains(ev.target)) closePanel();
		}

		function onKey(ev) {
			if (ev.key === 'Escape') { closePanel(); toggle.focus(); }
		}

		toggle.addEventListener('click', function (ev) {
			ev.stopPropagation();
			if (panel.hidden) openPanel();
			else closePanel();
		});

		var modeSeg = document.getElementById('gokce-mode-seg');
		if (modeSeg) modeSeg.addEventListener('click', function (ev) {
			var btn = ev.target.closest('[data-mode]');
			if (!btn) return;
			applyMode(btn.getAttribute('data-mode'));
			self.syncAppearance();
		});

		var accentList = document.getElementById('gokce-accent-list');
		if (accentList) accentList.addEventListener('click', function (ev) {
			var btn = ev.target.closest('[data-accent]');
			if (!btn) return;
			applyAccent(btn.getAttribute('data-accent'));
			self.syncAppearance();
		});

		var densitySeg = document.getElementById('gokce-density-seg');
		if (densitySeg) densitySeg.addEventListener('click', function (ev) {
			var btn = ev.target.closest('[data-density]');
			if (!btn) return;
			applyDensity(btn.getAttribute('data-density'));
			self.syncAppearance();
		});
	},

	/* Reflect the current state onto the panel controls (active markers). */
	syncAppearance() {
		var mode = currentMode();
		var accent = load('gokce-accent') || 'blue';
		var density = load('gokce-density') || 'comfortable';

		document.querySelectorAll('#gokce-mode-seg [data-mode]').forEach(function (b) {
			b.classList.toggle('is-active', b.getAttribute('data-mode') === mode);
		});
		document.querySelectorAll('#gokce-accent-list [data-accent]').forEach(function (b) {
			b.classList.toggle('is-active', b.getAttribute('data-accent') === accent);
		});
		document.querySelectorAll('#gokce-density-seg [data-density]').forEach(function (b) {
			b.classList.toggle('is-active', b.getAttribute('data-density') === density);
		});
	},

	render(tree) {
		let node = tree;
		let url = '';

		this.renderModeMenu(tree);

		if (L.env.dispatchpath.length >= 3) {
			for (var i = 0; i < 3 && node; i++) {
				node = node.children[L.env.dispatchpath[i]];
				url = url + (url ? '/' : '') + L.env.dispatchpath[i];
			}

			if (node)
				this.renderTabMenu(node, url);
		}
	},

	/* Unchanged from upstream menu-bootstrap.js: renders the sub-tabs of the
	 * currently active top-level section into #tabmenu, at the top of the
	 * content area. */
	renderTabMenu(tree, url, level) {
		const container = document.querySelector('#tabmenu');
		const ul = E('ul', { 'class': 'tabs' });
		const children = ui.menu.getChildren(tree);
		let activeNode = null;

		children.forEach(child => {
			const isActive = (L.env.dispatchpath[3 + (level || 0)] == child.name);
			const activeClass = isActive ? ' active' : '';
			const className = 'tabmenu-item-%s %s'.format(child.name, activeClass);

			ul.appendChild(E('li', { 'class': className }, [
				E('a', { 'href': L.url(url, child.name) }, [ _(child.title) ] )]));

			if (isActive)
				activeNode = child;
		});

		if (ul.children.length == 0)
			return E([]);

		container.appendChild(ul);
		container.style.display = '';

		if (activeNode)
			this.renderTabMenu(activeNode, url + '/' + activeNode.name, (level || 0) + 1);

		return ul;
	},

	/* Replaces upstream's renderMainMenu(): instead of a horizontal top-nav
	 * with dropdowns, renders the same two menu levels as a vertical sidebar -
	 * top-level sections become accordion groups holding their second-level
	 * pages. Levels three and up stay in #tabmenu (see above), matching how
	 * far bootstrap's dropdown nav descends. */
	renderSidebarMenu(tree, url) {
		const container = document.querySelector('#sidebar-menu');
		const children = ui.menu.getChildren(tree);
		const activeName = L.env.dispatchpath[1];
		const activeSub = L.env.dispatchpath[2];

		if (!container)
			return;

		const setOpen = (group, open) => {
			const submenu = group.querySelector('.sidebar__submenu');
			group.classList.toggle('sidebar__group--open', open);
			submenu.style.maxHeight = open ? submenu.scrollHeight + 'px' : '';
		};

		children.forEach(child => {
			const isActive = activeName === child.name;
			const sub = ui.menu.getChildren(child);

			/* Leaf entries (e.g. Logout) stay plain links */
			if (sub.length == 0) {
				const link = E('a', {
					'href': L.url(url, child.name),
					'class': 'sidebar__item' + (isActive ? ' sidebar__item--active' : '')
				}, [ E('span', { 'class': 'sidebar__label' }, [ _(child.title) ]) ]);

				link.insertAdjacentHTML('afterbegin', iconHtml(child.name));
				container.appendChild(link);
				return;
			}

			const toggle = E('button', {
				'type': 'button',
				'class': 'sidebar__item sidebar__item--toggle' + (isActive ? ' sidebar__item--active' : '')
			}, [ E('span', { 'class': 'sidebar__label' }, [ _(child.title) ]) ]);

			toggle.insertAdjacentHTML('afterbegin', iconHtml(child.name));
			toggle.insertAdjacentHTML('beforeend',
				'<svg class="icon sidebar__chevron"><use href="#gokce-icon-chevron"/></svg>');

			const submenu = E('div', { 'class': 'sidebar__submenu' },
				sub.map(s => E('a', {
					'href': L.url(url, child.name, s.name),
					'class': 'sidebar__subitem' +
						((isActive && activeSub === s.name) ? ' sidebar__subitem--active' : '')
				}, [ _(s.title) ])));

			const group = E('div', { 'class': 'sidebar__group' }, [ toggle, submenu ]);

			toggle.addEventListener('click', () => {
				const app = document.getElementById('gokce-app');

				/* In icon-only mode, first expand the sidebar so labels and
				 * the submenu have room, then open the clicked group */
				if (app && app.classList.contains('app--sidebar-collapsed')) {
					app.classList.remove('app--sidebar-collapsed');
					try { localStorage.setItem('gokce-sidebar-collapsed', 'false'); } catch (e) {}
					setOpen(group, true);
					return;
				}

				const willOpen = !group.classList.contains('sidebar__group--open');

				/* Accordion: only one group open at a time */
				container.querySelectorAll('.sidebar__group--open').forEach(other => {
					if (other !== group) setOpen(other, false);
				});

				setOpen(group, willOpen);
			});

			container.appendChild(group);

			/* The section being viewed starts expanded */
			if (isActive)
				setOpen(group, true);
		});
	},

	/* Unchanged from upstream menu-bootstrap.js. Targets #modemenu, only
	 * shown when more than one top-level admin index tree is registered
	 * (rare in practice). */
	renderModeMenu(tree) {
		const ul = document.querySelector('#modemenu');
		const children = ui.menu.getChildren(tree);

		children.forEach((child, index) => {
			const isActive = L.env.requestpath.length
				? child.name === L.env.requestpath[0]
				: index === 0;

			ul.appendChild(E('li', { 'class': isActive ? 'active' : '' }, [
				E('a', { 'href': L.url(child.name) }, [ _(child.title) ])
			]));

			if (isActive)
				this.renderSidebarMenu(child, child.name);
		});

		if (ul.children.length > 1)
			ul.style.display = '';
	}
});
