-- CreateTable
CREATE TABLE "Authentications" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,

    CONSTRAINT "Authentications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Authentications_token_idx" ON "Authentications"("token");
