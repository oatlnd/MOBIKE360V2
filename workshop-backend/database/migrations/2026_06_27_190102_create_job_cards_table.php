<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('job_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained();
            $table->string('job_number')->unique();
            
            // Vehicle Details
            $table->string('bike_number');
            $table->string('make');
            $table->string('model');
            $table->string('engine_no')->nullable();
            $table->string('chassis_no')->nullable();
            $table->integer('mileage')->nullable();
            
            // Customer Details
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('customer_email')->nullable();
            
            // Service Details
            $table->json('service_type')->nullable(); // Array of services with prices
            $table->json('parts_used')->nullable(); // Parts used with quantities
            $table->text('description')->nullable();
            
            // Status and Assignments
            $table->enum('status', ['pending', 'in_progress', 'completed', 'invoiced', 'cancelled'])->default('pending');
            $table->foreignId('prepared_by')->constrained('users');
            $table->foreignId('mechanic_id')->nullable()->constrained('users');
            
            // Quality Check
            $table->string('quality_check_signature')->nullable();
            
            // Images
            $table->json('images')->nullable();
            $table->json('purpose')->nullable();
            
            // Financial
            $table->decimal('total_amount', 10, 2)->default(0);
            $table->decimal('discount', 10, 2)->default(0);
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('final_amount', 10, 2)->default(0);
            
            // Timestamps
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('invoiced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            
            // Indexes
            $table->index(['branch_id', 'status']);
            $table->index('job_number');
            $table->index('bike_number');
            $table->index('customer_phone');
        });
    }

    public function down()
    {
        Schema::dropIfExists('job_cards');
    }
};