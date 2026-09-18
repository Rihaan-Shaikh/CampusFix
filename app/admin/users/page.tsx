import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth/authorization";
import { AdminUsersTable } from "@/components/admin/admin-users-table";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getServerSession();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { issuesCreated: true },
      },
    },
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
    issuesReportedCount: u._count.issuesCreated,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          User Account Administration
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage campus user roles and operational access privileges.
        </p>
      </div>

      <AdminUsersTable
        users={formattedUsers}
        currentAdminId={session?.user?.id || ""}
      />
    </div>
  );
}
