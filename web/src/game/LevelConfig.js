// Level data and reward rules. Pure data/logic shared with Cloud Functions.
// Add or tune levels here; the map and the server read the same definitions.

export const FOODS = Object.freeze([
  { key: 'broast', name: 'بروست' },
  { key: 'shawarma', name: 'شاورما' },
  { key: 'pizza', name: 'بيتزا' },
  { key: 'burger', name: 'برجر' },
  { key: 'club', name: 'كلوب ساندوتش' },
  { key: 'fries', name: 'بطاطس' },
]);

export const FOOD_KEYS = FOODS.map((f) => f.key);
export const FOOD_NAMES = Object.fromEntries(FOODS.map((f) => [f.key, f.name]));

export const MEALS = Object.freeze({
  bucket: { key: 'bucket', name: 'دلو بروست' },
  pizzaBox: { key: 'pizzaBox', name: 'بيتزا كاملة' },
  burgerMeal: { key: 'burgerMeal', name: 'وجبة برجر' },
  shawarmaPlate: { key: 'shawarmaPlate', name: 'طبق شاورما' },
});

export const SCORING = Object.freeze({
  perPiece: 10,
  rocketCreated: 30,
  bombCreated: 60,
  specialActivated: 40,
  movesLeftBonus: 60,
});

export const REWARD_RULES = Object.freeze({
  starBonus: 5,
  // Coins are granted only the first time a level is completed.
  firstCompletionOnly: true,
});

const MEAL_ROTATION = ['bucket', 'pizzaBox', 'burgerMeal', 'shawarmaPlate'];
const MEAL_FOOD = { bucket: 'broast', pizzaBox: 'pizza', burgerMeal: 'burger', shawarmaPlate: 'shawarma' };

function buildLevel(id) {
  const typeCount = id <= 12 ? 5 : 6;
  const types = FOOD_KEYS.slice(0, typeCount);
  const mealKey = MEAL_ROTATION[(id - 1) % MEAL_ROTATION.length];
  const mealFood = MEAL_FOOD[mealKey];
  const goalCount = id <= 3 ? 1 : id <= 10 ? 2 : 3;

  const goalTypes = [mealFood];
  for (let i = 1; goalTypes.length < goalCount; i++) {
    const candidate = types[(types.indexOf(mealFood) + i * 2 + Math.floor(id / 4)) % types.length];
    if (!goalTypes.includes(candidate)) goalTypes.push(candidate);
  }

  // Tuned with `npm run simulate` (greedy bot win rate ~100% early -> ~50% at level 30).
  let perGoal;
  let moves;
  if (typeCount === 5) {
    perGoal = [0, 16, 18, 21, 18, 19, 20, 21, 22, 23, 24, 22, 24][id];
    moves = id <= 3 ? 12 : id <= 10 ? 14 : 16;
  } else {
    perGoal = Math.round(18 + (id - 13) * 0.45);
    moves = 24 - Math.floor((id - 13) / 6);
  }
  const goals = goalTypes.map((type) => ({ type, count: perGoal }));

  const mealPieces = goals[0].count;
  return {
    id,
    moves,
    types,
    goals,
    baseCoins: 10 + Math.floor(id / 3) * 2,
    starScores: [perGoal * goalCount * 22, perGoal * goalCount * 34],
    meal: {
      key: mealKey,
      snowLayers: Math.min(3 + Math.floor(id / 5), 6),
      revealType: mealFood,
      revealPieces: mealPieces,
      bonusCoins: 5 + Math.floor(id / 4),
    },
    specials: { rocket: true, bomb: true },
  };
}

export const LEVEL_COUNT = 30;
export const LEVELS = Object.freeze(Array.from({ length: LEVEL_COUNT }, (_, i) => Object.freeze(buildLevel(i + 1))));

export function getLevel(id) {
  return LEVELS[id - 1] ?? null;
}

export function goalsComplete(level, collected) {
  return level.goals.every((g) => (collected[g.type] ?? 0) >= g.count);
}

export function mealProgress(level, collected) {
  if (!level.meal) return 0;
  return Math.min(1, (collected[level.meal.revealType] ?? 0) / level.meal.revealPieces);
}

export function computeStars(level, score) {
  let stars = 1;
  if (score >= level.starScores[0]) stars++;
  if (score >= level.starScores[1]) stars++;
  return stars;
}

export function computeReward(level, result) {
  if (!result || result.status !== 'won') return { stars: 0, coins: 0, mealRevealed: false };
  const stars = computeStars(level, result.score);
  const mealRevealed = Boolean(level.meal) && mealProgress(level, result.collected) >= 1;
  const coins =
    level.baseCoins + (stars - 1) * REWARD_RULES.starBonus + (mealRevealed ? level.meal.bonusCoins : 0);
  return { stars, coins, mealRevealed };
}
