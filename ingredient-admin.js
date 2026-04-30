const NUTRITION_STORAGE_KEY = "foodplan.nutritionData";

const getIngredientEntries = () =>
  Object.entries(Ingredient).map(([key, id]) => ({
    key,
    id,
    ...ingredientCatalog[id],
  }));

const readStagedNutritionData = () => {
  try {
    return JSON.parse(localStorage.getItem(NUTRITION_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const writeStagedNutritionData = (data) => {
  localStorage.setItem(NUTRITION_STORAGE_KEY, JSON.stringify(data));
};

const fdcFailureMessage = (error) => {
  if (Fdc.isUsingDemoKey() && error.message.includes("OVER_RATE_LIMIT")) {
    return `${error.message}. The shared DEMO_KEY is rate-limited; save your own USDA API key above and search again.`;
  }

  return error.message;
};

const getStoredNutritionRecord = (ingredientId) => {
  const staged = readStagedNutritionData();

  return mergeNutritionRecord(nutritionData?.[ingredientId], staged[ingredientId]);
};

const getRecordNutrients = (record) => record?.nutrients ?? record?.nutrition;

const mergeNutritionRecord = (baseRecord, overrideRecord) => {
  if (!baseRecord && !overrideRecord) {
    return undefined;
  }

  return {
    ...baseRecord,
    ...overrideRecord,
    nutrients: {
      ...(getRecordNutrients(baseRecord) ?? {}),
      ...(getRecordNutrients(overrideRecord) ?? {}),
    },
  };
};

const nutrientAmount = (food, names, unit = "") => {
  const wanted = Array.isArray(names) ? names : [names];
  const normalizedUnit = unit.toLowerCase().replace("µ", "u");
  const nutrient = food.foodNutrients?.find((foodNutrient) => {
    const name = foodNutrient.nutrient?.name ?? foodNutrient.nutrientName;
    const nutrientUnit = String(foodNutrient.nutrient?.unitName ?? foodNutrient.unitName ?? "")
      .toLowerCase()
      .replace("µ", "u");

    return wanted.includes(name) && (!unit || nutrientUnit === normalizedUnit);
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
    nutrients: {
      amount: Number(gramWeight.toFixed(2)),
      unit: "g",
      calories: Number((nutrientAmount(food, ["Energy", "Energy (Atwater General Factors)", "Energy (Atwater Specific Factors)"], "kcal") * factor).toFixed(2)),
      protein: Number((nutrientAmount(food, "Protein", "g") * factor).toFixed(2)),
      carbs: Number((nutrientAmount(food, "Carbohydrate, by difference", "g") * factor).toFixed(2)),
      fat: Number((nutrientAmount(food, "Total lipid (fat)", "g") * factor).toFixed(2)),
      fiber: Number((nutrientAmount(food, "Fiber, total dietary", "g") * factor).toFixed(2)),
      sugar: Number((nutrientAmount(food, ["Total Sugars", "Sugars, total including NLEA"], "g") * factor).toFixed(2)),
      addedSugar: Number((nutrientAmount(food, ["Sugars, added", "Added Sugars"], "g") * factor).toFixed(2)),
      saturatedFat: Number((nutrientAmount(food, "Fatty acids, total saturated", "g") * factor).toFixed(2)),
      transFat: Number((nutrientAmount(food, "Fatty acids, total trans", "g") * factor).toFixed(2)),
      cholesterol: Number((nutrientAmount(food, "Cholesterol", "mg") * factor).toFixed(2)),
      sodium: Number((nutrientAmount(food, "Sodium, Na", "mg") * factor).toFixed(2)),
      potassium: Number((nutrientAmount(food, "Potassium, K", "mg") * factor).toFixed(2)),
      calcium: Number((nutrientAmount(food, "Calcium, Ca", "mg") * factor).toFixed(2)),
      iron: Number((nutrientAmount(food, "Iron, Fe", "mg") * factor).toFixed(2)),
      vitaminD: Number((nutrientAmount(food, "Vitamin D (D2 + D3)", "ug") * factor).toFixed(2)),
      magnesium: Number((nutrientAmount(food, "Magnesium, Mg", "mg") * factor).toFixed(2)),
      vitaminC: Number((nutrientAmount(food, "Vitamin C, total ascorbic acid", "mg") * factor).toFixed(2)),
      vitaminA: Number((nutrientAmount(food, "Vitamin A, RAE", "ug") * factor).toFixed(2)),
      folate: Number((nutrientAmount(food, "Folate, DFE", "ug") * factor).toFixed(2)),
      vitaminB12: Number((nutrientAmount(food, "Vitamin B-12", "ug") * factor).toFixed(2)),
    },
  };
};

const nutritionSummary = (record) => {
  const nutrients = getRecordNutrients(record);

  if (!nutrients) {
    return "No USDA data";
  }

  return `${Math.round(nutrients.calories)} kcal, ${Math.round(nutrients.protein)}g protein, ${Math.round(nutrients.carbs)}g carbs, ${Math.round(nutrients.fat)}g fat per ${nutrients.amount}${nutrients.unit}`;
};

const createAdminButton = (text, onClick) => {
  const button = document.createElement("button");

  button.type = "button";
  button.textContent = text;
  button.addEventListener("click", onClick);

  return button;
};

const setFdcStatus = () => {
  const status = document.querySelector("#fdc-key-status");
  const input = document.querySelector("#fdc-api-key");

  if (!status || !input) {
    return;
  }

  input.value = Fdc.isUsingDemoKey() ? "" : Fdc.getApiKey();
  status.textContent = Fdc.isUsingDemoKey()
    ? "Using USDA's shared demo key. It is useful for a quick test, but it can hit rate limits."
    : "Using your saved USDA API key from this browser.";
};

const renderSummary = () => {
  const staged = readStagedNutritionData();
  const entries = getIngredientEntries();
  const verified = entries.filter((entry) => getStoredNutritionRecord(entry.id)?.verified).length;
  const stagedCount = Object.keys(staged).length;
  const summary = document.querySelector("#ingredient-admin-summary");
  const items = [
    ["Ingredients", entries.length],
    ["Verified", verified],
    ["Staged locally", stagedCount],
  ];

  summary.replaceChildren(...items.map(([label, value]) => {
    const item = document.createElement("div");
    const labelElement = document.createElement("span");
    const valueElement = document.createElement("strong");

    labelElement.className = "summary__label";
    labelElement.textContent = label;
    valueElement.textContent = value;
    item.append(labelElement, valueElement);

    return item;
  }));
};

const renderSearchResults = (container, ingredient, results) => {
  container.replaceChildren();

  results.forEach((food) => {
    const result = document.createElement("div");
    const details = document.createElement("div");
    const title = document.createElement("strong");
    const meta = document.createElement("span");
    const useButton = createAdminButton("Use", async () => {
      useButton.disabled = true;
      useButton.textContent = "Fetching";

      try {
        const fullFood = await Fdc.getFood(food.fdcId);
        const staged = readStagedNutritionData();

        staged[ingredient.id] = normalizeFdcFood(fullFood);
        writeStagedNutritionData(staged);
        renderIngredientAdmin();
      } catch (error) {
        useButton.textContent = "Failed";
        results.textContent = fdcFailureMessage(error);
        console.error(error);
      }
    });

    result.className = "fdc-result";
    title.textContent = food.description;
    meta.textContent = `${food.dataType} | FDC ${food.fdcId}`;
    details.append(title, meta);
    result.append(details, useButton);
    container.append(result);
  });
};

const renderIngredientAdmin = () => {
  const body = document.querySelector("#ingredient-admin-body");
  const fragment = document.createDocumentFragment();

  getIngredientEntries().forEach((ingredient) => {
    const record = getStoredNutritionRecord(ingredient.id);
    const row = document.createElement("tr");
    const nameCell = document.createElement("th");
    const matchCell = document.createElement("td");
    const nutritionCell = document.createElement("td");
    const searchCell = document.createElement("td");
    const searchBox = document.createElement("div");
    const queryInput = document.createElement("input");
    const results = document.createElement("div");

    nameCell.scope = "row";
    nameCell.innerHTML = `<strong>${ingredient.name}</strong><span>${ingredient.category} | ${ingredient.groceryArea}</span>`;
    matchCell.textContent = record
      ? `${record.fdcDescription} (${record.dataType}, FDC ${record.fdcId})`
      : "No match selected";
    nutritionCell.textContent = nutritionSummary(record);
    searchBox.className = "fdc-search";
    queryInput.value = ingredient.name;
    queryInput.type = "search";
    queryInput.setAttribute("aria-label", `Search FDC for ${ingredient.name}`);
    results.className = "fdc-results";

    searchBox.append(
      queryInput,
      createAdminButton("Search", async () => {
        results.textContent = "Searching...";

        try {
          const response = await Fdc.searchFoods(queryInput.value);

          renderSearchResults(results, ingredient, response.foods ?? []);
        } catch (error) {
          results.textContent = fdcFailureMessage(error);
          console.error(error);
        }
      }),
      results,
    );
    searchCell.append(searchBox);
    row.append(nameCell, matchCell, nutritionCell, searchCell);
    fragment.append(row);
  });

  body.replaceChildren(fragment);
  renderSummary();
};

const generateNutritionDataSource = () => {
  const staged = readStagedNutritionData();
  const lines = Object.entries(Ingredient)
    .map(([key, id]) => [key, id, mergeNutritionRecord(nutritionData[id], staged[id])])
    .filter(([, , record]) => record)
    .map(([key, , record]) => {
      const nutrients = getRecordNutrients(record);

      return `  [Ingredient.${key}]: {
    fdcId: ${record.fdcId},
    fdcDescription: ${JSON.stringify(record.fdcDescription)},
    dataType: ${JSON.stringify(record.dataType)},
    source: "USDA FoodData Central",
    verified: ${Boolean(record.verified)},
    verifiedAt: ${JSON.stringify(record.verifiedAt)},
    nutrients: {
      amount: ${nutrients.amount},
      unit: ${JSON.stringify(nutrients.unit)},
      calories: ${nutrients.calories ?? 0},
      protein: ${nutrients.protein ?? 0},
      carbs: ${nutrients.carbs ?? 0},
      fat: ${nutrients.fat ?? 0},
      fiber: ${nutrients.fiber ?? 0},
      sugar: ${nutrients.sugar ?? 0},
      addedSugar: ${nutrients.addedSugar ?? 0},
      saturatedFat: ${nutrients.saturatedFat ?? 0},
      transFat: ${nutrients.transFat ?? 0},
      cholesterol: ${nutrients.cholesterol ?? 0},
      sodium: ${nutrients.sodium ?? 0},
      potassium: ${nutrients.potassium ?? 0},
      calcium: ${nutrients.calcium ?? 0},
      iron: ${nutrients.iron ?? 0},
      vitaminD: ${nutrients.vitaminD ?? 0},
      magnesium: ${nutrients.magnesium ?? 0},
      vitaminC: ${nutrients.vitaminC ?? 0},
      vitaminA: ${nutrients.vitaminA ?? 0},
      folate: ${nutrients.folate ?? 0},
      vitaminB12: ${nutrients.vitaminB12 ?? 0},
    },
  }`;
    });

  return `const nutritionData = Object.freeze({
${lines.join(",\n")}
});
`;
};

document.querySelector("#export-nutrition-data").addEventListener("click", () => {
  document.querySelector("#nutrition-data-output").value = generateNutritionDataSource();
});

document.querySelector("#refresh-verified-data").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const staged = readStagedNutritionData();
  const merged = { ...nutritionData, ...staged };
  const refreshable = Object.entries(merged).filter(([, record]) => record.fdcId);

  button.disabled = true;
  button.textContent = "Refreshing";

  try {
    for (const [ingredientId, record] of refreshable) {
      const food = await Fdc.getFood(record.fdcId);

      staged[ingredientId] = normalizeFdcFood(food);
    }

    writeStagedNutritionData(staged);
    renderIngredientAdmin();
  } catch (error) {
    console.error(error);
  } finally {
    button.disabled = false;
    button.textContent = "Refresh verified";
  }
});

document.querySelector("#clear-staged-data").addEventListener("click", () => {
  localStorage.removeItem(NUTRITION_STORAGE_KEY);
  document.querySelector("#nutrition-data-output").value = "";
  renderIngredientAdmin();
});

document.querySelector("#save-fdc-api-key").addEventListener("click", () => {
  Fdc.setApiKey(document.querySelector("#fdc-api-key").value);
  setFdcStatus();
});

document.querySelector("#clear-fdc-api-key").addEventListener("click", () => {
  Fdc.setApiKey("");
  setFdcStatus();
});

setFdcStatus();
renderIngredientAdmin();
