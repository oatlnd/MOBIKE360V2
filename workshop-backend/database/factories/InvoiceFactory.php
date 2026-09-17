<?php

namespace Database\Factories;

use App\Models\Branch;
use App\Models\JobCard;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class InvoiceFactory extends Factory
{
    public function definition(): array
    {
        $amount = $this->faker->randomFloat(2, 100, 1000);
        return [
            'branch_id' => Branch::factory(),
            'job_card_id' => JobCard::factory(),
            'invoice_number' => $this->faker->unique()->numerify('INV-###-######'),
            'payment_type' => 'cash',
            'payment_status' => 'paid',
            'amount' => $amount,
            'paid_amount' => $amount,
            'balance' => 0,
            'cash_given' => $amount,
            'cash_returned' => 0,
            'created_by' => User::factory(),
        ];
    }
}
