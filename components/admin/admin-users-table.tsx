"use client";

import * as React from "react";
import { updateUserRoleAction } from "@/actions/admin-actions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  issuesReportedCount: number;
}

interface AdminUsersTableProps {
  users: UserItem[];
  currentAdminId: string;
}

export function AdminUsersTable({ users: initialUsers, currentAdminId }: AdminUsersTableProps) {
  const [users, setUsers] = React.useState(initialUsers);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: "ADMIN" | "MEMBER" | "GUEST") => {
    setLoadingId(userId);
    try {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.success) {
        toast.success(res.message);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        toast.error("Failed to update role", { description: res.message });
      }
    } catch {
      toast.error("Network error while updating user role");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="hidden sm:flex items-center px-4 py-2.5 bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider gap-4">
        <div className="w-48 shrink-0">Name</div>
        <div className="flex-1 min-w-0">Email</div>
        <div className="w-32 shrink-0">Role</div>
        <div className="w-24 shrink-0">Reports</div>
        <div className="w-24 shrink-0 text-right">Joined</div>
      </div>

      <div className="divide-y divide-border/40 text-xs">
        {users.map((u) => (
          <div
            key={u.id}
            className={`flex flex-col sm:flex-row sm:items-center px-4 py-3 gap-2 sm:gap-4 hover:bg-muted/30 transition-colors ${
              loadingId === u.id ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {/* Name */}
            <div className="w-48 shrink-0 font-medium text-foreground flex items-center gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted font-bold text-[10px] shrink-0">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{u.name}</span>
            </div>

            {/* Email */}
            <div className="flex-1 min-w-0 text-muted-foreground truncate font-mono text-[11px]">
              {u.email}
            </div>

            {/* Role */}
            <div className="w-32 shrink-0">
              {u.id === currentAdminId ? (
                <Badge variant="default" className="text-[10px] px-2 py-0.5">
                  ADMIN (YOU)
                </Badge>
              ) : (
                <Select
                  value={u.role}
                  onValueChange={(val) =>
                    handleRoleChange(u.id, val as "ADMIN" | "MEMBER" | "GUEST")
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-background/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">ADMIN</SelectItem>
                    <SelectItem value="MEMBER">MEMBER</SelectItem>
                    <SelectItem value="GUEST">GUEST</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Reports */}
            <div className="w-24 shrink-0 text-muted-foreground text-[11px]">
              <span className="sm:hidden font-medium text-foreground mr-1">Activity:</span>
              {u.issuesReportedCount} {u.issuesReportedCount === 1 ? "report" : "reports"}
            </div>

            {/* Joined */}
            <div className="w-24 shrink-0 text-left sm:text-right text-[11px] font-mono text-muted-foreground pt-1 sm:pt-0 border-t border-border/30 sm:border-0">
              {formatDate(u.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
