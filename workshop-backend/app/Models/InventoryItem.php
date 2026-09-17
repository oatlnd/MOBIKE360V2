<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'branch_id',
        'category_id',
        'sub_category_id',
        'item_code',
        'name',
        'description',
        'purchase_price',
        'selling_price',
        'min_selling_price',
        'reorder_level',
        'current_stock',
        'unit',
        'barcode',
        'image',
        'is_active'
    ];

    protected $casts = [
        'purchase_price' => 'decimal:2',
        'selling_price' => 'decimal:2',
        'min_selling_price' => 'decimal:2',
        'current_stock' => 'integer',
        'reorder_level' => 'integer',
        'is_active' => 'boolean'
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }

    public function subCategory()
    {
        return $this->belongsTo(Category::class, 'sub_category_id');
    }

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    public function purchaseOrderItems()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeLowStock($query)
    {
        return $query->whereRaw('current_stock <= reorder_level');
    }

    public function scopeByBranch($query, $branchId)
    {
        return $query->where('branch_id', $branchId);
    }

    // Methods
    public function decrementStock($quantity, $referenceType, $referenceId, $userId = null)
    {
        if ($this->current_stock < $quantity) {
            throw new \Exception('Insufficient stock for item: ' . $this->name);
        }

        $this->current_stock -= $quantity;
        $this->save();

        $this->transactions()->create([
            'branch_id' => $this->branch_id,
            'transaction_type' => 'sale',
            'quantity' => $quantity,
            'unit_price' => $this->selling_price,
            'total_price' => $this->selling_price * $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'created_by' => $userId ?? auth()->id(),
            'notes' => 'Stock deducted for ' . $referenceType . ' #' . $referenceId
        ]);

        return $this;
    }

    public function incrementStock($quantity, $referenceType, $referenceId, $userId = null, $unitPrice = null)
    {
        $this->current_stock += $quantity;
        $this->save();

        $price = $unitPrice ?? $this->purchase_price;

        $this->transactions()->create([
            'branch_id' => $this->branch_id,
            'transaction_type' => 'purchase',
            'quantity' => $quantity,
            'unit_price' => $price,
            'total_price' => $price * $quantity,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'created_by' => $userId ?? auth()->id(),
            'notes' => 'Stock added from ' . $referenceType . ' #' . $referenceId
        ]);

        return $this;
    }
}