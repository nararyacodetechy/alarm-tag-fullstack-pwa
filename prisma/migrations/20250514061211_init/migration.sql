-- CreateTable
CREATE TABLE "Packet" (
    "id" SERIAL NOT NULL,
    "resi" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "order" TEXT NOT NULL,
    "device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Packet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Packet_resi_key" ON "Packet"("resi");

-- CreateIndex
CREATE UNIQUE INDEX "Packet_device_id_key" ON "Packet"("device_id");
