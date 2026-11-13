import { ROUTES } from "../config";

/** Menu aktif: beranda hanya untuk "/", menu lain juga untuk halaman turunannya. */
export function isActivePath(pathname: string, href: string): boolean {
  return href === ROUTES.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
