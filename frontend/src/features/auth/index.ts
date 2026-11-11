// Satu-satunya pintu keluar fitur auth (dicek lint).
export { householdQueryKey, type Household } from "./api/household";
export { signIn, signOut, type Account } from "./api/auth-service";
export { AuthGuard } from "./components/auth-guard";
export { ConsentScreen } from "./components/consent-screen";
export { DemoModeBanner } from "./components/demo-mode-banner";
export { GuestGuard } from "./components/guest-guard";
export { LoginScreen } from "./components/login-screen";
export { RegisterScreen } from "./components/register-screen";
export { WelcomeScreen } from "./components/welcome-screen";
export { useAccount, useHousehold } from "./hooks/use-household";
export { useSessionStatus, type SessionStatus } from "./hooks/use-session-status";
