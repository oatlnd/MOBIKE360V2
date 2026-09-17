<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Models\Category;
use App\Models\InventoryTransaction;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    public function __construct()
    {
        $this->middleware('permission:view inventory')->only(['index', 'show', 'categories', 'lowStock']);
        $this->middleware('permission:create inventory')->only(['store']);
        $this->middleware('permission:edit inventory')->only(['update']);
        $this->middleware('permission:delete inventory')->only(['destroy']);
        $this->middleware('permission:adjust inventory')->only(['adjust']);
        $this->middleware('permission:manage purchases')->only(['purchaseOrder', 'receivePurchase']);
    }

    public function index(Request $request)
    {
        $query = InventoryItem::with(['category', 'subCategory', 'branch']);

        if ($request->has('search')) {
            $query->where(function($q) use ($request) {
                $q->where('name', 'LIKE', "%{$request->search}%")
                  ->orWhere('item_code', 'LIKE', "%{$request->search}%")
                  ->orWhere('barcode', 'LIKE', "%{$request->search}%");
            });
        }

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        if ($request->has('low_stock') && $request->low_stock) {
            $query->lowStock();
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $query->orderBy($request->get('sort_by', 'name'), $request->get('sort_order', 'asc'));

        return response()->json($query->paginate($request->get('per_page', 20)));
    }

    public function store(Request $request)
    {
        if ($request->has('barcode') && ($request->barcode === '' || $request->barcode === null)) {
            $request->merge(['barcode' => null]);
        }
        if ($request->has('sub_category_id') && ($request->sub_category_id === '' || $request->sub_category_id === null)) {
            $request->merge(['sub_category_id' => null]);
        }
        if ($request->has('category_id') && ($request->category_id === '' || $request->category_id === null)) {
            $request->merge(['category_id' => null]);
        }

        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'item_code' => ['required', 'string', Rule::unique('inventory_items', 'item_code')->whereNull('deleted_at')],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'min_selling_price' => 'nullable|numeric|min:0',
            'current_stock' => 'required|integer|min:0',
            'reorder_level' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'barcode' => ['nullable', 'string', Rule::unique('inventory_items', 'barcode')->whereNull('deleted_at')],
            'is_active' => 'sometimes|boolean',
            'image' => 'nullable|image|max:2048'
        ]);

        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('inventory', 'public');
            $validated['image'] = $path;
        }

        $item = InventoryItem::create($validated);

        // Create initial stock transaction if current_stock > 0
        if ($item->current_stock > 0) {
            InventoryTransaction::create([
                'inventory_item_id' => $item->id,
                'branch_id' => $item->branch_id,
                'transaction_type' => 'adjustment',
                'quantity' => $item->current_stock,
                'unit_price' => $item->purchase_price,
                'total_price' => $item->purchase_price * $item->current_stock,
                'reference_type' => 'initial',
                'reference_id' => null,
                'created_by' => auth()->id(),
                'notes' => 'Initial stock entry'
            ]);
        }

        return response()->json($item, 201);
    }

    private function resolveInventoryItem($inventory): InventoryItem
    {
        if ($inventory instanceof InventoryItem && $inventory->exists) {
            return $inventory;
        }
        $id = is_object($inventory) ? ($inventory->id ?? null) : $inventory;
        if (!$id) {
            $id = request()->route('inventory') ?? request()->route('inventoryItem') ?? request()->route('id');
        }
        return InventoryItem::findOrFail($id);
    }

    public function show($inventoryItem)
    {
        $inventoryItem = $this->resolveInventoryItem($inventoryItem);

        if ($inventoryItem->current_stock > 0 && $inventoryItem->transactions()->count() === 0) {
            \App\Models\InventoryTransaction::create([
                'inventory_item_id' => $inventoryItem->id,
                'branch_id' => $inventoryItem->branch_id,
                'transaction_type' => 'initial',
                'quantity' => $inventoryItem->current_stock,
                'unit_price' => $inventoryItem->purchase_price,
                'total_price' => $inventoryItem->purchase_price * $inventoryItem->current_stock,
                'reference_type' => 'initial',
                'reference_id' => null,
                'created_by' => auth()->id() ?? 1,
                'notes' => 'Initial stock balance'
            ]);
        }

        return response()->json($inventoryItem->load(['category', 'subCategory', 'branch', 'transactions' => function($q) {
            $q->with('creator')->latest()->limit(100);
        }]));
    }

    public function update(Request $request, $inventoryItem)
    {
        $inventoryItem = $this->resolveInventoryItem($inventoryItem);

        if ($request->has('barcode') && ($request->barcode === '' || $request->barcode === null)) {
            $request->merge(['barcode' => null]);
        }
        if ($request->has('sub_category_id') && ($request->sub_category_id === '' || $request->sub_category_id === null)) {
            $request->merge(['sub_category_id' => null]);
        }
        if ($request->has('category_id') && ($request->category_id === '' || $request->category_id === null)) {
            $request->merge(['category_id' => null]);
        }

        $rules = [
            'category_id' => 'nullable|exists:categories,id',
            'sub_category_id' => 'nullable|exists:categories,id',
            'item_code' => ['required', 'string', Rule::unique('inventory_items', 'item_code')->ignore($inventoryItem->id)->whereNull('deleted_at')],
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'purchase_price' => 'required|numeric|min:0',
            'selling_price' => 'required|numeric|min:0',
            'min_selling_price' => 'nullable|numeric|min:0',
            'reorder_level' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'barcode' => ['nullable', 'string', Rule::unique('inventory_items', 'barcode')->ignore($inventoryItem->id)->whereNull('deleted_at')],
            'is_active' => 'sometimes|boolean',
        ];

        if ($request->hasFile('image')) {
            $rules['image'] = 'nullable|image|max:2048';
        }

        $validated = $request->validate($rules);

        if ($request->hasFile('image')) {
            if ($inventoryItem->image) {
                \Storage::disk('public')->delete($inventoryItem->image);
            }
            $path = $request->file('image')->store('inventory', 'public');
            $validated['image'] = $path;
        } else {
            unset($validated['image']);
        }

        $inventoryItem->update($validated);
        return response()->json($inventoryItem);
    }

    public function destroy($inventoryItem)
    {
        $inventoryItem = $this->resolveInventoryItem($inventoryItem);

        // Cascade-delete related transaction records
        $inventoryItem->transactions()->delete();

        if ($inventoryItem->image) {
            \Storage::disk('public')->delete($inventoryItem->image);
        }

        $inventoryItem->delete();
        return response()->json(['message' => 'Inventory item deleted successfully']);
    }

    public function adjust(Request $request, $inventoryItem)
    {
        $inventoryItem = $this->resolveInventoryItem($inventoryItem);

        $validated = $request->validate([
            'quantity' => 'required|integer',
            'type' => 'required|in:add,subtract',
            'notes' => 'nullable|string',
            'purchase_price' => 'nullable|numeric',
            'selling_price' => 'nullable|numeric',
            'transaction_type' => 'nullable|string',
        ]);

        if (isset($validated['purchase_price'])) {
            $inventoryItem->purchase_price = $validated['purchase_price'];
        }
        if (isset($validated['selling_price'])) {
            $inventoryItem->selling_price = $validated['selling_price'];
        }

        $quantity = $validated['quantity'];
        $transactionType = $validated['transaction_type'] ?? 'adjustment';

        if ($validated['type'] === 'subtract') {
            if ($inventoryItem->current_stock < $quantity) {
                return response()->json(['error' => 'Insufficient stock'], 400);
            }
            $inventoryItem->current_stock -= $quantity;
        } else {
            $inventoryItem->current_stock += $quantity;
        }
        $inventoryItem->save();

        InventoryTransaction::create([
            'inventory_item_id' => $inventoryItem->id,
            'branch_id' => $inventoryItem->branch_id,
            'transaction_type' => $transactionType,
            'quantity' => $quantity,
            'unit_price' => $inventoryItem->purchase_price,
            'total_price' => $inventoryItem->purchase_price * $quantity,
            'reference_type' => 'manual_adjustment',
            'reference_id' => null,
            'created_by' => auth()->id(),
            'notes' => $validated['notes'] ?? 'Manual adjustment'
        ]);

        return response()->json($inventoryItem);
    }

    public function lowStock()
    {
        return response()->json(InventoryItem::lowStock()->with(['category', 'branch'])->get());
    }

    public function categories(Request $request)
    {
        $query = Category::with('children')->whereNull('parent_id');
        if ($request->has('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }
        return response()->json($query->get());
    }

    // Purchase Order Management
    public function purchaseOrder(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'invoice_number' => 'nullable|string',
            'invoice_date' => 'nullable|date',
            'items' => 'required|array|min:1',
            'items.*.inventory_item_id' => 'required|exists:inventory_items,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.purchase_price' => 'required|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string'
        ]);

        $branchId = auth()->user()->branch_id;

        DB::transaction(function() use ($validated, $branchId) {
            $po = PurchaseOrder::create([
                'branch_id' => $branchId,
                'supplier_id' => $validated['supplier_id'],
                'po_number' => PurchaseOrder::generatePONumber($branchId),
                'invoice_number' => $validated['invoice_number'] ?? null,
                'invoice_date' => $validated['invoice_date'] ?? null,
                'sub_total' => 0,
                'tax' => $validated['tax'] ?? 0,
                'discount' => $validated['discount'] ?? 0,
                'total_amount' => 0,
                'status' => 'ordered',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id()
            ]);

            $subTotal = 0;
            foreach ($validated['items'] as $item) {
                $total = $item['quantity'] * $item['purchase_price'];
                $subTotal += $total;

                PurchaseOrderItem::create([
                    'purchase_order_id' => $po->id,
                    'inventory_item_id' => $item['inventory_item_id'],
                    'quantity' => $item['quantity'],
                    'purchase_price' => $item['purchase_price'],
                    'total_price' => $total,
                    'received_quantity' => 0
                ]);
            }

            $po->sub_total = $subTotal;
            $po->total_amount = $subTotal + $po->tax - $po->discount;
            $po->save();
        });

        return response()->json(['message' => 'Purchase order created successfully']);
    }

    public function receivePurchase(Request $request, PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'ordered') {
            return response()->json(['error' => 'Purchase order is not in ordered state'], 400);
        }

        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.purchase_order_item_id' => 'required|exists:purchase_order_items,id',
            'items.*.received_quantity' => 'required|integer|min:1'
        ]);

        DB::transaction(function() use ($purchaseOrder, $validated) {
            foreach ($validated['items'] as $itemData) {
                $poItem = PurchaseOrderItem::find($itemData['purchase_order_item_id']);
                $quantity = $itemData['received_quantity'];

                // Update received quantity
                $poItem->received_quantity += $quantity;
                $poItem->save();

                // Update inventory stock
                $inventoryItem = $poItem->inventoryItem;
                $inventoryItem->incrementStock(
                    $quantity,
                    'purchase_order',
                    $purchaseOrder->id,
                    auth()->id(),
                    $poItem->purchase_price
                );
            }

            // Mark PO as received if all items received
            $allReceived = $purchaseOrder->items->every(function($item) {
                return $item->received_quantity >= $item->quantity;
            });

            if ($allReceived) {
                $purchaseOrder->status = 'received';
                $purchaseOrder->received_by = auth()->id();
                $purchaseOrder->received_at = now();
                $purchaseOrder->save();
            }
        });

        return response()->json(['message' => 'Purchase order received successfully']);
    }
}