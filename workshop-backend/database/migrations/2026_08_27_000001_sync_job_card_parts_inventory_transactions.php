<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Models\JobCard;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Clean nulls for barcodes that are empty strings
        \DB::table('inventory_items')->where('barcode', '')->update(['barcode' => null]);
        \DB::table('inventory_items')->where('sub_category_id', 0)->update(['sub_category_id' => null]);
        \DB::table('inventory_items')->where('category_id', 0)->update(['category_id' => null]);

        // 2. Scan all job cards with parts_used and ensure InventoryTransaction exists
        $jobCards = JobCard::whereNotNull('parts_used')->get();
        foreach ($jobCards as $jc) {
            $parts = is_array($jc->parts_used) ? $jc->parts_used : json_decode($jc->parts_used, true);
            if (!is_array($parts) || empty($parts)) continue;

            $jobNumber = $jc->job_number ?: ($jc->job_card_number ?: $jc->id);

            foreach ($parts as $part) {
                $itemId = $part['item_id'] ?? null;
                $invItem = null;

                if ($itemId) {
                    $invItem = InventoryItem::find($itemId);
                }

                if (!$invItem && !empty($part['name'])) {
                    $invItem = InventoryItem::where('name', $part['name'])
                        ->orWhere('item_code', $part['name'])
                        ->first();
                    $itemId = $invItem?->id;
                }

                if (!$itemId || !$invItem) continue;

                $qty = (int)($part['quantity'] ?? 1);
                $price = (float)($part['price'] ?? $invItem->selling_price);
                $total = (float)($part['total'] ?? ($price * $qty));

                // Check if transaction already exists for this job card and item
                $existing = InventoryTransaction::where('reference_type', 'job_card')
                    ->where('reference_id', $jc->id)
                    ->where('inventory_item_id', $itemId)
                    ->first();

                if (!$existing) {
                    InventoryTransaction::create([
                        'inventory_item_id' => $itemId,
                        'branch_id' => $jc->branch_id ?: $invItem->branch_id,
                        'transaction_type' => 'sale',
                        'quantity' => $qty,
                        'unit_price' => $price ?: $invItem->selling_price,
                        'total_price' => $total ?: (($price ?: $invItem->selling_price) * $qty),
                        'reference_type' => 'job_card',
                        'reference_id' => $jc->id,
                        'created_by' => $jc->prepared_by ?: 1,
                        'created_at' => $jc->created_at ?: now(),
                        'updated_at' => $jc->updated_at ?: now(),
                        'notes' => "Used in Job Card #{$jobNumber} (Bike: {$jc->bike_number} - {$jc->customer_name})"
                    ]);
                } else {
                    $existing->update([
                        'quantity' => $qty,
                        'unit_price' => $price ?: $invItem->selling_price,
                        'total_price' => $total ?: (($price ?: $invItem->selling_price) * $qty),
                        'notes' => "Used in Job Card #{$jobNumber} (Bike: {$jc->bike_number} - {$jc->customer_name})"
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
