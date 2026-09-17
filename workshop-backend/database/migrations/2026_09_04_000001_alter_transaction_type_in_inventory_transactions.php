<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Change transaction_type from restrictive ENUM to VARCHAR(50) to allow 'job_card', 'sale', 'purchase', 'adjustment', etc.
        if (config('database.default') !== 'sqlite') {
            DB::statement("ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type VARCHAR(50) NOT NULL");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE inventory_transactions MODIFY COLUMN transaction_type ENUM('purchase', 'sale', 'adjustment', 'return', 'transfer') NOT NULL");
    }
};
