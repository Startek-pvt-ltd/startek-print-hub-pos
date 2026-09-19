import { UserPlus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { requirePermission } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { StaffManagement } from "./staff-management";

export default async function StaffPage() {
  const user = await requirePermission("staff:view");
  const staff = await db.user.findMany({
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, updatedAt: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  const editable = hasPermission(user.role, "staff:manage");
  return <>
    <PageHeading eyebrow="Administration" title="Staff" description="Manage staff login access, approved roles, and account status without deleting retained business history." action={editable ? <Button form="add-staff-trigger" type="submit"><UserPlus className="size-5" /> Add staff</Button> : undefined} />
    <StaffManagement currentUserId={user.id} editable={editable} staff={staff.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }))} />
  </>;
}
