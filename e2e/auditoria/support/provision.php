<?php
// Audit users for e2e/auditoria (run through `php artisan tinker` by support/users.ts).
// Input: env E2E_AUDIT_USERS = JSON [{email, plan, verified, onboarded, reset, quota_exhausted?, trial?}]
// quota_exhausted of a Free account goes to the preview's lifetime row when the API has it (prd-uso-justo §9).
// trial (prd-planos-lancamento): used = ran and ended | active = 7 days from now | tomorrow / today = ends on that
// study day of Brasília. Absent = untouched (a Free verified account is "available": its first material opens it).
// Recreates users marked `reset` (cascade wipes their data). Never touches other accounts.
// Without `reset` an existing user keeps its password (its sessions stay valid): used to mark
// the e-mail as verified in the middle of a test, standing in for the link in the e-mail.

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
    if (! $user->exists) {
        $user->forceFill(['name' => $s['name'] ?? 'Auditoria E2E', 'password' => $password, 'password_set_at' => now()]);
    }
    $user->forceFill([
        'plan' => $s['plan'] ?? 'free',
        'email_verified_at' => ! empty($s['verified']) ? ($user->email_verified_at ?? now()) : null,
        'onboarding_completed_at' => ! empty($s['onboarded']) ? ($user->onboarding_completed_at ?? now()) : null,
        'analytics_consent' => false,
    ])->save();

    if (! empty($s['trial'])) {
        $sp = now('America/Sao_Paulo');
        [$start, $end] = match ($s['trial']) {
            'used' => [now()->subDays(9), now()->subDays(2)],
            'active' => [now(), now()->addDays(7)],
            'tomorrow' => [now()->subDays(6), $sp->copy()->addDay()->setTime(12, 0)->utc()],
            'today' => [now()->subDays(6), $sp->copy()->endOfDay()->subMinute()->utc()],
        };
        $user->forceFill([
            'trial_started_at' => $start,
            'trial_ends_at' => $end,
            'trial_ended_at' => $s['trial'] === 'used' ? $end : null,
        ])->save();
    }

    if (! empty($s['quota_exhausted'])) {
        $period = app(FeatureLimitServiceInterface::class)->currentPeriod();
        // The Free's preview (prd-uso-justo §9) counts in one fixed row per feature that never renews
        $lifetime = $s['plan'] === 'free' && in_array('free', (array) config('feature-limits.lifetime_tiers', []), true);
        $start = $lifetime ? '2000-01-01' : $period['start']->toDateString();
        $end = $lifetime ? '2999-12-31' : $period['end']->toDateString();
        foreach ($s['quota_exhausted'] as $feature => $count) {
            FeatureUsage::updateOrCreate(
                ['user_id' => $user->id, 'feature' => $feature, 'period_start' => $start],
                ['period_end' => $end, 'count' => $count],
            );
        }
    }

    $out[$s['email']] = $user->id;
}

echo 'E2E_AUDIT_RESULT=' . json_encode($out) . "\n";
