import { NextRequest } from "next/server";
import { getServerSession } from "@/lib/auth/authorization";
import { apiSuccess, apiError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req.headers);
    if (!session?.user) {
      return apiError("UNAUTHORIZED", "Authentication required. Please sign in or provide a valid bearer token.", 401);
    }

    // Fetch user details from database to ensure fresh role and metadata
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
      },
    });

    if (!user) {
      return apiError("NOT_FOUND", "User profile not found.", 404);
    }

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("API v1 [GET /auth/me] error:", error);
    return apiError("INTERNAL_SERVER_ERROR", "Failed to retrieve user profile.", 500);
  }
}
