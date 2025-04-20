<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ExcelController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('hello-world', function () { return 'hello world'; });
Route::post('upload',       [ExcelController::class, 'upload']);
Route::post('save',         [ExcelController::class, 'saveFiltered']);
Route::get('groups',        [ExcelController::class, 'groups']);
Route::get('export-groups', [ExcelController::class, 'exportGroups']);
Route::post('analyze',      [ExcelController::class, 'analyze']);
Route::post('/filter', [ExcelController::class, 'filter']);
Route::get('/headers', [ExcelController::class, 'getHeaders']);