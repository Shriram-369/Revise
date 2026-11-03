// Dates are plain YYYY-MM-DD strings supplied by the client, so "today" matches the user's timezone.
export const RATINGS = ['again', 'hard', 'good', 'easy'];
const QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };

export const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// SM-2 with small tweaks: "hard" shortens the interval, "easy" lengthens it.
export function schedule({ ease, interval, reps }, rating, today) {
  const q = QUALITY[rating];
  if (q < 3) { reps = 0; interval = 1; }
  else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(interval * ease);
    if (rating === 'hard') interval = Math.max(1, Math.round(interval * 0.8));
    if (rating === 'easy') interval = Math.round(interval * 1.3);
  }
  ease = Math.max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  return { ease, interval, reps, nextReview: addDays(today, interval) };
}
