-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- Insert default admin user (password: admin123, bcrypt hash)
INSERT INTO "User" ("id", "name", "email", "password") VALUES ('default-admin-user', 'Admin', 'admin@linkcharts.local', '$2b$10$sjD1MrCz/zH7X6NQ1zMZ2uxWzFyHHRzFBj22EZkC9VUSNuNARFSB6');

-- AlterTable: add columns (userId nullable first)
ALTER TABLE "Graph" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Graph" ADD COLUMN "userId" TEXT;

-- Assign existing graphs to default user
UPDATE "Graph" SET "userId" = 'default-admin-user' WHERE "userId" IS NULL;

-- Make userId required
ALTER TABLE "Graph" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Graph_userId_idx" ON "Graph"("userId");

-- AddForeignKey
ALTER TABLE "Graph" ADD CONSTRAINT "Graph_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
