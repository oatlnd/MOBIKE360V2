<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\JobCard;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InvoiceTest extends TestCase
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
        
        $permissions = [
            'view invoices', 'create invoices', 'edit invoices', 'delete invoices', 'convert to invoice'
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm, 'guard_name' => 'web']);
        }
        
        $role = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $role->syncPermissions($permissions);
        $this->user->assignRole($role);
    }

    public function test_can_convert_completed_job_card_to_invoice()
    {
        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'completed',
            'total_amount' => 500,
            'final_amount' => 500,
            'discount' => 0,
            'tax' => 0,
        ]);

        $payload = [
            'payment_type' => 'cash',
            'paid_amount' => 500,
            'cash_given' => 600,
        ];

        $response = $this->actingAs($this->user)->postJson("/api/job-cards/{$jobCard->id}/convert-to-invoice", $payload);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Invoice created successfully');

        $this->assertDatabaseHas('invoices', [
            'job_card_id' => $jobCard->id,
            'payment_type' => 'cash',
            'payment_status' => 'paid',
            'amount' => 500,
            'paid_amount' => 500,
            'balance' => 0,
            'cash_given' => 600,
            'cash_returned' => 100,
        ]);

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobCard->id,
            'status' => 'invoiced'
        ]);
    }

    public function test_cannot_convert_incomplete_job_card()
    {
        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'in_progress',
        ]);

        $payload = [
            'payment_type' => 'cash',
            'paid_amount' => 500,
            'cash_given' => 500,
        ];

        $response = $this->actingAs($this->user)->postJson("/api/job-cards/{$jobCard->id}/convert-to-invoice", $payload);

        $response->assertStatus(400)
                 ->assertJsonPath('error', 'Job card must be completed before invoicing');
    }

    public function test_can_manually_create_invoice_for_completed_job()
    {
        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'completed',
        ]);

        $payload = [
            'job_card_id' => $jobCard->id,
            'payment_type' => 'bank_transfer',
            'amount' => 1000,
            'paid_amount' => 500,
            'bank_name' => 'Test Bank',
        ];

        $response = $this->actingAs($this->user)->postJson('/api/invoices', $payload);

        $response->assertStatus(201)
                 ->assertJsonPath('payment_status', 'partial')
                 ->assertJsonPath('balance', '500.00');

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobCard->id,
            'status' => 'invoiced'
        ]);
    }

    public function test_cannot_delete_fully_paid_invoice()
    {
        $invoice = Invoice::factory()->create([
            'branch_id' => $this->branch->id,
            'payment_status' => 'paid'
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/invoices/{$invoice->id}");

        $response->assertStatus(400)
                 ->assertJsonPath('error', 'Cannot delete a paid invoice');
    }

    public function test_deleting_unpaid_invoice_reverts_job_card()
    {
        $jobCard = JobCard::factory()->create([
            'branch_id' => $this->branch->id,
            'status' => 'invoiced',
        ]);

        $invoice = Invoice::factory()->create([
            'branch_id' => $this->branch->id,
            'job_card_id' => $jobCard->id,
            'payment_status' => 'pending'
        ]);

        $response = $this->actingAs($this->user)->deleteJson("/api/invoices/{$invoice->id}");

        $response->assertStatus(200);

        $this->assertSoftDeleted('invoices', ['id' => $invoice->id]);
        $this->assertDatabaseHas('job_cards', [
            'id' => $jobCard->id,
            'status' => 'completed'
        ]);
    }
}
