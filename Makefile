#
# Copyright (C) 2026 Dursun Tokgoz
#
# This is free software, licensed under the Apache License, Version 2.0 .
#

include $(TOPDIR)/rules.mk

LUCI_TITLE:=Gökçe Theme
LUCI_DEPENDS:=+luci-base

PKG_LICENSE:=Apache-2.0
PKG_MAINTAINER:=Dursun Tokgoz <dursuntokgoz@users.noreply.github.com>

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
