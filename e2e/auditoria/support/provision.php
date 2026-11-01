<?php
// Audit users for e2e/auditoria (run through `php artisan tinker` by support/users.ts).
// Input: env E2E_AUDIT_USERS = JSON [{email, plan, verified, onboarded, reset, quota_exhausted?}]
// Recreates users marked `reset` (cascade wipes their data). Never touches other accounts.

use App\Domain\User\Models\User;
use App\Domain\Credit\Models\FeatureUsage;
use App\Domain\Credit\Services\Contracts\FeatureLimitServiceInterface;

if (app()->isProduction()) { throw new RuntimeException("REFUSED in production"); }

$specs = json_decode(getenv('E2E_AUDIT_USERS') ?: '[]', true);
$password = getenv('E2E_AUDIT_PASSWORD') ?: 'Senha-Audit-2026';
$out = [];

foreach ($specs as $s) {
    if (! preg_match('/^e2e-[a-z0-9.+-]+@audit\.test$/', $s['email'])) { echo "SKIP {$s['email']}\n"; continue; }

    if (! empty($s['reset'])) {
        User::where('email', $s['email'])->get()->each->forceDelete();
    }

    $user = User::firstOrNew(['email' => $s['email']]);
    $user->forceFill([
        'name' => $s['name'] ?? 'Auditoria E2E',
        'password' => $password,
        'plan' => $s['plan'] ?? 'free',
        'email_verified_at' => ! empty($s['verified']) ? ($user->email_verified_at ?? now()) : null,
        'onboarding_completed_at' => ! empty($s['onboarded']) ? ($user->onboarding_completed_at ?? now()) : null,
        'analytics_consent' => false,
        'password_set_at' => now(),
    ])->save();

    if (! empty($s['quota_exhausted'])) {
        $period = app(FeatureLimitServiceInterface::class)->currentPeriod();
        foreach ($s['quota_exhausted'] as $feature => $count) {
            FeatureUsage::updateOrCreate(
                ['user_id' => $user->id, 'feature' => $feature, 'period_start' => $period['start']->toDateString()],
                ['period_end' => $period['end']->toDateString(), 'count' => $count],
            );
        }
    }

    $out[$s['email']] = $user->id;
}

echo 'E2E_AUDIT_RESULT=' . json_encode($out) . "\n";
