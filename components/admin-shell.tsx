"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AppShell, Avatar, Box, Burger, Center, Divider, Group, Loader, ScrollArea, Stack, Text, Tooltip, UnstyledButton } from "@mantine/core";
import { IconAutomation, IconCashBanknote, IconFileInvoice, IconGift, IconLayoutDashboard, IconLogout, IconMail, IconMessageReport, IconReceipt, IconSchool, IconSettingsDollar, IconUsers, IconUsersGroup, IconWallet, type Icon } from "@tabler/icons-react";
import { defaultAdminRoute, hasAnyRole, primaryRole, ROLE_LABELS, type AdminRole } from "@/lib/admin-access";
import { getAdminSession, logoutAdmin } from "@/lib/auth-api";
import { useAuthStore } from "@/store/auth";
import naoFullDark from "@/public/images/logo/nao_full_dark.png";
import naoIconDark from "@/public/images/logo/nao_icon_dark.png";

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  group: string;
  roles: readonly AdminRole[];
};

const STAFF_ROLES = ["superadmin", "admin"] as const;

const NAV_ITEMS: NavItem[] = [
  { href: "/members", label: "Member", icon: IconUsers, group: "KOMUNITAS", roles: STAFF_ROLES },
  { href: "/finance", label: "Ringkasan Finance", icon: IconWallet, group: "FINANCE", roles: ["superadmin"] },
  { href: "/finance/income", label: "Pemasukan", icon: IconCashBanknote, group: "FINANCE", roles: ["superadmin"] },
  { href: "/finance/expenses", label: "Pengeluaran", icon: IconReceipt, group: "FINANCE", roles: ["superadmin"] },
  { href: "/finance/payroll", label: "Payroll & Slip Gaji", icon: IconFileInvoice, group: "FINANCE", roles: ["superadmin"] },
  { href: "/finance/doku-fees", label: "Tarif DOKU", icon: IconSettingsDollar, group: "FINANCE", roles: ["superadmin"] },
  { href: "/finance/expense-automation", label: "Otomasi Pengeluaran", icon: IconAutomation, group: "FINANCE", roles: ["superadmin"] },
  { href: "/staff", label: "Karyawan & Guru", icon: IconUsersGroup, group: "TIM", roles: ["superadmin", "admin"] },
  { href: "/announcements/banners", label: "Banner Pengumuman", icon: IconLayoutDashboard, group: "KONTEN", roles: STAFF_ROLES },
  { href: "/referrals", label: "Kode Referral", icon: IconGift, group: "KONTEN", roles: STAFF_ROLES },
  { href: "/emails", label: "Email Pengumuman", icon: IconMail, group: "KOMUNIKASI", roles: STAFF_ROLES },
  { href: "/learning/questions", label: "Ekstraktor Soal", icon: IconSchool, group: "PEMBELAJARAN", roles: ["superadmin", "admin", "teacher"] },
  { href: "/learning/question-reports", label: "Laporan Soal", icon: IconMessageReport, group: "PEMBELAJARAN", roles: ["superadmin", "admin", "teacher"] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useAuthStore((state) => state.session);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mobileOpened, setMobileOpened] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => session && hasAnyRole(session.roles, item.roles)),
    [session],
  );

  useEffect(() => {
    let active = true;
    getAdminSession()
      .then((verifiedSession) => {
        if (!active) return;
        setSession(verifiedSession);
        const canOpenRoute = NAV_ITEMS.some(
          (item) => pathname.startsWith(item.href) && hasAnyRole(verifiedSession.roles, item.roles),
        );
        if (!canOpenRoute) window.location.replace(defaultAdminRoute(verifiedSession.roles));
      })
      .catch(() => {
        if (!active) return;
        clearSession();
        window.location.replace("/login");
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => { active = false; };
  }, [clearSession, pathname, setSession]);

  if (checkingSession || !session) {
    return <Center mih="100vh"><Loader color="yellow" aria-label="Memeriksa sesi admin" /></Center>;
  }

  const canOpenCurrentRoute = visibleItems.some((item) => pathname.startsWith(item.href));
  if (!canOpenCurrentRoute) {
    return <Center mih="100vh"><Loader color="yellow" aria-label="Mengalihkan ke halaman yang dapat diakses" /></Center>;
  }

  const isActive = (href: string) => href === "/finance" ? pathname === href : pathname.startsWith(href);
  const current = [...visibleItems].sort((a, b) => b.href.length - a.href.length).find((item) => isActive(item.href));
  const role = primaryRole(session.roles);
  const initials = session.user.full_name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const navigate = (href: string) => { router.push(href); setMobileOpened(false); };
  const handleLogout = async () => {
    await logoutAdmin().catch(() => undefined);
    clearSession();
    router.replace("/login");
  };

  const navbar = <Stack h="100%" gap={0}><Box className="brand-box"><Image src={collapsed ? naoIconDark : naoFullDark} alt="NAO Group" width={collapsed ? 42 : 150} height={50} className="brand-logo" priority unoptimized /></Box><ScrollArea flex={1} px={collapsed ? 10 : 14} py="lg">{Array.from(new Set(visibleItems.map((item) => item.group))).map((group) => <Box key={group} mb="lg">{!collapsed && <Text className="nav-group-label">{group}</Text>}<Stack gap={5}>{visibleItems.filter((item) => item.group === group).map((item) => { const IconComponent = item.icon; const active = isActive(item.href); const button = <UnstyledButton key={item.href} className="nav-item" data-active={active || undefined} data-collapsed={collapsed || undefined} onClick={() => navigate(item.href)} aria-current={active ? "page" : undefined}><IconComponent size={19} stroke={1.7} aria-hidden="true" />{!collapsed && <span>{item.label}</span>}</UnstyledButton>; return collapsed ? <Tooltip key={item.href} label={item.label} position="right">{button}</Tooltip> : button; })}</Stack></Box>)}</ScrollArea><Box p={collapsed ? 10 : 14}><UnstyledButton className="nav-item logout-item" data-collapsed={collapsed || undefined} onClick={handleLogout}><IconLogout size={19} aria-hidden="true" />{!collapsed && <span>Keluar</span>}</UnstyledButton></Box></Stack>;

  return <AppShell header={{ height: 76 }} navbar={{ width: collapsed ? 78 : 250, breakpoint: "sm", collapsed: { mobile: !mobileOpened } }} padding={0}><AppShell.Header className="app-header"><Group h="100%" wrap="nowrap" gap={0}><Group className="header-brand-zone" w={{ base: "auto", sm: collapsed ? 78 : 250 }} px={{ base: "md", sm: collapsed ? 18 : 22 }}><Burger hiddenFrom="sm" opened={mobileOpened} onClick={() => setMobileOpened((value) => !value)} size="sm" aria-label={mobileOpened ? "Close navigation" : "Open navigation"} /><UnstyledButton visibleFrom="sm" onClick={() => setCollapsed((value) => !value)} aria-label="Toggle sidebar"><Image src={collapsed ? naoIconDark : naoFullDark} alt="NAO Group" width={collapsed ? 40 : 145} height={48} className="header-logo" priority unoptimized /></UnstyledButton></Group><Group flex={1} px={{ base: "md", sm: "xl" }} justify="space-between" wrap="nowrap"><Box><Text size="sm" fw={600} c="#0f172a">{current?.label ?? "Admin"}</Text><Text size="xs" c="dimmed" visibleFrom="xs">NAO Group Admin</Text></Box><Group gap="sm"><Divider orientation="vertical" h={35} /><Avatar src={session.user.avatar_url} color="yellow" radius="xl">{initials}</Avatar><Box visibleFrom="sm"><Text size="sm" fw={600}>{session.user.full_name}</Text><Text size="xs" c="dimmed">{ROLE_LABELS[role]}</Text></Box></Group></Group></Group></AppShell.Header><AppShell.Navbar className="app-navbar">{navbar}</AppShell.Navbar><AppShell.Main className="app-main"><Box className="content-wrap">{children}</Box></AppShell.Main></AppShell>;
}
