import { handlers } from "@/auth";
import { accountsEnabled } from "@/lib/auth/config";

const closed = () => new Response("Accounts are not open yet.", { status: 404 });

export const GET = accountsEnabled ? handlers.GET : closed;
export const POST = accountsEnabled ? handlers.POST : closed;
