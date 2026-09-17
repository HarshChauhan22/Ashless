-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "phone_verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smoking_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_label" TEXT NOT NULL,
    "pricing_mode" TEXT NOT NULL DEFAULT 'pack',
    "pack_price_paise" BIGINT,
    "pack_size" INTEGER,
    "cost_per_stick_paise" BIGINT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smoking_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cigarette_brand_reference" (
    "id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cigarette_brand_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "craving_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "intensity" TEXT,
    "trigger" TEXT,
    "outcome" TEXT,
    "coping_action" TEXT,
    "linked_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "craving_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "smoking_profile_id" TEXT NOT NULL,
    "unit_price_paise_snapshot" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "provider_order_id" TEXT NOT NULL,
    "provider_payment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'created',
    "failure_reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "sequence_no" BIGSERIAL NOT NULL,
    "entry_type" TEXT NOT NULL,
    "amount_paise" BIGINT NOT NULL,
    "balance_after_paise" BIGINT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_payment_id" TEXT,
    "goal_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_savings_balance" (
    "user_id" TEXT NOT NULL,
    "balance_paise" BIGINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_savings_balance_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "savings_goals" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target_amount_paise" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "savings_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "smoking_profiles_user_id_idx" ON "smoking_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cigarette_brand_reference_display_name_key" ON "cigarette_brand_reference"("display_name");

-- CreateIndex
CREATE INDEX "craving_sessions_user_id_started_at_idx" ON "craving_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "payment_transactions_user_id_created_at_idx" ON "payment_transactions"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_provider_order_id_key" ON "payment_transactions"("provider", "provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_user_id_idempotency_key_key" ON "payment_transactions"("user_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "savings_transactions_source_payment_id_key" ON "savings_transactions"("source_payment_id");

-- CreateIndex
CREATE INDEX "savings_transactions_user_id_sequence_no_idx" ON "savings_transactions"("user_id", "sequence_no");

-- CreateIndex
CREATE INDEX "savings_goals_user_id_status_idx" ON "savings_goals"("user_id", "status");

-- AddForeignKey
ALTER TABLE "smoking_profiles" ADD CONSTRAINT "smoking_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "craving_sessions" ADD CONSTRAINT "craving_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_smoking_profile_id_fkey" FOREIGN KEY ("smoking_profile_id") REFERENCES "smoking_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_transactions" ADD CONSTRAINT "savings_transactions_source_payment_id_fkey" FOREIGN KEY ("source_payment_id") REFERENCES "payment_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_savings_balance" ADD CONSTRAINT "user_savings_balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_goals" ADD CONSTRAINT "savings_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
