<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->foreignId('job_card_id')->constrained();
            $table->string('invoice_number')->unique();
            
            $table->enum('payment_type', ['cash', 'credit_card', 'bank_transfer', 'cheque']);
            $table->enum('payment_status', ['paid', 'partial', 'pending'])->default('pending');
            
            $table->decimal('amount', 10, 2);
            $table->decimal('paid_amount', 10, 2)->default(0);
            $table->decimal('balance', 10, 2)->default(0);
            
            // Cash specific
            $table->decimal('cash_given', 10, 2)->nullable();
            $table->decimal('cash_returned', 10, 2)->nullable();
            
            // Card specific
            $table->string('card_number')->nullable();
            $table->string('card_holder_name')->nullable();
            $table->string('bank_name')->nullable();
            
            // Cheque specific
            $table->string('cheque_number')->nullable();
            $table->date('cheque_date')->nullable();
            
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index('invoice_number');
            $table->index('payment_type');
            $table->index('payment_status');
            $table->index('created_at');
        });
    }

    public function down()
    {
        Schema::dropIfExists('invoices');
    }
};