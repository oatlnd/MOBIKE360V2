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
        Schema::table('inventory_transactions', function (Blueprint $table) {
            if (!Schema::hasColumn('inventory_transactions', 'supplier_id')) {
                $table->unsignedBigInteger('supplier_id')->nullable()->after('created_by');
                $table->string('invoice_number')->nullable()->after('supplier_id');
                $table->date('invoice_date')->nullable()->after('invoice_number');
                $table->decimal('invoice_amount', 12, 2)->nullable()->after('invoice_date');
                $table->date('transaction_date')->nullable()->after('invoice_amount');

                $table->foreign('supplier_id')->references('id')->on('suppliers')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_transactions', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn([
                'supplier_id',
                'invoice_number',
                'invoice_date',
                'invoice_amount',
                'transaction_date'
            ]);
        });
    }
};
