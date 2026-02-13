-- CreateTable
CREATE TABLE "GraphCollaborator" (
    "id" TEXT NOT NULL,
    "graphId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraphCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GraphCollaborator_graphId_idx" ON "GraphCollaborator"("graphId");

-- CreateIndex
CREATE INDEX "GraphCollaborator_userId_idx" ON "GraphCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphCollaborator_graphId_userId_key" ON "GraphCollaborator"("graphId", "userId");

-- AddForeignKey
ALTER TABLE "GraphCollaborator" ADD CONSTRAINT "GraphCollaborator_graphId_fkey" FOREIGN KEY ("graphId") REFERENCES "Graph"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraphCollaborator" ADD CONSTRAINT "GraphCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
