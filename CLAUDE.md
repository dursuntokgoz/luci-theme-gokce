# CLAUDE.md — Project state & handoff

This file is auto-loaded by Claude Code when the repo is opened. It captures
everything needed to resume work on this project from any machine. Keep it
updated as the project moves.

## What this project is

`luci-theme-gokce` — a modern, collapsible-**left-sidebar** LuCI theme for
OpenWrt with Auto/Dark/Light modes, inspired by the clean look of Keenetic
router UIs. Repo: <https://github.com/dursuntokgoz/luci-theme-gokce>.

The design started as a standalone HTML/CSS/JS prototype (in `demo/`), which
was then turned into a real LuCI theme package. The demo is kept in sync as a
no-router-needed showcase and is the source of the README screenshots.

## Hard-won facts (do not re-learn these)

- **Target: OpenWrt 25.12** (verified real; latest point release was 25.12.5
  as of 2026-07). Also builds against `SNAPSHOT`. Branches `openwrt-24.10` /
  `openwrt-23.05` exist if wider compatibility is ever needed.
- **LuCI is ucode-based now, not Lua.** No `luasrc/`. Templates are ucode
  `.ut` files (`{% %}` control, `{{ }}` output, `{# #}` comments) installed to
  `/usr/share/ucode/luci/`. `htdocs/` → `/www/`, `root/` → `/`.
- **Theme registration is done by `root/etc/uci-defaults/30_luci-theme-gokce`**,
  writing `luci.themes.Gokce* = /luci-static/gokce*` into `/etc/config/luci`.
  There is no postinst theme scanner. Three entries: `Gokce` (Auto, follows OS
  dark/light), `GokceDark`, `GokceLight`.
- **Package must live in a subdirectory** (`luci-theme-gokce/`), NOT the repo
  root. `gh-action-sdk` links the whole repo as one feed via `src-link`, and
  OpenWrt's feed scanner only finds packages one level below a feed root.
  A Makefile at the repo root is invisible → "no rule to make target
  package/luci-theme-gokce/download".
- **Use `openwrt/gh-action-sdk@v11`** (not `@v1` — that pins an ancient commit
  whose entrypoint expects `/home/build/openwrt/`, which current SDK images
  don't have; every build fails with `cd: /home/build/openwrt/: No such file`).
- **Package is `arch=all`** (`LUCI_PKGARCH:=all`; no compiled code). Every
  matrix combo therefore produces a byte-identical package with the SAME
  filename → uploading all of them to a Release collides on the asset name and
  only one survives. The release job publishes ONE canonical build
  (`openwrt-25.12/x86_64`), renamed to `luci-theme-gokce-<tag>.apk`.
- **The login screen needs theme-local support.** `sysauth.ut`'s
  `ui.instantiateView('gokce.sysauth')` needs `htdocs/.../view/gokce/sysauth.js`
  (a copy of bootstrap's — it ships per-theme, not in luci-base). The login
  form renders inside `ui.showModal(..., 'login')`, so `cascade.css` MUST have
  `.modal` / `#modal_overlay` styles — these also cover every other LuCI dialog
  (Save & Apply, uploads, confirms). Both were initially missing and would have
  broken login on any device without luci-theme-bootstrap also installed.
- **Line endings:** `.gitattributes` forces `eol=lf` (SVG/PNG binary). The
  `uci-defaults` shell script would break under busybox ash if it got CRLF.

## Repo layout

```
luci-theme-gokce/                 # the actual OpenWrt package (feed subdir)
├── Makefile                      # LUCI_TITLE, +luci-base, LUCI_PKGARCH:=all, postrm cleanup
├── root/etc/uci-defaults/30_luci-theme-gokce   # registers the 3 theme entries
├── ucode/template/themes/gokce/  # header.ut, footer.ut, sysauth.ut
└── htdocs/luci-static/
    ├── gokce/                    # cascade.css (the whole theme) + logo.svg
    ├── gokce-dark/  gokce-light/ # one-line @import of ../gokce/cascade.css
    └── resources/
        ├── menu-gokce.js         # sidebar renderer + toggle/theme/accordion JS
        └── view/gokce/sysauth.js # login modal view (per-theme, not luci-base)
demo/                             # standalone HTML prototype (mirrors the theme)
│   ├── index.html                #   dashboard (cards + live traffic chart)
│   ├── settings.html             #   config sub-page (CBI form: tabs/rows/table/page-actions)
│   ├── login.html                #   pre-auth login modal
│   ├── css/style.css             #   demo's own stylesheet (--c-* tokens; incl. CBI/modal)
│   └── js/script.js              #   sidebar/theme/accordion/tabs + chart (all guarded)
docs/                             # README screenshots: dashboard, settings, login (light+dark)
.github/workflows/build.yml       # CI: build matrix + tag-triggered release
```

## Architecture notes

- **Sidebar** is built at runtime by `menu-gokce.js` from LuCI's real dynamic
  admin menu tree (`ui.menu.load()`), not a hardcoded list. It renders TWO
  levels: top sections become accordion groups (one open at a time, active
  section pre-expanded) holding their second-level pages; level 3+ stays in the
  `#tabmenu` horizontal tab bar (same depth as bootstrap's dropdown nav). Leaf
  entries (e.g. Logout) stay plain links. `renderModeMenu`/`renderTabMenu` are
  kept verbatim from upstream `menu-bootstrap.js`; only `renderMainMenu` was
  replaced by `renderSidebarMenu`.
- **Icons** are inline SVG symbols in `header.ut` (no FontAwesome/CDN — must
  work offline on the router). Sidebar icons are looked up by top-level menu
  node name (`status/system/network/services/vpn/firewall`), generic dot icon
  otherwise.
- **Dark mode:** `header.ut` sets `data-darkmode` on `<html>` before CSS loads
  (no FOUC). `Gokce`/Auto reads OS pref + a `localStorage` override toggled by
  the header sun/moon button; `GokceDark`/`GokceLight` force it. `cascade.css`
  drives everything from CSS custom properties under `:root` and
  `:root[data-darkmode="true"]`.
- **CBI styling in `cascade.css`** targets LuCI's REAL generated classes
  (verified against upstream, don't guess): `.cbi-value` (flex row, 200px title
  + growing field), `.table/.tr/.td` (classic `display:table`, not grid/flex),
  `.cbi-dropdown` (custom `<ul>` widget, opens via `[open]` attribute),
  `.cbi-page-actions` (NOT sticky), `.tabs/.cbi-tabmenu`, `.alert-message`,
  `.spinning` (SVG-animated, not CSS keyframes), custom checkbox/radio.

## Environment / how to resume on a new machine

- Clone the repo; opening Claude Code here auto-loads this file.
- **git identity for this repo:** `user.name=dursuntokgoz`,
  `user.email=dursuntokgoz@users.noreply.github.com` (set locally per-repo).
- **GitHub CLI (`gh`)** is used to inspect CI. On Windows it lives at
  `/c/Program Files/GitHub CLI` — prepend it to PATH in each Bash call:
  `export PATH="/c/Program Files/GitHub CLI:$PATH"`. Auth via
  `gh auth login --web -h github.com` (device flow; user completes in browser).
  If a `gh` call returns "Bad credentials" mid-run it's usually a transient
  keyring read — re-run. `git push` occasionally returns "Empty reply from
  server" here too; just retry.
- **Screenshots** use headless Edge:
  `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new
  --disable-gpu --window-size=1600,1000 --hide-scrollbars --screenshot=OUT URL`.
  The demo accepts `?theme=dark|light` to force the mode for reproducible shots.

## CI / release flow

- `.github/workflows/build.yml`: on push/PR/manual, builds the matrix
  `arch ∈ {x86_64, aarch64_generic, arm_cortex-a7} × sdk ∈ {openwrt-25.12,
  SNAPSHOT}` (6 jobs) and uploads each as an artifact. ARM arches are for
  explicit device coverage even though the package is arch-independent.
- **Releasing:** push a `v*` tag. The `release` job (guarded by
  `refs/tags/v`) downloads the canonical artifact, renames it
  `luci-theme-gokce-<tag>.apk`, and attaches it to a GitHub Release.
  To cut a release: `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`.

## Commit history so far

1. `ba2f43e` Initial theme package + demo + CI
2. `db56850` ci: gh-action-sdk @v1 → @v11
3. `c512f54` fix: nest package under luci-theme-gokce/ (+ ARM matrix)
4. `7cfecdc` ci: publish only the canonical artifact
5. `8e88b03` feat: sidebar accordion submenus; PKGARCH; tag-named asset
6. `06dc577` docs: demo mirrors LuCI; README screenshots
7. `e501691` fix: standalone login (view JS + modal CSS)

`v1.0.0` tag exists (was cut mid-development to test the release job).

## Current state & next steps

- All 6 CI build combos are GREEN on `main`. The theme is feature-complete
  for a first real release: sidebar+accordion, 3 themes + header toggle,
  full CBI restyle, working login/modal, ARM/x86 builds.
- **NOT yet done: live test on a real OpenWrt 25.12 device/VM.** All CSS for
  CBI pages, the `.cbi-dropdown` widget, div-tables, and the login modal was
  written against upstream's selector structure and verified only via static
  screenshots — never seen on actual running LuCI pages. This is the #1
  remaining task before trusting v1.1.0.
- **Then: cut `v1.1.0`** (sidebar accordion + login fix + modal support) once
  the live test passes. Replace the demo-based README screenshots with real
  in-LuCI ones if desired.
- Possible later work: nested sidebar for level-3 nav; richer icon set;
  submitting upstream to the `openwrt/luci` `themes/` tree.

## Known limitations

- Sidebar shows 2 menu levels; level-3 nav stays as a horizontal tab bar.
- Icon set only covers well-known sections; other `luci-app-*` get a dot.
