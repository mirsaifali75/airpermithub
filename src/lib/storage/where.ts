import { accountsEnabled } from "@/lib/auth/config";

/** Where tool entries are kept, for the notes under each tool: the account once accounts are open, this browser until then. */
export const keptIn = accountsEnabled ? "saved to your account" : "kept in this browser";
