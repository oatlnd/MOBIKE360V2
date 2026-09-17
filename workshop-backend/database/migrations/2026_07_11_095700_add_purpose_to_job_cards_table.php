<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (!Schema::hasColumn('job_cards', 'purpose')) {
            Schema::table('job_cards', function (Blueprint $table) {
                $table->json('purpose')->nullable()->after('images');
            });
        }
    }

    public function down()
    {
        if (Schema::hasColumn('job_cards', 'purpose')) {
            Schema::table('job_cards', function (Blueprint $table) {
                $table->dropColumn('purpose');
            });
        }
    }
};
