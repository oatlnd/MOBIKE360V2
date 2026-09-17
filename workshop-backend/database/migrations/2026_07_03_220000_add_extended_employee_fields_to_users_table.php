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
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name')->nullable()->after('name');
            $table->string('last_name')->nullable()->after('first_name');
            $table->string('identity_card_no')->nullable()->after('employee_id');
            $table->string('bank_name')->nullable()->after('address');
            $table->string('bank_branch')->nullable()->after('bank_name');
            $table->string('bank_account_no')->nullable()->after('bank_branch');
            $table->date('dob')->nullable()->after('phone');
            $table->boolean('epf_etf')->default(false)->after('is_active');
            $table->string('salary_rate_type')->default('monthly')->after('salary'); // 'monthly' or 'daily'
            $table->integer('leave_days_per_year')->default(21)->after('joining_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name',
                'last_name',
                'identity_card_no',
                'bank_name',
                'bank_branch',
                'bank_account_no',
                'dob',
                'epf_etf',
                'salary_rate_type',
                'leave_days_per_year'
            ]);
        });
    }
};
