import { prisma } from "@/lib/prisma";

type AuditParams = {
  userId: string;
  storeId?: string | null;
  entityType: string;
  entityId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
};

export async function createAuditLog(params: AuditParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      storeId: params.storeId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      field: params.field,
      oldValue: params.oldValue,
      newValue: params.newValue,
    },
  });
}
