#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const INGREDIENTS_FILE = path.join(ROOT, "ingredients.js");
const NUTRITION_DATA_FILE = path.join(ROOT, "nutrition-data.js");
const USDA_KEY_FILE = path.join(ROOT, "USDA_API_KEY");
const REPORT_FILE = path.join(ROOT, "nutrition-match-report.json");
const FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

const args = new Set(process.argv.slice(2));
const refreshAll = args.has("--all");
const dryRun = args.has("--dry-run");
const verbose = args.has("--verbose");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readTextIfExists = (file) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return "";
    }

    throw error;
  }
};

const loadCatalog = () => {
  const source = `${fs.readFileSync(INGREDIENTS_FILE, "utf8")}
globalThis.__foodplan = { Ingredient, ingredientCatalog, ingredientNutrition, nutrition };`;
  const context = {};

  vm.runInNewContext(source, context, { filename: INGREDIENTS_FILE });

  return context.__foodplan;
};

const loadExistingNutritionData = (Ingredient, nutrition) => {
  const source = `${readTextIfExists(NUTRITION_DATA_FILE)}
globalThis.__nutritionData = typeof nutritionData === "undefined" ? {} : nutritionData;`;
  const context = { Ingredient, nutrition };

  vm.runInNewContext(source, context, { filename: NUTRITION_DATA_FILE });

  return context.__nutritionData;
};

const readApiKey = () => {
  const key = process.env.FDC_API_KEY || process.env.USDA_API_KEY || readTextIfExists(USDA_KEY_FILE);

  if (!key.trim()) {
    throw new Error("Missing USDA API key. Set FDC_API_KEY or put it in USDA_API_KEY.");
  }

  return key.trim();
};

const appendParam = (url, key, value) => {
  if (Array.isArray(value)) {
    value.filter(Boolean).forEach((item) => url.searchParams.append(key, item));
    return;
  }

  if (value !== undefined && value !== "") {
    url.searchParams.set(key, value);
  }
};

const fdcFetch = async (apiKey, pathname, params = {}) => {
  const url = new URL(`${FDC_BASE_URL}${pathname}`);

  Object.entries({ api_key: apiKey, ...params }).forEach(([key, value]) => {
    appendParam(url, key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    const safeUrl = new URL(url);

    safeUrl.searchParams.set("api_key", "REDACTED");

    throw new Error(`FDC ${response.status} ${response.statusText} for ${safeUrl}: ${body}`);
  }

  return response.json();
};

const words = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
    .filter(Boolean);

const rawWords = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const SEARCH_STOP_WORDS = new Set([
  "and",
  "baby",
  "classic",
  "fresh",
  "large",
  "mix",
  "sliced",
  "strips",
]);

const CATEGORY_HINTS = {
  Bakery: ["bread", "tortilla", "pita", "muffin", "toast"],
  "Canned goods": ["canned"],
  Carb: ["rice", "quinoa", "bread", "tortilla", "pita", "oats"],
  Condiment: ["sauce", "dressing", "condiment"],
  Dairy: ["cheese", "yogurt", "skyr"],
  Fruit: ["raw", "fruit"],
  Pantry: ["nuts", "seeds", "butter", "cereal"],
  Protein: ["chicken", "turkey", "beef", "tuna", "salmon", "tofu"],
  Vegetable: ["raw", "vegetable"],
};

const DATA_TYPE_SCORE = {
  Foundation: 22,
  "SR Legacy": 24,
  "Survey (FNDDS)": 12,
  Branded: -10,
};

const FDC_ID_OVERRIDES = {
  almonds: 2346393,
  chipotleSauce: 2705619,
  romaineSalad: 2346389,
  jasmineRice: 2708408,
  eggs: 171287,
  wholeWheatToast: 2707710,
  cannedTuna: 173709,
  mayo: 171009,
  caesarSaladKit: 2469726,
  cheddarCheese: 170899,
  hummus: 174289,
  orange: 169918,
  walnuts: 2346394,
  pumpkinSeeds: 170556,
  blackBeans: 175188,
  frozenPeas: 170017,
  springMix: 2709792,
  cookedBasmatiRice: 2708408,
  greenBeans: 2346400,
  zucchini: 2685568,
  eggWhites: 172183,
  pita: 2707616,
  cannedChicken: 171099,
  wholeWheatBread: 2707709,
  mustard: 172234,
  southwestSaladKit: 2409148,
  choppedGardenSaladKit: 2706810,
  roastBeef: 174570,
  swissCheese: 171251,
  roastedRedPepperHummus: 174289,
  tzatziki: 2705448,
  snapPeas: 170010,
  frozenVegetableCurryBowl: 2710068,
  muesli: 2671842,
};

const BAD_CATEGORY_TERMS = {
  Carb: ["cracker", "snack"],
  Condiment: ["dry mix"],
  Fruit: ["pepper", "bread", "chip", "juice", "dessert"],
  Pantry: ["candy", "chocolate"],
  Protein: ["breaded", "fried", "nugget"],
  Vegetable: ["dog", "sauce", "soup", "juice", "powder", "breaded"],
};

const queryForIngredient = (entry) => {
  const queryWords = rawWords(entry.name).filter((word) => !SEARCH_STOP_WORDS.has(word));

  return queryWords.length ? queryWords.join(" ") : entry.name;
};

const scoreFood = (entry, food) => {
  const queryTokens = words(entry.name);
  const descriptionTokens = words(food.description);
  const description = descriptionTokens.join(" ");
  const matchingTokens = queryTokens.filter((word) => descriptionTokens.includes(word));
  const missingTokens = queryTokens.filter((word) => !descriptionTokens.includes(word));
  const hints = CATEGORY_HINTS[entry.category] ?? [];
  const hintMatches = hints.filter((hint) => description.includes(hint)).length;
  const exactPhrase = description.includes(queryTokens.join(" "));
  const startsWithMainTerm = descriptionTokens[0] === queryTokens[0];
  const dataTypeScore = DATA_TYPE_SCORE[food.dataType] ?? 0;
  const brandPenalty = food.brandOwner ? 8 : 0;
  const badCategoryPenalty = (BAD_CATEGORY_TERMS[entry.category] ?? []).filter((term) => {
    return description.includes(term) && !queryTokens.includes(term);
  }).length * 35;
  const sweetFlavorPenalty = ["blueberry", "strawberry", "vanilla", "honey", "chocolate"].filter((word) => {
    return description.includes(word) && !queryTokens.includes(word);
  }).length * 20;
  const unrelatedPenalty = ["with", "sauce", "prepared", "restaurant"].filter((word) => {
    return description.includes(word) && !queryTokens.includes(word);
  }).length * 3;

  return (
    dataTypeScore +
    matchingTokens.length * 18 +
    Math.max(0, queryTokens.length - missingTokens.length - 1) * 5 +
    hintMatches * 5 +
    (exactPhrase ? 15 : 0) -
    missingTokens.length * 10 +
    (startsWithMainTerm ? 25 : 0) -
    brandPenalty -
    badCategoryPenalty -
    sweetFlavorPenalty -
    unrelatedPenalty
  );
};

const pickFood = (entry, foods) =>
  foods
    .map((food) => ({ food, score: scoreFood(entry, food) }))
    .sort((left, right) => right.score - left.score)[0];

const searchFoods = async (apiKey, query) => {
  const byId = new Map();

  for (const dataType of ["Foundation", "SR Legacy", "Survey (FNDDS)"]) {
    let search;

    try {
      search = await fdcFetch(apiKey, "/foods/search", {
        query,
        pageSize: 12,
        dataType,
      });
    } catch (error) {
      if (verbose) {
        console.warn(`Skipping ${dataType} search for "${query}": ${error.message}`);
      }

      continue;
    }

    (search.foods ?? []).forEach((food) => byId.set(food.fdcId, food));
    await sleep(80);
  }

  return [...byId.values()];
};

const nutrientAmount = (food, names, unit = "") => {
  const wanted = Array.isArray(names) ? names : [names];
  const nutrient = food.foodNutrients?.find((foodNutrient) => {
    const name = foodNutrient.nutrient?.name ?? foodNutrient.nutrientName;
    const nutrientUnit = foodNutrient.nutrient?.unitName ?? foodNutrient.unitName;

    return wanted.includes(name) && (!unit || nutrientUnit?.toLowerCase() === unit.toLowerCase());
  });

  return Number(nutrient?.amount ?? nutrient?.value ?? 0);
};

const preferredGramWeight = (food) => {
  const portion = food.foodPortions?.find((candidate) => candidate.gramWeight);

  return Number(portion?.gramWeight ?? 100);
};

const normalizeFdcFood = (food) => {
  const gramWeight = preferredGramWeight(food);
  const factor = gramWeight / 100;

  return {
    fdcId: food.fdcId,
    fdcDescription: food.description,
    dataType: food.dataType,
    source: "USDA FoodData Central",
    verified: true,
    verifiedAt: new Date().toISOString().slice(0, 10),
    nutrition: {
      amount: Number(gramWeight.toFixed(2)),
      unit: "g",
      calories: Number((nutrientAmount(food, ["Energy", "Energy (Atwater General Factors)", "Energy (Atwater Specific Factors)"], "kcal") * factor).toFixed(2)),
      protein: Number((nutrientAmount(food, "Protein", "g") * factor).toFixed(2)),
      carbs: Number((nutrientAmount(food, "Carbohydrate, by difference", "g") * factor).toFixed(2)),
      fat: Number((nutrientAmount(food, "Total lipid (fat)", "g") * factor).toFixed(2)),
    },
    extraNutrients: {
      fiber: Number((nutrientAmount(food, "Fiber, total dietary", "g") * factor).toFixed(2)),
      sugar: Number((nutrientAmount(food, ["Total Sugars", "Sugars, total including NLEA"], "g") * factor).toFixed(2)),
      sodium: Number((nutrientAmount(food, "Sodium, Na", "mg") * factor).toFixed(2)),
      calcium: Number((nutrientAmount(food, "Calcium, Ca", "mg") * factor).toFixed(2)),
    },
  };
};

const formatNumber = (value) => Number(value || 0).toFixed(2).replace(/\.?0+$/, "");

const formatRecord = (key, record) => {
  const extra = record.extraNutrients ?? {};

  return `  [Ingredient.${key}]: {
    fdcId: ${record.fdcId},
    fdcDescription: ${JSON.stringify(record.fdcDescription)},
    dataType: ${JSON.stringify(record.dataType)},
    source: "USDA FoodData Central",
    verified: ${Boolean(record.verified)},
    verifiedAt: ${JSON.stringify(record.verifiedAt)},
    nutrition: nutrition(${formatNumber(record.nutrition.amount)}, ${JSON.stringify(record.nutrition.unit)}, ${formatNumber(record.nutrition.calories)}, ${formatNumber(record.nutrition.protein)}, ${formatNumber(record.nutrition.carbs)}, ${formatNumber(record.nutrition.fat)}),
    extraNutrients: {
      fiber: ${formatNumber(extra.fiber)},
      sugar: ${formatNumber(extra.sugar)},
      sodium: ${formatNumber(extra.sodium)},
      calcium: ${formatNumber(extra.calcium)},
    },
  }`;
};

const writeNutritionData = (Ingredient, nutritionData) => {
  const lines = Object.entries(Ingredient)
    .filter(([, id]) => nutritionData[id])
    .map(([key, id]) => formatRecord(key, nutritionData[id]));

  const source = `const nutritionData = Object.freeze({
${lines.join(",\n")}
});
`;

  fs.writeFileSync(NUTRITION_DATA_FILE, source);
};

const sync = async () => {
  const apiKey = readApiKey();
  const { Ingredient, ingredientCatalog, ingredientNutrition, nutrition } = loadCatalog();
  const nutritionData = { ...loadExistingNutritionData(Ingredient, nutrition) };
  const report = [];
  const entries = Object.entries(Ingredient).map(([key, id]) => ({
    key,
    id,
    ...ingredientCatalog[id],
  }));

  for (const entry of entries) {
    if (!refreshAll && nutritionData[entry.id]?.verified) {
      report.push({
        ingredient: entry.id,
        name: entry.name,
        status: "skipped-existing",
        fdcId: nutritionData[entry.id].fdcId,
        description: nutritionData[entry.id].fdcDescription,
      });
      continue;
    }

    const overrideFdcId = FDC_ID_OVERRIDES[entry.id];

    if (overrideFdcId) {
      const food = await fdcFetch(apiKey, `/food/${overrideFdcId}`);

      nutritionData[entry.id] = normalizeFdcFood(food);
      report.push({
        ingredient: entry.id,
        name: entry.name,
        status: "matched-override",
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
      });

      if (verbose) {
        console.log(`${entry.key}: FDC ${food.fdcId} ${food.description} (${food.dataType}, override)`);
      } else {
        process.stdout.write(".");
      }

      await sleep(120);
      continue;
    }

    const query = queryForIngredient(entry);
    const foods = await searchFoods(apiKey, query);
    const picked = pickFood(entry, foods);

    if (!picked) {
      report.push({ ingredient: entry.id, name: entry.name, query, status: "no-match" });
      continue;
    }

    await sleep(120);
    report.push({
      ingredient: entry.id,
      name: entry.name,
      query,
      status: picked.score >= 45 ? "matched" : "matched-low-confidence",
      score: picked.score,
      fdcId: picked.food.fdcId,
      description: picked.food.description,
      dataType: picked.food.dataType,
    });

    if (verbose) {
      console.log(`${entry.key}: FDC ${picked.food.fdcId} ${picked.food.description} (${picked.food.dataType}, score ${picked.score})`);
    } else {
      process.stdout.write(".");
    }

    let fullFood;

    try {
      fullFood = await fdcFetch(apiKey, `/food/${picked.food.fdcId}`);
    } catch (error) {
      if (verbose) {
        console.warn(`Using search payload for FDC ${picked.food.fdcId}: ${error.message}`);
      }

      fullFood = picked.food;
    }

    nutritionData[entry.id] = normalizeFdcFood(fullFood);

    await sleep(120);
  }

  if (!dryRun) {
    writeNutritionData(Ingredient, nutritionData);
    fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  }

  const matched = report.filter((item) => item.status === "matched" || item.status === "matched-override").length;
  const lowConfidence = report.filter((item) => item.status === "matched-low-confidence").length;
  const skipped = report.filter((item) => item.status === "skipped-existing").length;
  const missing = report.filter((item) => item.status === "no-match").length;

  console.log(`\nMatched ${matched}, low confidence ${lowConfidence}, skipped ${skipped}, missing ${missing}.`);
  console.log(dryRun ? "Dry run only; no files written." : "Updated nutrition-data.js and nutrition-match-report.json.");
};

sync().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
