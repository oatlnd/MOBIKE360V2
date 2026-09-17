<?php

namespace Database\Factories;

use App\Models\JobCard;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class JobCardFactory extends Factory
{
    protected $model = JobCard::class;

    public function definition()
    {
        $serviceTypes = [
            ['id' => 'washing', 'name' => 'Washing', 'price' => 500],
            ['id' => 'engine_oil', 'name' => 'Engine Oil Change', 'price' => 2500],
            ['id' => 'air_filter', 'name' => 'Air Filter', 'price' => 800],
        ];

        return [
            'branch_id' => Branch::factory(),
            'job_number' => 'JC-' . str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT) . '-' . str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT),
            'bike_number' => $this->faker->regexify('[A-Z]{2}[0-9]{2}[A-Z]{2}[0-9]{4}'),
            'make' => $this->faker->randomElement(['Honda', 'Yamaha', 'Suzuki', 'Kawasaki', 'TVS', 'Bajaj']),
            'model' => $this->faker->randomElement(['Activa', 'FZ', 'Apache', 'Ninja', 'Pulsar', 'Dio']),
            'engine_no' => $this->faker->optional()->bothify('??####??##'),
            'chassis_no' => $this->faker->optional()->bothify('??####??##??'),
            'mileage' => $this->faker->numberBetween(1000, 50000),
            'customer_name' => $this->faker->name,
            'customer_phone' => $this->faker->phoneNumber,
            'customer_email' => $this->faker->optional()->email,
            'service_type' => $serviceTypes,
            'parts_used' => [],
            'description' => $this->faker->sentence,
            'status' => $this->faker->randomElement(['pending', 'in_progress', 'completed', 'invoiced']),
            'prepared_by' => User::factory(),
            'mechanic_id' => User::factory(),
            'total_amount' => 500 + 2500 + 800,
            'final_amount' => 500 + 2500 + 800,
            'created_at' => $this->faker->dateTimeBetween('-30 days', 'now'),
        ];
    }
}