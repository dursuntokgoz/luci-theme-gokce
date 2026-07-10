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

function setDarkMode(isDark) {
	document.documentElement.setAttribute('data-darkmode', isDark ? 'true' : 'false');
	try { localStorage.setItem('gokce-darkmode', isDark ? 'true' : 'false'); } catch (e) {}
}

return baseclass.extend({
	__init__() {
		this.initSidebarToggle();
		this.initThemeToggle();

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
		var toggle = document.getElementById('gokce-theme-toggle');

		if (!toggle)
			return;

		toggle.addEventListener('click', function () {
			var isDark = document.documentElement.getAttribute('data-darkmode') === 'true';
			setDarkMode(!isDark);
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
	 * dropdown, renders the top-level admin sections as the vertical sidebar
	 * list. Only one level deep - deeper levels stay in #tabmenu (see above). */
	renderSidebarMenu(tree) {
		const container = document.querySelector('#sidebar-menu');
		const children = ui.menu.getChildren(tree);
		const activeName = L.env.dispatchpath[1];

		if (!container)
			return;

		children.forEach(child => {
			const isActive = activeName === child.name;
			const className = 'sidebar__item' + (isActive ? ' sidebar__item--active' : '');

			const link = E('a', { 'href': L.url(child.name), 'class': className }, [
				E('span', { 'class': 'sidebar__label' }, [ _(child.title) ])
			]);

			link.insertAdjacentHTML('afterbegin', iconHtml(child.name));
			container.appendChild(link);
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
				this.renderSidebarMenu(child);
		});

		if (ul.children.length > 1)
			ul.style.display = '';
	}
});
