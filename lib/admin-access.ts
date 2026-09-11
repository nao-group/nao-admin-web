export const ADMIN_ROLES = ["superadmin", "admin", "teacher"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminUser = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
};

export type AdminSession = {
  user: AdminUser;
  roles: AdminRole[];
  permissions: string[];
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  teacher: "Teacher",
};

const ROLE_PRIORITY: AdminRole[] = ["superadmin", "admin", "teacher"];

export function isAdminRole(value: string): value is AdminRole {
  return ADMIN_ROLES.includes(value as AdminRole);
}

export function primaryRole(roles: AdminRole[]): AdminRole {
  return ROLE_PRIORITY.find((role) => roles.includes(role)) ?? "teacher";
}

export function defaultAdminRoute(roles: AdminRole[]): string {
  return primaryRole(roles) === "teacher" ? "/learning" : "/members";
}

export function hasAnyRole(
  userRoles: AdminRole[],
  allowedRoles: readonly AdminRole[],
): boolean {
  return userRoles.some((role) => allowedRoles.includes(role));
}
