<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained();
            $table->foreignId('branch_id')->constrained();
            
            $table->enum('transaction_type', ['purchase', 'sale', 'adjustment', 'return', 'transfer']);
            $table->integer('quantity');
            $table->decimal('unit_price', 10, 2);
            $table->decimal('total_price', 10, 2);
            
            $table->string('reference_type')->nullable(); // job_card, purchase_order, etc.
            $table->unsignedBigInteger('reference_id')->nullable();
            
            $table->foreignId('created_by')->constrained('users');
            $table->text('notes')->nullable();
            
            $table->timestamps();
            
            $table->index(['reference_type', 'reference_id']);
            $table->index('transaction_type');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_transactions');
    }
};