<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('category_id')->nullable()->constrained('categories');
            $table->foreignId('sub_category_id')->nullable()->constrained('categories');
            
            $table->string('item_code')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            
            // Pricing
            $table->decimal('purchase_price', 10, 2);
            $table->decimal('selling_price', 10, 2);
            $table->decimal('min_selling_price', 10, 2)->default(0);
            
            // Stock
            $table->integer('reorder_level')->default(0);
            $table->integer('current_stock')->default(0);
            $table->string('unit')->default('pcs');
            $table->string('barcode')->nullable();
            
            // Additional
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['branch_id', 'item_code']);
            $table->index('name');
        });
    }

    public function down()
    {
        Schema::dropIfExists('inventory_items');
    }
};