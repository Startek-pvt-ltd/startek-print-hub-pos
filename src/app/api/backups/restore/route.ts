import { BackupValidationError } from "@/domain/backup";
import { requirePermission } from "@/lib/auth";
import { restoreBusinessBackup } from "@/server/backup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requirePermission("backups:manage");
  if (process.env.DATABASE_ENVIRONMENT !== "development") return Response.json({ error: "Restore is disabled outside the development database" }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("backup");
    const confirmation = form.get("confirmation");
    if (!(file instanceof File)) return Response.json({ error: "Choose a validated backup ZIP file" }, { status: 400 });
    if (confirmation !== "RESTORE DEVELOPMENT") return Response.json({ error: "Type RESTORE DEVELOPMENT to confirm" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "Backup package exceeds the 25 MB upload limit" }, { status: 413 });
    const result = await restoreBusinessBackup(new Uint8Array(await file.arrayBuffer()), { id: user.id, name: user.name, email: user.email });
    return Response.json({ restored: result.restored, manifest: result.manifest }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof BackupValidationError || error instanceof Error ? error.message : "Restore failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
