<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\BranchController;
use App\Http\Controllers\API\JobCardController;
use App\Http\Controllers\API\InventoryController;
use App\Http\Controllers\API\InvoiceController;
use App\Http\Controllers\API\ReportController;
use App\Http\Controllers\API\SMSController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\RoleController;
use App\Http\Controllers\API\NotificationController;
use App\Http\Controllers\API\CategoryController;
use App\Http\Controllers\API\SettingsController;
use App\Http\Controllers\API\AttendanceController;
use App\Http\Controllers\API\AdvanceController;
use App\Http\Controllers\API\PayrollController;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
  
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

   
    Route::apiResource('branches', BranchController::class);


    Route::get('job-cards/live-board', [JobCardController::class, 'liveBoard']);
    Route::get('job-cards/bike-history/{bike_number}', [JobCardController::class, 'bikeHistory']);
    Route::get('job-cards/active', [JobCardController::class, 'activeJobs']);
    Route::get('job-cards/completed', [JobCardController::class, 'completedJobs']);
    Route::post('job-cards/{jobCard}/complete', [JobCardController::class, 'complete']);
    Route::post('job-cards/{jobCard}/convert-to-invoice', [JobCardController::class, 'convertToInvoice']);
    Route::post('job-cards/{jobCard}/upload-images', [JobCardController::class, 'uploadImages']);
    Route::delete('job-cards/{jobCard}/remove-image', [JobCardController::class, 'removeImage']);
    Route::get('job-cards/{jobCard}/print/{language?}', [JobCardController::class, 'print']);
    Route::apiResource('job-cards', JobCardController::class);


    Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('inventory/categories', [InventoryController::class, 'categories']);
    Route::post('inventory/{inventoryItem}/adjust', [InventoryController::class, 'adjust']);
    Route::post('inventory/purchase-order', [InventoryController::class, 'purchaseOrder']);
    Route::post('inventory/purchase-order/{purchaseOrder}/receive', [InventoryController::class, 'receivePurchase']);
    Route::apiResource('inventory', InventoryController::class);
    Route::apiResource('categories', CategoryController::class);


    Route::post('invoices/{invoice}/cancel', [InvoiceController::class, 'cancel']);
    Route::apiResource('invoices', InvoiceController::class);


    Route::get('reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('reports/job-cards', [ReportController::class, 'jobCardReport']);
    Route::get('reports/inventory', [ReportController::class, 'inventoryReport']);
    Route::get('reports/financial', [ReportController::class, 'financialReport']);
    Route::get('reports/stock-movements', [ReportController::class, 'stockMovementReport']);


    Route::post('sms/send', [SMSController::class, 'send']);
    Route::post('sms/test', [SMSController::class, 'test']);
    Route::get('sms/logs', [SMSController::class, 'logs']);
    Route::post('sms/webhook', [SMSController::class, 'webhook']);

    Route::get('users/roles', [UserController::class, 'roles']);
    Route::get('users/permissions', [UserController::class, 'permissions']);
    Route::get('users/profile', [UserController::class, 'profile']);
    Route::get('users/field-staff', [UserController::class, 'fieldStaff']); // reference data — no special permission needed
    Route::put('users/profile', [UserController::class, 'updateProfile']);
    Route::get('users/{user}/permissions', [UserController::class, 'getUserPermissions']);
    Route::post('users/{user}/permissions', [UserController::class, 'assignPermissions']);
    Route::apiResource('users', UserController::class);
    Route::get('roles', [UserController::class, 'roles']);

    // Role CRUD (create / update permissions / delete)
    Route::post('roles', [RoleController::class, 'store']);
    Route::put('roles/{role}', [RoleController::class, 'update']);
    Route::delete('roles/{role}', [RoleController::class, 'destroy']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('notifications/clear-all', [NotificationController::class, 'clearAll']);
    Route::post('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);

    // System Settings
    Route::get('system-settings', [SettingsController::class, 'index']);
    Route::put('system-settings', [SettingsController::class, 'update']);

    // Attendance Tracker
    Route::get('attendance', [AttendanceController::class, 'index']);
    Route::post('attendance', [AttendanceController::class, 'store']);
    Route::get('attendance/monthly-stats', [AttendanceController::class, 'monthlyStats']);

    // Employee Advances & Bonuses
    Route::get('advances', [AdvanceController::class, 'index']);
    Route::post('advances', [AdvanceController::class, 'store']);
    Route::delete('advances/{advance}', [AdvanceController::class, 'destroy']);

    // Payroll System
    Route::get('payroll/dashboard', [PayrollController::class, 'summaryDashboard']);
    Route::get('payroll/preview', [PayrollController::class, 'preview']);
    Route::get('payroll/runs', [PayrollController::class, 'index']);
    Route::get('payroll/runs/{payrollRun}', [PayrollController::class, 'show']);
    Route::post('payroll/runs', [PayrollController::class, 'store']);
    Route::patch('payroll/runs/{payrollRun}/status', [PayrollController::class, 'updateStatus']);
    Route::get('payroll/runs/{payrollRun}/export-eft', [PayrollController::class, 'exportEFT']);

    Route::get('/ping', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toIso8601String(),
        'message' => 'Deployment test successful!'
    ]);
});
});
