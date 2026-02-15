#!/usr/bin/env node
//
// score-signal — Mechanical scoring rubric for founder signals.
//
// Replaces vibes-based signal strength with a reproducible point system.
// Takes signal attributes as JSON and returns a score + strength label.
//
// Usage:
//   node scripts/score-signal.js '{"phd_defense_months":3,"new_repo":true,"left_faang":true}'
//   echo '{"conference_top_venue":true}' | node scripts/score-signal.js
//
// Rubric:
//   PhD defense in last 6 months ............. +3
//   Left FAANG/top lab in last 90 days ....... +3
//   New GitHub repo with 10+ commits ......... +2
//   Conference talk at top venue ............. +2
//   Multiple converging signals .............. +2
//   Venture-scale problem (TAM >$1B) ......... +2
//   Prior startup experience ................. +2
//   Open-source project with traction ........ +1
//   Active on Twitter/social with tech focus . +1
//   Academic-only pattern (no builder signal)  -2
//   >90 days since last signal ............... -2
//   Already funded (seed+) ................... -3
//
// Strength bands:
//   Strong: 8+  |  Medium: 4-7  |  Weak: 1-3  |  Pass: 0 or below

async function readInput() {
  const arg = process.argv[2];
  if (arg) return JSON.parse(arg);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

const RUBRIC = [
  // Positive signals
  { key: 'phd_defense',        label: 'PhD defense in last 6 months',        points: 3, test: s => s.phd_defense || (s.phd_defense_months != null && s.phd_defense_months <= 6) },
  { key: 'left_faang',         label: 'Left FAANG/top lab in last 90 days',  points: 3, test: s => s.left_faang || s.left_lab || s.departure },
  { key: 'new_repo',           label: 'New GitHub repo with 10+ commits',    points: 2, test: s => s.new_repo || s.active_repo },
  { key: 'conference',         label: 'Conference talk at top venue',         points: 2, test: s => s.conference_top_venue || s.conference },
  { key: 'converging',         label: 'Multiple converging signals',         points: 2, test: s => s.converging_signals || s.multiple_signals },
  { key: 'venture_scale',      label: 'Venture-scale problem (TAM >$1B)',    points: 2, test: s => s.venture_scale || s.large_tam },
  { key: 'prior_startup',      label: 'Prior startup experience',            points: 2, test: s => s.prior_startup || s.prior_exit },
  { key: 'oss_traction',       label: 'Open-source project with traction',   points: 1, test: s => s.oss_traction },
  { key: 'social_active',      label: 'Active on social with tech focus',    points: 1, test: s => s.social_active || s.twitter_active },

  // Negative signals
  { key: 'academic_only',      label: 'Academic-only pattern (no builder)',   points: -2, test: s => s.academic_only },
  { key: 'stale_signal',       label: '>90 days since last signal',          points: -2, test: s => s.stale || s.stale_signal || (s.days_since_signal != null && s.days_since_signal > 90) },
  { key: 'already_funded',     label: 'Already funded (seed+)',              points: -3, test: s => s.already_funded || s.funded },
];

function scoreSignal(signal) {
  let total = 0;
  const breakdown = [];

  for (const rule of RUBRIC) {
    if (rule.test(signal)) {
      total += rule.points;
      breakdown.push({
        label: rule.label,
        points: rule.points,
      });
    }
  }

  let strength;
  if (total >= 8)      strength = 'strong';
  else if (total >= 4) strength = 'medium';
  else if (total >= 1) strength = 'weak';
  else                 strength = 'pass';

  return { score: total, strength, breakdown };
}

async function main() {
  const signal = await readInput();
  const result = scoreSignal(signal);

  // Include name if provided for context
  if (signal.name) result.name = signal.name;

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
