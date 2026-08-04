// src/lib/grades.ts
// Transparent grade calculation engine for Beacon
// Used by both teacher live preview and parent "exactly how this was calculated" view

import type { GradeCategory, Assignment, Grade, TransparentResult, BreakdownItem } from './types';

export const DEFAULT_ABEKA_SCALE = [
  { min: 94, letter: 'A' },
  { min: 90, letter: 'A-' },
  { min: 87, letter: 'B+' },
  { min: 84, letter: 'B' },
  { min: 80, letter: 'B-' },
  { min: 77, letter: 'C+' },
  { min: 74, letter: 'C' },
  { min: 70, letter: 'C-' },
  { min: 67, letter: 'D+' },
  { min: 64, letter: 'D' },
  { min: 60, letter: 'D-' },
  { min: 0, letter: 'F' },
];

export function getLetterGrade(pct: number, scale = DEFAULT_ABEKA_SCALE): string {
  for (const { min, letter } of scale) {
    if (pct >= min) return letter;
  }
  return 'F';
}

export function validateCategoryWeights(categories: { weight: number }[]): {
  ok: boolean;
  sum: number;
  message: string;
} {
  const sum = categories.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const rounded = Math.round(sum * 10) / 10;
  if (Math.abs(rounded - 100) < 0.5) {
    return { ok: true, sum: rounded, message: 'Weights sum to 100%' };
  }
  return {
    ok: false,
    sum: rounded,
    message: `Weights currently sum to ${rounded}%. They should total 100%.`,
  };
}

/**
 * Calculate a fully transparent grade result.
 * Supports drop_lowest, missing-as-zero, assignment-level details, and formula generation.
 */
export function calculateTransparentGrade(
  categories: GradeCategory[],
  assignments: Assignment[],
  grades: Grade[],
  options: {
    missingAsZero?: boolean;
    letterScale?: typeof DEFAULT_ABEKA_SCALE;
  } = {}
): TransparentResult {
  const { missingAsZero = true, letterScale = DEFAULT_ABEKA_SCALE } = options;

  const gradeMap = new Map(grades.map((g) => [g.assignment_id, g]));
  let missingCount = 0;

  // Build per-category list of percentage details
  const catItems: Record<
    string,
    { pct: number; title: string; score: number | null; max: number; missing: boolean; extra: boolean; id: string }[]
  > = {};

  for (const a of assignments) {
    const g = gradeMap.get(a.id);
    const maxP = Number(a.max_points) > 0 ? Number(a.max_points) : 100;
    const isExtra = Boolean(a.is_extra_credit);

    // No grade row at all = missing work (was previously skipped, undercounting)
    if (!g || g.is_missing || g.score === null) {
      missingCount++;
      if (!missingAsZero) continue;
      const catId = a.category_id || 'uncategorized';
      if (!catItems[catId]) catItems[catId] = [];
      catItems[catId].push({
        pct: 0,
        title: a.title,
        score: null,
        max: maxP,
        missing: true,
        extra: isExtra,
        id: a.id,
      });
      continue;
    }

    const score = Number(g.score);
    const pct = (score / maxP) * 100;
    const catId = a.category_id || 'uncategorized';
    if (!catItems[catId]) catItems[catId] = [];
    catItems[catId].push({
      pct,
      title: a.title,
      score,
      max: maxP,
      missing: false,
      extra: isExtra,
      id: a.id,
    });
  }

  const breakdown: BreakdownItem[] = [];
  let overall = 0;
  const formulaParts: string[] = [];

  for (const cat of categories) {
    let items = catItems[cat.id] || [];
    const drop = Number(cat.drop_lowest) || 0;
    let dropped = 0;

    // Drop lowest *completed* scores only — do not drop missing (0%) first
    if (drop > 0 && items.length > drop) {
      const completed = items.filter((i) => !i.missing);
      const missing = items.filter((i) => i.missing);
      if (completed.length > drop) {
        const sorted = [...completed].sort((a, b) => a.pct - b.pct);
        const keptCompleted = sorted.slice(drop);
        items = [...keptCompleted, ...missing];
        dropped = drop;
      } else if (completed.length > 0) {
        // Drop all completed lows possible, keep missing for average-as-zero policy
        items = missing;
        dropped = completed.length;
      }
    }

    const scores = items.map((i) => i.pct);
    const avg = scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null;
    const weight = Number(cat.weight) || 0;
    const contribution = avg !== null ? (avg * weight) / 100 : 0;
    overall += contribution;

    breakdown.push({
      name: cat.name,
      weight,
      average: avg !== null ? Math.round(avg * 10) / 10 : null,
      contribution: Math.round(contribution * 10) / 10,
      count: scores.length,
      dropped,
      assignments: (catItems[cat.id] || []).map((i) => ({
        title: i.title,
        score: i.score,
        max: i.max,
        pct: Math.round(i.pct * 10) / 10,
        missing: i.missing,
        extra: i.extra,
      })),
    });

    if (avg !== null) {
      formulaParts.push(`${cat.name} ${avg.toFixed(1)}% × ${weight}%`);
    }
  }

  const overallRounded = Math.round(overall * 10) / 10;
  const formula =
    formulaParts.length > 0
      ? formulaParts.join(' + ') + ` = ${overallRounded}%`
      : 'No graded assignments yet';

  return {
    overall: overallRounded,
    letter: formulaParts.length > 0 ? getLetterGrade(overallRounded, letterScale) : null,
    breakdown,
    formula,
    missingCount,
  };
}
