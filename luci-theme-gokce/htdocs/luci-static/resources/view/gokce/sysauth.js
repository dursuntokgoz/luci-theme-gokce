'use strict';
'require ui';
'require view';

/* Copied verbatim from luci-theme-bootstrap's view/bootstrap/sysauth.js
 * (LuCI project, Apache-2.0). This view is theme-agnostic - it just moves
 * the static login <section> into a modal dialog - but it ships inside the
 * bootstrap theme, not luci-base, so a theme that only depends on luci-base
 * must provide its own copy. sysauth.ut references it as 'gokce.sysauth'. */
return view.extend({
	render() {
		const form = document.querySelector('form');
		const btn = document.querySelector('button');

		const dlg = ui.showModal(
			_('Authorization Required'),
			Array.from(document.querySelectorAll('section > *')),
			'login'
		);

		form.addEventListener('keypress', (ev) => {
			if (ev.key === 'Enter')
				btn.click();
		});

		btn.addEventListener('click', () => {
			dlg.querySelectorAll('*').forEach((node) => {
				node.style.display = 'none';
			});
			dlg.appendChild(E('div', {
				class: 'spinning'
			}, _('Logging in…')));

			form.submit();
		});

		document.querySelector('input[type="password"]').focus();

		return '';
	},

	addFooter() {},

});
