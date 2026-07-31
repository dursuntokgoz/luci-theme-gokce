#
# Copyright (C) 2026 Dursun Tokgöz
#
# Licensed under the Gökçe Theme License v1.0 (source-available; footer
# attribution must be preserved, fork-only redistribution). Portions derived
# from luci-theme-bootstrap remain under Apache-2.0. See LICENSE and NOTICE.
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Gökçe Theme
LUCI_DEPENDS:=+luci-base
LUCI_PKGARCH:=all

PKG_LICENSE:=LicenseRef-Gokce-Theme-License-1.0 AND Apache-2.0
PKG_LICENSE_FILES:=LICENSE NOTICE
PKG_MAINTAINER:=Dursun Tokgöz <dursuntokgoz@users.noreply.github.com>

define Package/luci-theme-gokce/postrm
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
	uci -q delete luci.themes.Gokce
	uci -q delete luci.themes.GokceDark
	uci -q delete luci.themes.GokceLight
	uci commit luci
}
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
