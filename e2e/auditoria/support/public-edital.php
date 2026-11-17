<?php
// A ready public reading of the edital verticalizado (prd-edital-verticalizado-publico), straight in the local database:
// stands in for the reading (Turnstile + AI) that e2e never runs. The apply that follows is real.
// Output: E2E_PUBLIC_EDITAL_ID=<ulid>

use App\Domain\Topic\Enums\PublicEditalStatus;
use App\Domain\Topic\Models\PublicEditalReading;
use Illuminate\Support\Str;

if (app()->isProduction()) { throw new RuntimeException("REFUSED in production"); }

$proposal = [
    'name' => 'TRT E2E Entrada · Analista',
    'exam_date' => null,
    'subjects' => [
        ['name' => 'Língua Portuguesa', 'topics' => [['name' => 'Crase', 'description' => null], ['name' => 'Concordância verbal', 'description' => null]]],
        ['name' => 'Direito Constitucional', 'topics' => [['name' => 'Direitos fundamentais', 'description' => 'Arts. 5º a 17'], ['name' => 'Organização do Estado', 'description' => null]]],
    ],
];
$reading = PublicEditalReading::create([
    'id' => strtolower((string) Str::ulid()), 'status' => PublicEditalStatus::Ready, 'source_hash' => hash('sha256', 'e2e-entrada-'.Str::random(12)), 'input_kind' => 'text',
    'result' => ['proposal' => $proposal, 'counts' => ['subjects' => 2, 'topics' => 4]],
    'ip_hash' => str_repeat('e', 64), 'net_hash' => str_repeat('e', 64), 'last_viewed_at' => now(),
]);
echo "E2E_PUBLIC_EDITAL_ID={$reading->id}\n";
