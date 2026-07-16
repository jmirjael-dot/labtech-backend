-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENTE', 'OPERADOR', 'LABORATORISTA', 'ADMIN');

-- CreateEnum
CREATE TYPE "SampleStatus" AS ENUM ('PENDIENTE_PAGO', 'PAGADO', 'EN_COLA', 'EN_LABORATORIO', 'EN_ANALISIS', 'CONTROL_CALIDAD', 'TERMINADO', 'ENTREGADO');

-- CreateEnum
CREATE TYPE "MineralType" AS ENUM ('OXIDO', 'SULFURO');

-- CreateEnum
CREATE TYPE "MineralTarget" AS ENUM ('ORO', 'PLATA', 'COBRE', 'PLOMO', 'ZINC', 'CARBON', 'ANTIMONIO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CULQI', 'YAPE_BUSINESS', 'TRANSFERENCIA_BCP');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO', 'REEMBOLSADO');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('BOLETA', 'FACTURA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('EMITIDA', 'ANULADA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CLIENTE',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replaced_by" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_ip" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "samples" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "tipo_mineral" "MineralType" NOT NULL,
    "mineral" "MineralTarget" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "observaciones" TEXT,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" "SampleStatus" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sample_status_history" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "estado_previo" "SampleStatus",
    "estado_nuevo" "SampleStatus" NOT NULL,
    "cambiado_por" TEXT,
    "nota" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sample_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "metodo" "PaymentMethod" NOT NULL,
    "estado" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "proveedor_ref" TEXT,
    "comprobante_url" TEXT,
    "metadata" JSONB,
    "pagado_at" TIMESTAMP(3),
    "validado_por_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "sample_id" TEXT NOT NULL,
    "ley" TEXT NOT NULL,
    "metodo" TEXT NOT NULL,
    "laboratorista" TEXT NOT NULL,
    "observaciones" TEXT,
    "reporte_pdf_url" TEXT,
    "emitido_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" "InvoiceType" NOT NULL DEFAULT 'BOLETA',
    "estado" "InvoiceStatus" NOT NULL DEFAULT 'EMITIDA',
    "sample_id" TEXT NOT NULL,
    "cliente_id" TEXT NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "igv" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "pdf_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_documento_key" ON "users"("documento");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_documento_idx" ON "users"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "samples_codigo_key" ON "samples"("codigo");

-- CreateIndex
CREATE INDEX "samples_cliente_id_idx" ON "samples"("cliente_id");

-- CreateIndex
CREATE INDEX "samples_estado_idx" ON "samples"("estado");

-- CreateIndex
CREATE INDEX "sample_status_history_sample_id_idx" ON "sample_status_history"("sample_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_sample_id_key" ON "payments"("sample_id");

-- CreateIndex
CREATE INDEX "payments_estado_idx" ON "payments"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "results_sample_id_key" ON "results"("sample_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_numero_key" ON "invoices"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_sample_id_key" ON "invoices"("sample_id");

-- CreateIndex
CREATE INDEX "invoices_cliente_id_idx" ON "invoices"("cliente_id");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "samples" ADD CONSTRAINT "samples_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sample_status_history" ADD CONSTRAINT "sample_status_history_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sample_id_fkey" FOREIGN KEY ("sample_id") REFERENCES "samples"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
