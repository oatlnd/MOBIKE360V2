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
        // Modify column type using DB statement to avoid doctrine/dbal dependency issues
        if (config('database.default') !== 'sqlite') {
            DB::statement("ALTER TABLE job_cards MODIFY COLUMN status VARCHAR(50) DEFAULT 'received'");
        }
        
        // Backfill/Map any existing job status values if needed
        DB::table('job_cards')->whereIn('status', ['new', 'pending'])->update(['status' => 'received']);
        DB::table('job_cards')->where('status', 'waiting_for_customer')->update(['status' => 'parts_awaited']);

        Schema::table('job_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('job_cards', 'delivery_status')) {
                $table->string('delivery_status', 50)->default('not_ready')->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            if (Schema::hasColumn('job_cards', 'delivery_status')) {
                $table->dropColumn('delivery_status');
            }
        });
    }
};
