import {ACCOUNTS_ENABLED} from '../product';
import { getAuth } from "../shared/storage/authStorage";

/** Guest keys remain unchanged so existing adventures survive the new entry flow. */
export function worldAccount() {
  if (!ACCOUNTS_ENABLED) return "";
  const auth = getAuth();
  return auth.isLoggedIn ? auth.userId || auth.email.trim().toLowerCase() : "";
}
export function worldKey(base: string) {
  const account = worldAccount();
  return account ? base + ":account:" + encodeURIComponent(account) : base;
}
