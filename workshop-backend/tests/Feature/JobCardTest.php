<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\InventoryItem;
use App\Models\JobCard;
use App\Models\User;
use App\Models\InventoryTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class JobCardTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected $user;
    protected $branch;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\DB::statement('PRAGMA ignore_check_constraints = 1;');
        
        $this->branch = Branch::factory()->create();
        $this->user = User::factory()->create();
        
        // Setup permissions
        $permissions = [
            'view job cards', 'create job cards', 'edit job cards', 
            'delete job cards', 'complete job cards', 'convert to invoice', 'view_live_board'
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']); // typically spatie defaults to web guard
        }
        
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);
        $this->user->assignRole($role);
    }

    public function test_can_create_job_card()
    {
        $this->withoutExceptionHandling();
        $item = InventoryItem::factory()->create([
            'branch_id' => $this->branch->id,
            'current_stock' => 10,
            'selling_price' => 100
        ]);

        $payload = [
            'branch_id' => $this->branch->id,
            'bike_number' => 'TN01AB1234',
            'make' => 'Honda',
            'model' => 'Activa',
            'customer_name' => 'John Doe',
            'customer_phone' => '1234567890',
            'service_type' => [
                ['id' => 'oil_change', 'name' => 'Oil Change', 'price' => 50]
            ],
            'parts_used' => [
                ['item_id' => $item->id, 'name' => $item->name, 'quantity' => 2, 'price' => 100]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/job-cards', $payload);

        $response->assertStatus(201)
                 ->assertJsonPath('bike_number', 'TN01AB1234')
                 ->assertJsonPath('total_amount', '250.00'); // 50 + (100 * 2)

        $this->assertDatabaseHas('job_cards', [
            'bike_number' => 'TN01AB1234',
            'status' => 'received',
            'total_amount' => 250
        ]);

        // Verify inventory transaction was recorded
        $this->assertDatabaseHas('inventory_transactions', [
            'inventory_item_id' => $item->id,
            'transaction_type' => 'job_card',
            'quantity' => 2,
        ]);
    }

    public function test_can_complete_job_card_and_deduct_inventory()
    {
        $item = InventoryItem::factory()->create([
            'branch_id' => $this->branch->id,
            'current_stock' => 10,
            'selling_price' => 100
        ]);

        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'in_progress',
            'total_amount' => 50,
            'final_amount' => 50,
            'service_type' => [['id' => 'oil_change', 'name' => 'Oil Change', 'price' => 50]],
            'parts_used' => []
        ]);

        $payload = [
            'quality_check_signature' => 'QC_SIGN_123',
            'parts_used' => [
                ['item_id' => $item->id, 'quantity' => 3]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson("/api/job-cards/{$jobCard->id}/complete", $payload);

        $response->assertStatus(200)
                 ->assertJsonPath('status', 'completed');

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobCard->id,
            'status' => 'completed',
            'quality_check_signature' => 'QC_SIGN_123',
            'total_amount' => 350 // 50 + (100 * 3)
        ]);

        // Verify stock was deducted
        $this->assertDatabaseHas('inventory_items', [
            'id' => $item->id,
            'current_stock' => 7 // 10 - 3
        ]);
    }

    public function test_cannot_edit_completed_job_card_details()
    {
        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'completed',
        ]);

        // Admin can edit, so let's use a non-admin user
        $mechanic = User::factory()->create();
        $role = Role::firstOrCreate(['name' => 'mechanic', 'guard_name' => 'web']);
        $role->syncPermissions(['edit job cards']);
        $mechanic->assignRole($role);

        $payload = [
            'customer_name' => 'Jane Doe'
        ];

        $response = $this->actingAs($mechanic)->putJson("/api/job-cards/{$jobCard->id}", $payload);

        $response->assertStatus(403);
    }
}
