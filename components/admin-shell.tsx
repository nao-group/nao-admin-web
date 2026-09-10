"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { ActionIcon, AppShell, Avatar, Box, Burger, Divider, Group, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconBell, IconChevronDown, IconCreditCard, IconGift, IconLayoutDashboard, IconLogout, IconMail, IconUsers } from "@tabler/icons-react";
import { useAuthStore } from "@/store/auth";

const NAV_ITEMS = [
  { href: "/members", label: "Members", icon: IconUsers, group: "OVERVIEW" },
  { href: "/payments", label: "Payments", icon: IconCreditCard, group: "FINANCE" },
  { href: "/announcements/banners", label: "Announcement Banner", icon: IconLayoutDashboard, group: "CONTENT" },
  { href: "/referrals", label: "Referral Codes", icon: IconGift, group: "CONTENT" },
  { href: "/emails", label: "Announcement Email", icon: IconMail, group: "COMMUNICATION" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const authenticated = useAuthStore((state) => state.authenticated);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);
  const [mobileOpened, setMobileOpened] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (hydrated && !authenticated) router.replace("/login");
  }, [authenticated, hydrated, router]);

  if (!hydrated || !authenticated) return null;

  const current = NAV_ITEMS.find((item) => pathname.startsWith(item.href));
  const navigate = (href: string) => { router.push(href); setMobileOpened(false); };
  const navbar = <Stack h="100%" gap={0}><Box className="brand-box"><Image src={collapsed ? "/images/logo/nao_icon_dark.png" : "/images/logo/nao_full_dark.png"} alt="NAO Group" width={collapsed ? 42 : 150} height={50} className="brand-logo" /></Box><ScrollArea flex={1} px={collapsed ? 10 : 14} py="lg">{Array.from(new Set(NAV_ITEMS.map((item) => item.group))).map((group) => <Box key={group} mb="lg">{!collapsed && <Text className="nav-group-label">{group}</Text>}<Stack gap={5}>{NAV_ITEMS.filter((item) => item.group === group).map((item) => { const Icon = item.icon; const active = pathname.startsWith(item.href); const button = <UnstyledButton key={item.href} className="nav-item" data-active={active || undefined} data-collapsed={collapsed || undefined} onClick={() => navigate(item.href)} aria-current={active ? "page" : undefined}><Icon size={19} stroke={1.7} aria-hidden="true" />{!collapsed && <span>{item.label}</span>}</UnstyledButton>; return collapsed ? <Tooltip key={item.href} label={item.label} position="right">{button}</Tooltip> : button; })}</Stack></Box>)}</ScrollArea><Box p={collapsed ? 10 : 14}><UnstyledButton className="nav-item logout-item" data-collapsed={collapsed || undefined} onClick={() => { logout(); router.replace("/login"); }}><IconLogout size={19} aria-hidden="true" />{!collapsed && <span>Sign out</span>}</UnstyledButton></Box></Stack>;

  return <AppShell header={{ height: 76 }} navbar={{ width: collapsed ? 78 : 250, breakpoint: "sm", collapsed: { mobile: !mobileOpened } }} padding={0}><AppShell.Header className="app-header"><Group h="100%" wrap="nowrap" gap={0}><Group className="header-brand-zone" w={{ base: "auto", sm: collapsed ? 78 : 250 }} px={{ base: "md", sm: collapsed ? 18 : 22 }}><Burger hiddenFrom="sm" opened={mobileOpened} onClick={() => setMobileOpened((value) => !value)} size="sm" aria-label={mobileOpened ? "Close navigation" : "Open navigation"} /><UnstyledButton visibleFrom="sm" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar"><Image src={collapsed ? "/images/logo/nao_icon_dark.png" : "/images/logo/nao_full_dark.png"} alt="NAO Group" width={collapsed ? 40 : 145} height={48} className="header-logo" /></UnstyledButton></Group><Group flex={1} px={{ base: "md", sm: "xl" }} justify="space-between" wrap="nowrap"><Box><Text size="sm" fw={600} c="#0f172a">{current?.label ?? "Admin"}</Text><Text size="xs" c="dimmed" visibleFrom="xs">NAO Group Admin</Text></Box><Group gap="sm"><ActionIcon variant="subtle" color="dark" size="lg" aria-label="Notifications"><IconBell size={19} /></ActionIcon><Divider orientation="vertical" h={28} /><Avatar color="yellow" radius="xl">A</Avatar><Box visibleFrom="sm"><Text size="sm" fw={600}>Admin NAO</Text><Text size="xs" c="dimmed">Super admin</Text></Box><IconChevronDown size={15} aria-hidden="true" /></Group></Group></Group></AppShell.Header><AppShell.Navbar className="app-navbar">{navbar}</AppShell.Navbar><AppShell.Main className="app-main"><Box className="content-wrap">{children}</Box></AppShell.Main></AppShell>;
}
