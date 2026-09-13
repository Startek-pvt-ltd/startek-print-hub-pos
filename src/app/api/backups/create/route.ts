import { requirePermission } from "@/lib/auth";
import { createBusinessBackup } from "@/server/backup-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requirePermission("backups:manage");
  const { bytes, manifest } = await createBusinessBackup({ id: user.id, name: user.name, email: user.email });
  const date = manifest.generatedAt.slice(0, 10);
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="startek-pos-backup-${date}.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
