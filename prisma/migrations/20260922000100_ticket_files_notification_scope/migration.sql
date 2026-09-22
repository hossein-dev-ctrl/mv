-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "scope" TEXT NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN     "senderName" TEXT;

-- CreateTable
CREATE TABLE "TicketAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketAttachment_messageId_key" ON "TicketAttachment"("messageId");

-- CreateIndex
CREATE INDEX "Notification_userId_scope_readAt_createdAt_idx" ON "Notification"("userId", "scope", "readAt", "createdAt");

-- AddForeignKey
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "TicketMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "Notification" ADD CONSTRAINT "Notification_scope_check" CHECK ("scope" IN ('PERSONAL','SYSTEM'));
ALTER TABLE "TicketAttachment" ADD CONSTRAINT "TicketAttachment_size_check" CHECK ("size" BETWEEN 1 AND 5242880 AND octet_length("data") = "size");

-- Existing ticket notices: distinguish direct participants/support from observers.
UPDATE "Notification" n SET "scope" = 'SYSTEM'
FROM "Ticket" t, "User" u
WHERE n."userId" = u.id AND u.role = 'ADMIN'
AND n.href = '/tickets/' || t.id AND t."recipientId" IS NOT NULL
AND n."userId" <> t."creatorId" AND n."userId" <> t."recipientId";

UPDATE "Notification" n SET "senderName" = COALESCE(NULLIF(s.name,''),'کاربر ' || right(s.id,6)),
"recipientName" = CASE WHEN t."recipientId" IS NULL THEN 'پشتیبانی مدیریت' ELSE COALESCE(NULLIF(r.name,''),'کاربر ' || right(r.id,6)) END
FROM "Ticket" t JOIN "User" s ON s.id=t."creatorId" LEFT JOIN "User" r ON r.id=t."recipientId"
WHERE n."eventKey" = 'ticket:' || t.id || ':created';

UPDATE "Notification" n SET "senderName" = COALESCE(NULLIF(s.name,''),'کاربر ' || right(s.id,6)),
"recipientName" = CASE WHEN m."senderId"=t."creatorId" THEN COALESCE(NULLIF(r.name,''),CASE WHEN r.id IS NULL THEN 'پشتیبانی مدیریت' ELSE 'کاربر '||right(r.id,6) END)
WHEN m."senderId"=t."recipientId" OR t."recipientId" IS NULL THEN COALESCE(NULLIF(c.name,''),'کاربر '||right(c.id,6))
ELSE COALESCE(NULLIF(c.name,''),'کاربر '||right(c.id,6)) || ' و ' || COALESCE(NULLIF(r.name,''),'کاربر '||right(r.id,6)) END
FROM "TicketMessage" m JOIN "Ticket" t ON t.id=m."ticketId" JOIN "User" s ON s.id=m."senderId"
JOIN "User" c ON c.id=t."creatorId" LEFT JOIN "User" r ON r.id=t."recipientId"
WHERE n."eventKey" = 'ticket-message:' || m.id;

UPDATE "Notification" n SET "scope"='SYSTEM'
FROM "CourseInterest" i JOIN "Course" c ON c.id=i."courseId", "User" u
WHERE n."eventKey"='interest:'||i.id AND n."userId"=u.id AND u.role='ADMIN' AND n."userId"<>c."teacherId";
