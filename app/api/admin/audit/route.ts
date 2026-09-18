import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/authorization";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    await requireRole(UserRole.ADMIN);

    const auditLogs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        actor: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({ success: true, count: auditLogs.length, data: auditLogs });
  } catch (error) {
    const isForbidden = error instanceof Error && error.message.includes("FORBIDDEN");
    const isUnauthorized = error instanceof Error && error.message.includes("UNAUTHORIZED");

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: isForbidden ? 403 : isUnauthorized ? 401 : 500 }
    );
  }
}
