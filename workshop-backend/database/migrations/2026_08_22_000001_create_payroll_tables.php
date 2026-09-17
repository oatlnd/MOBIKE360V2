<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Extend users table for payroll info
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'base_salary')) {
                $table->decimal('base_salary', 12, 2)->default(0)->after('salary');
            }
            if (!Schema::hasColumn('users', 'salary_type')) {
                $table->string('salary_type', 20)->default('monthly')->after('base_salary'); // monthly, daily
            }
            if (!Schema::hasColumn('users', 'daily_rate')) {
                $table->decimal('daily_rate', 10, 2)->default(0)->after('salary_type');
            }
            if (!Schema::hasColumn('users', 'bank_name')) {
                $table->string('bank_name', 100)->nullable()->after('daily_rate');
            }
            if (!Schema::hasColumn('users', 'bank_account_number')) {
                $table->string('bank_account_number', 50)->nullable()->after('bank_name');
            }
            if (!Schema::hasColumn('users', 'bank_branch_code')) {
                $table->string('bank_branch_code', 30)->nullable()->after('bank_account_number');
            }
            if (!Schema::hasColumn('users', 'epf_number')) {
                $table->string('epf_number', 50)->nullable()->after('bank_branch_code');
            }
        });

        // 2. Attendances table
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->date('date');
            $table->enum('status', ['present', 'absent', 'half_day', 'leave'])->default('present');
            $table->boolean('is_sunday')->default(false);
            $table->decimal('sunday_bonus_rate', 10, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'date']);
        });

        // 3. Employee Advances & Allowances table
        Schema::create('employee_advances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->date('date');
            $table->enum('payment_method', ['cash', 'bank_transfer'])->default('cash');
            $table->enum('type', ['advance', 'festival_bonus', 'allowance', 'other'])->default('advance');
            $table->unsignedBigInteger('deducted_in_payroll_run_id')->nullable();
            $table->enum('status', ['active', 'deducted', 'waived'])->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 4. Payroll Runs table
        Schema::create('payroll_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('month', 7); // e.g. "2026-08"
            $table->enum('period_type', ['first_half', 'second_half', 'full_month'])->default('full_month');
            $table->decimal('total_base_pay', 14, 2)->default(0);
            $table->decimal('total_advances', 14, 2)->default(0);
            $table->decimal('total_bonuses', 14, 2)->default(0);
            $table->decimal('total_epf', 14, 2)->default(0);
            $table->decimal('total_net_pay', 14, 2)->default(0);
            $table->enum('status', ['draft', 'confirmed', 'completed'])->default('draft');
            $table->date('payment_date')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        // 5. Payroll Items table
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_run_id')->constrained('payroll_runs')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('base_salary', 12, 2)->default(0);
            $table->unsignedSmallInteger('working_days')->default(0);
            $table->unsignedSmallInteger('sunday_days')->default(0);
            $table->decimal('sunday_bonus', 12, 2)->default(0);
            $table->decimal('allowances', 12, 2)->default(0);
            $table->decimal('advances_deducted', 12, 2)->default(0);
            $table->decimal('first_half_paid', 12, 2)->default(0);
            $table->decimal('epf_employee', 12, 2)->default(0);
            $table->decimal('epf_employer', 12, 2)->default(0);
            $table->decimal('net_pay', 12, 2)->default(0);
            $table->enum('status', ['unpaid', 'paid'])->default('unpaid');
            $table->string('payment_method', 30)->default('bank_transfer');
            $table->string('bank_account_number', 50)->nullable();
            $table->string('bank_name', 100)->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        // 6. Register Spatie Permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $perms = ['view_payroll', 'manage_payroll', 'manage_attendance', 'manage_advances'];
        foreach ($perms as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $admin = Role::where('name', 'admin')->first();
        if ($admin) {
            $admin->givePermissionTo($perms);
        }
        $manager = Role::where('name', 'manager')->first();
        if ($manager) {
            $manager->givePermissionTo($perms);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
        Schema::dropIfExists('payroll_runs');
        Schema::dropIfExists('employee_advances');
        Schema::dropIfExists('attendances');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'base_salary', 'salary_type', 'daily_rate', 
                'bank_name', 'bank_account_number', 'bank_branch_code', 'epf_number'
            ]);
        });

        Permission::whereIn('name', ['view_payroll', 'manage_payroll', 'manage_attendance', 'manage_advances'])->delete();
    }
};
