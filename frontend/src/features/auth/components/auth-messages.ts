import { AUTH } from "@/shared/copy";
import type { AuthFailure } from "../api/auth-service";

export const AUTH_FAILURE_MESSAGE: Record<AuthFailure, string> = {
  invalid_credentials: AUTH.galatMasuk,
  email_not_confirmed: AUTH.galatEmailBelumDikonfirmasi,
  user_already_exists: AUTH.galatSudahTerdaftar,
  weak_password: AUTH.galatKataSandiLemah,
  network: AUTH.galatJaringan,
  unknown: AUTH.galatUmum,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export const MIN_PASSWORD_LENGTH = 8;
