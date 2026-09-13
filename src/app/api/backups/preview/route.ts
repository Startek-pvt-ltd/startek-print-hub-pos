import { BackupValidationError } from "@/domain/backup";
import { requirePermission } from "@/lib/auth";
import { previewBusinessBackup } from "@/server/backup-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await requirePermission("backups:manage");
  try {
    const form = await request.formData();
    const file = form.get("backup");
    if (!(file instanceof File)) return Response.json({ error: "Choose a backup ZIP file" }, { status: 400 });
    if (file.size > 25 * 1024 * 1024) return Response.json({ error: "Backup package exceeds the 25 MB upload limit" }, { status: 413 });
    const preview = previewBusinessBackup(new Uint8Array(await file.arrayBuffer()));
    return Response.json(preview, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const message = error instanceof BackupValidationError ? error.message : "Backup validation failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
