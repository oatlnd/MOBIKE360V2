<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add delivered_at column to job_cards if not present
        Schema::table('job_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('job_cards', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('completed_at');
            }
        });

        // 2. Backfill delivered_at for existing delivered jobs
        try {
            DB::table('job_cards')
                ->where('delivery_status', 'delivered')
                ->whereNull('delivered_at')
                ->update(['delivered_at' => DB::raw('updated_at')]);
        } catch (\Exception $e) {
            // Ignore if error
        }

        // 3. Sync base_salary with salary in users table
        try {
            DB::statement("UPDATE users SET base_salary = salary WHERE (base_salary IS NULL OR base_salary = 0) AND salary > 0");
        } catch (\Exception $e) {
            // Ignore
        }

        // 4. Deduplicate branches in branches table (e.g. if 'Service Branch' and 'Service' both exist)
        try {
            $branches = DB::table('branches')->get();
            $seen = [];
            foreach ($branches as $b) {
                // Normalize branch name: e.g. "Service Branch" -> "service"
                $normalized = strtolower(trim(preg_replace('/\bbranch\b/i', '', $b->name)));
                if (isset($seen[$normalized])) {
                    $primaryId = $seen[$normalized];
                    // Update any references in other tables to the primary branch
                    DB::table('job_cards')->where('branch_id', $b->id)->update(['branch_id' => $primaryId]);
                    DB::table('users')->where('branch_id', $b->id)->update(['branch_id' => $primaryId]);
                    DB::table('inventory_items')->where('branch_id', $b->id)->update(['branch_id' => $primaryId]);
                    DB::table('inventory_transactions')->where('branch_id', $b->id)->update(['branch_id' => $primaryId]);
                    DB::table('invoices')->where('branch_id', $b->id)->update(['branch_id' => $primaryId]);
                    // Mark duplicate branch inactive or delete
                    DB::table('branches')->where('id', $b->id)->update(['is_active' => false]);
                } else {
                    $seen[$normalized] = $b->id;
                    // Ensure the primary name is clean (e.g. "Service", "Mechanic", "Parts")
                    $cleanName = ucwords($normalized);
                    DB::table('branches')->where('id', $b->id)->update(['name' => $cleanName, 'is_active' => true]);
                }
            }
        } catch (\Exception $e) {
            // Log/ignore
        }
    }

    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            if (Schema::hasColumn('job_cards', 'delivered_at')) {
                $table->dropColumn('delivered_at');
            }
        });
    }
};
