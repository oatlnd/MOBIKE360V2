<?php

namespace Database\Factories;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Factories\Factory;

class InventoryItemFactory extends Factory
{
    public function definition(): array
    {
        return [
            'branch_id' => Branch::factory(),
            'item_code' => $this->faker->unique()->numerify('PART-####'),
            'name' => $this->faker->word() . ' Part',
            'category_id' => null, // Optional, can be set in tests if needed
            'unit' => 'pcs',
            'purchase_price' => $this->faker->randomFloat(2, 10, 50),
            'selling_price' => $this->faker->randomFloat(2, 60, 150),
            'current_stock' => $this->faker->numberBetween(10, 100),
            'reorder_level' => $this->faker->numberBetween(5, 10),
            'description' => $this->faker->sentence(),
        ];
    }
}
