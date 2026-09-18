import { getSession, type SessionPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Check the current account on every management request. A signed cookie can
// outlive a role change or account deletion and must not retain old privileges.
export async function getManagementSession(): Promise<SessionPayload | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true, demoBatchId: true },
  });
  if (!user || user.role !== session.role ||
      (user.demoBatchId && process.env.NODE_ENV === "production")) return null;
  return { userId: session.userId, role: user.role };
}
