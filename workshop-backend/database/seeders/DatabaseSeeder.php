<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Branch;
use App\Models\Category;
use App\Models\InventoryItem;
use Spatie\Permission\Models\Role;
use App\Models\JobCard;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        // Create Roles
        $roles = [
            'admin' => 'Admin',
            'manager' => 'Manager',
            'cashier' => 'Cashier',
            'mechanic' => 'Mechanic',
            'service_agent' => 'Service Agent',
            'job_card_user' => 'Job Card User'
        ];

        foreach ($roles as $name => $displayName) {
            Role::create(['name' => $name, 'guard_name' => 'web']);
        }

        // Create Default Branch
        $branch = Branch::create([
            'name' => 'Main Workshop',
            'address' => '123 Main Street, Colombo',
            'phone' => '+94123456789',
            'email' => 'info@workshop.com',
            'tax_id' => 'TAX123456',
            'is_active' => true
        ]);

        // Create Admin User
        $admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@workshop.com',
            'password' => Hash::make('password'),
            'phone' => '+94123456789',
            'branch_id' => $branch->id,
            'employee_id' => 'EMP001',
            'joining_date' => now(),
            'is_active' => true
        ]);
        $admin->assignRole('admin');

        // Create Manager
        $manager = User::create([
            'name' => 'Manager User',
            'email' => 'manager@workshop.com',
            'password' => Hash::make('password'),
            'phone' => '+94123456789',
            'branch_id' => $branch->id,
            'employee_id' => 'EMP002',
            'joining_date' => now(),
            'is_active' => true
        ]);
        $manager->assignRole('manager');

        // Create Mechanic
        $mechanic = User::create([
            'name' => 'Mechanic User',
            'email' => 'mechanic@workshop.com',
            'password' => Hash::make('password'),
            'phone' => '+94123456789',
            'branch_id' => $branch->id,
            'employee_id' => 'EMP003',
            'joining_date' => now(),
            'is_active' => true
        ]);
        $mechanic->assignRole('mechanic');

        // Create Categories
        $categories = [
            ['name' => 'Oil', 'code' => 'OIL'],
            ['name' => 'Filters', 'code' => 'FIL'],
            ['name' => 'Batteries', 'code' => 'BAT'],
            ['name' => 'Brakes', 'code' => 'BRK'],
            ['name' => 'Suspension', 'code' => 'SUS'],
            ['name' => 'Engine Parts', 'code' => 'ENG'],
            ['name' => 'Electrical', 'code' => 'ELE'],
            ['name' => 'Body Parts', 'code' => 'BOD'],
        ];

        foreach ($categories as $cat) {
            Category::create([
                'name' => $cat['name'],
                'code' => $cat['code'],
                'branch_id' => $branch->id,
                'is_active' => true
            ]);
        }

        // Create Sub-categories (example for Oil)
        $oilCategory = Category::where('code', 'OIL')->first();
        if ($oilCategory) {
            Category::create([
                'name' => 'Engine Oil',
                'code' => 'EOIL',
                'parent_id' => $oilCategory->id,
                'branch_id' => $branch->id,
                'is_active' => true
            ]);
            Category::create([
                'name' => 'Gear Oil',
                'code' => 'GOIL',
                'parent_id' => $oilCategory->id,
                'branch_id' => $branch->id,
                'is_active' => true
            ]);
        }

        // Create Inventory Items
        $oilSub = Category::where('code', 'EOIL')->first();
        $filterCat = Category::where('code', 'FIL')->first();

        InventoryItem::create([
            'branch_id' => $branch->id,
            'category_id' => $oilCategory->id,
            'sub_category_id' => $oilSub->id,
            'item_code' => '10W-30-800-ML',
            'name' => 'MOTUL OIL 10W-30 800ml',
            'purchase_price' => 2600.00,
            'selling_price' => 2800.00,
            'min_selling_price' => 2500.00,
            'reorder_level' => 10,
            'current_stock' => 59,
            'unit' => 'Bottle',
            'is_active' => true
        ]);

        InventoryItem::create([
            'branch_id' => $branch->id,
            'category_id' => $filterCat->id,
            'sub_category_id' => null,
            'item_code' => 'AIR-FILTER-001',
            'name' => 'Air Filter - Generic',
            'purchase_price' => 450.00,
            'selling_price' => 600.00,
            'min_selling_price' => 500.00,
            'reorder_level' => 5,
            'current_stock' => 12,
            'unit' => 'pcs',
            'is_active' => true
        ]);

        // Create a few sample job cards for demo
        JobCard::factory(10)->create([
            'branch_id' => $branch->id,
            'prepared_by' => $admin->id,
            'mechanic_id' => $mechanic->id,
        ]);
    }
}