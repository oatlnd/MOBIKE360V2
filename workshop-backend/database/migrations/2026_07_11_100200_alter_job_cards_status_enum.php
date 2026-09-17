<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        try {
            DB::statement("ALTER TABLE job_cards MODIFY COLUMN status ENUM('received', 'diagnosis', 'pending', 'new', 'started', 'in_progress', 'parts_awaited', 'qc', 'waiting_for_customer', 'completed', 'closed', 'invoiced', 'cancelled') DEFAULT 'pending'");
        } catch (\Exception $e) {
            // Already updated or compatible
        }
    }

    public function down()
    {
        DB::statement("ALTER TABLE job_cards MODIFY COLUMN status ENUM('pending', 'in_progress', 'completed', 'invoiced', 'cancelled') DEFAULT 'pending'");
    }
};
