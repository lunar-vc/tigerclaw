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
//   node scripts/score-signal.js --graph '{"name":"Jane Doe","slug":"jane-doe","phd_defense":true}'
//
// Rubric:
//   PhD defense in last 6 months ............. +3
//   Left FAANG/top lab in last 90 days ....... +3
//   Network gravity (co-author of anchor) .... +3 (via external score)
//   New GitHub repo with 10+ commits ......... +2
//   Conference talk at top venue ............. +2
//   Patent filing (first inventor) ........... +2
//   Venture-scale problem (TAM >$1B) ......... +2
//   Prior startup experience ................. +2
//   Convergence bonus (auto: 3+ signals) ..... +2
//   Open-source project with traction ........ +1
//   Active on Twitter/social with tech focus . +1
//   Advisor prestige (known founder/top lab) . +1
//   Recency: 0-30 days ...................... +1
//   Recency: 31-90 days ..................... +0
//   Recency: 91-180 days ................... -1
//   Recency: >180 days ..................... -2
//   Academic at top-10 lab with GitHub ...... -1
//   Academic-only (no builder signals) ...... -2
//   Already funded (seed+) .................. -3
//   Graph proximity bonus .................... +0 to +3 (with --graph)
//
// Strength bands:
//   Strong: 7+  |  Medium: 4-6  |  Weak: 1-3  |  Pass: 0 or below

async function readInput() {
  const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const arg = args[0];
  if (arg) return JSON.parse(arg);
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString());
}

const RUBRIC = [
  // Positive signals
  { key: 'phd_defense',        label: 'PhD defense in last 6 months',        points: 3, test: s => s.phd_defense || (s.phd_defense_months != null && s.phd_defense_months <= 6) },
  { key: 'left_faang',         label: 'Left FAANG/top lab in last 90 days',  points: 3, test: s => s.left_faang || s.left_lab || s.departure },
  { key: 'network_gravity',    label: 'Network gravity (co-author of anchor)', points: 3, test: s => s.network_gravity || s.network_gravity_score >= 5 },
  { key: 'new_repo',           label: 'New GitHub repo with 10+ commits',    points: 2, test: s => s.new_repo || s.active_repo },
  { key: 'conference',         label: 'Conference talk at top venue',         points: 2, test: s => s.conference_top_venue || s.conference },
  { key: 'patent_filing',      label: 'Patent filing (first inventor)',       points: 2, test: s => s.patent_filing || s.patent },
  { key: 'venture_scale',      label: 'Venture-scale problem (TAM >$1B)',    points: 2, test: s => s.venture_scale || s.large_tam },
  { key: 'prior_startup',      label: 'Prior startup experience',            points: 2, test: s => s.prior_startup || s.prior_exit },
  // Convergence is auto-calculated below, not a manual flag
  { key: 'oss_traction',       label: 'Open-source project with traction',   points: 1, test: s => s.oss_traction },
  { key: 'social_active',      label: 'Active on social with tech focus',    points: 1, test: s => s.social_active || s.twitter_active },
  { key: 'advisor_prestige',   label: 'Advisor prestige (known founder/top lab)', points: 1, test: s => s.advisor_prestige || s.prestigious_advisor },

  // Negative signals — academic split
  { key: 'academic_top_lab',   label: 'Academic at top-10 lab with GitHub',  points: -1, test: s => s.academic_top_lab || (s.academic_only && s.top_lab && (s.new_repo || s.active_repo || s.oss_traction)) },
  { key: 'academic_only',      label: 'Academic-only pattern (no builder)',   points: -2, test: s => s.academic_only && !s.academic_top_lab && !(s.top_lab && (s.new_repo || s.active_repo || s.oss_traction)) },
  { key: 'already_funded',     label: 'Already funded (seed+)',              points: -3, test: s => s.already_funded || s.funded },
];

// Recency gradient — replaces flat stale_signal penalty
function recencyPoints(signal) {
  const days = signal.days_since_signal;
  if (days == null && !signal.stale && !signal.stale_signal) return null;

  // If only boolean stale flag is set, treat as >180 days
  if (days == null) {
    if (signal.stale || signal.stale_signal) return { points: -2, label: 'Stale signal (>180 days)' };
    return null;
  }

  if (days <= 30) return { points: 1, label: 'Recent signal (0-30 days)' };
  if (days <= 90) return { points: 0, label: 'Signal 31-90 days old' };
  if (days <= 180) return { points: -1, label: 'Signal 91-180 days old' };
  return { points: -2, label: 'Stale signal (>180 days)' };
}

function scoreSignal(signal) {
  let total = 0;
  const breakdown = [];
  let positiveCount = 0;

  for (const rule of RUBRIC) {
    if (rule.test(signal)) {
      total += rule.points;
      breakdown.push({
        key: rule.key,
        label: rule.label,
        points: rule.points,
      });
      if (rule.points > 0) positiveCount++;
    }
  }

  // Recency gradient
  const recency = recencyPoints(signal);
  if (recency && recency.points !== 0) {
    total += recency.points;
    breakdown.push({
      key: 'recency',
      label: recency.label,
      points: recency.points,
    });
    if (recency.points > 0) positiveCount++;
  }

  // Auto-detect convergence: 3+ positive rules trigger +2 bonus
  // Manual converging_signals flag also still works
  const hasConvergence = signal.converging_signals || signal.multiple_signals || positiveCount >= 3;
  if (hasConvergence) {
    total += 2;
    breakdown.push({
      key: 'converging',
      label: positiveCount >= 3
        ? `Converging signals (${positiveCount} positive signals detected)`
        : 'Multiple converging signals',
      points: 2,
    });
  }

  let strength;
  if (total >= 7)      strength = 'strong';
  else if (total >= 4) strength = 'medium';
  else if (total >= 1) strength = 'weak';
  else                 strength = 'pass';

  return { score: total, strength, breakdown };
}

async function main() {
  const useGraph = process.argv.includes('--graph');
  const signal = await readInput();
  const result = scoreSignal(signal);

  // Include name if provided for context
  if (signal.name) result.name = signal.name;

  // Graph proximity bonus (optional, skipped for already-funded)
  if (useGraph) {
    const isAlreadyFunded = signal.already_funded || signal.funded;
    const slug = signal.slug || signal.name?.toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (slug && !isAlreadyFunded) {
      try {
        const { open, close, ensure } = await import('./graph.js');
        const { computeProximityBonus } = await import('./graph-score.js');
        const { db, graph } = await open();
        try {
          await ensure(graph);
          const proximity = await computeProximityBonus(graph, slug, { alreadyFunded: false });
          if (proximity.bonus > 0) {
            result.score += proximity.bonus;
            result.breakdown.push({
              label: `Graph proximity bonus`,
              points: proximity.bonus,
            });
            // Recalculate strength band with bonus
            if (result.score >= 8)      result.strength = 'strong';
            else if (result.score >= 4) result.strength = 'medium';
            else if (result.score >= 1) result.strength = 'weak';
            else                        result.strength = 'pass';
          }
          result.graph_bonus = proximity.bonus;
          result.graph_raw = proximity.raw;
          result.graph_explanation = proximity.explanation;
        } finally {
          await close(db);
        }
      } catch (err) {
        result.graph_bonus = 0;
        result.graph_explanation = `Graph unavailable: ${err.message}`;
      }
    } else {
      result.graph_bonus = 0;
      result.graph_explanation = isAlreadyFunded
        ? 'Skipped: already funded'
        : 'Skipped: no slug';
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch(err => {
  console.error(JSON.stringify({ ok: false, error: err.message }));
  process.exit(1);
});
