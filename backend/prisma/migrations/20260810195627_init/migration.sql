-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "supervisorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "teamId" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CatalogItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicator" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "categoryIcon" TEXT,
    "label" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "price" REAL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "FaixaTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "indicator" TEXT NOT NULL,
    "faixa" INTEGER NOT NULL,
    "pts" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "aparelhos" REAL NOT NULL,
    "metaPct" TEXT NOT NULL,
    "pctFinal" REAL
);

-- CreateTable
CREATE TABLE "AparelhoFaixa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faixa" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "metaPct" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AparelhoBonus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "faixa" INTEGER NOT NULL,
    "valor" REAL NOT NULL,
    "mult" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "colaboradorId" TEXT NOT NULL,
    "clienteNome" TEXT NOT NULL,
    "clienteCnpj" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "dataAtivacao" DATETIME,
    "observacao" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sale_colaboradorId_fkey" FOREIGN KEY ("colaboradorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "indicator" TEXT NOT NULL,
    "catalogItemId" TEXT,
    "label" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "pointsUnit" INTEGER NOT NULL,
    "pointsTotal" INTEGER NOT NULL,
    "valorReais" REAL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_catalogItemId_fkey" FOREIGN KEY ("catalogItemId") REFERENCES "CatalogItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "alteradoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alteradoPorId" TEXT NOT NULL,
    CONSTRAINT "SaleStatusHistory_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleStatusHistory_alteradoPorId_fkey" FOREIGN KEY ("alteradoPorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttendanceFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "faltouInjustificada" BOOLEAN NOT NULL DEFAULT true,
    "setById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttendanceFlag_setById_fkey" FOREIGN KEY ("setById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Team_supervisorId_key" ON "Team"("supervisorId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FaixaTable_indicator_faixa_key" ON "FaixaTable"("indicator", "faixa");

-- CreateIndex
CREATE UNIQUE INDEX "AparelhoFaixa_faixa_key" ON "AparelhoFaixa"("faixa");

-- CreateIndex
CREATE UNIQUE INDEX "AparelhoBonus_faixa_key" ON "AparelhoBonus"("faixa");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceFlag_userId_yearMonth_key" ON "AttendanceFlag"("userId", "yearMonth");
