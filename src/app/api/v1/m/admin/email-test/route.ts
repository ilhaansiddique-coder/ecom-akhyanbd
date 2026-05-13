// Mobile wrapper — POST to test SMTP credentials. Persists the same keys
// (smtp_host/port/user/pass/from) the regular settings save does, then
// attempts a real connection via `testSmtpConnection`. Response shape:
//   { success: true } | { success: false, error: "..." }
import type { NextRequest } from "next/server";
import { POST as adminPOST } from "@/app/api/v1/admin/email-test/route";

export const POST = (req: NextRequest) => adminPOST(req);