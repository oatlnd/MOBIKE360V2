<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('job_cards', 'customer_town')) {
                $table->string('customer_town')->nullable();
            }
            if (!Schema::hasColumn('job_cards', 'next_service_km')) {
                $table->integer('next_service_km')->nullable();
            }
            if (!Schema::hasColumn('job_cards', 'next_service_date')) {
                $table->date('next_service_date')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            $table->dropColumn(['customer_town', 'next_service_km', 'next_service_date']);
        });
    }
};
