import { ROUTES } from "../config";

export function isActivePath(pathname: string, href: string): boolean {
  return href === ROUTES.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
