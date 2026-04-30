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

  return staged[ingredientId] ?? nutritionData?.[ingredientId];
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
      sugar: Number((nutrientAmount(food, "Total Sugars", "g") * factor).toFixed(2)),
      sodium: Number((nutrientAmount(food, "Sodium, Na", "mg") * factor).toFixed(2)),
      calcium: Number((nutrientAmount(food, "Calcium, Ca", "mg") * factor).toFixed(2)),
    },
  };
};

const nutritionSummary = (record) => {
  if (!record?.nutrition) {
    return "No USDA data";
  }

  const { nutrition: value } = record;

  return `${Math.round(value.calories)} kcal, ${Math.round(value.protein)}g protein, ${Math.round(value.carbs)}g carbs, ${Math.round(value.fat)}g fat per ${value.amount}${value.unit}`;
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
  const merged = { ...nutritionData, ...staged };
  const lines = Object.entries(Ingredient)
    .filter(([, id]) => merged[id])
    .map(([key, id]) => {
      const record = merged[id];
      const extra = record.extraNutrients ?? {};

      return `  [Ingredient.${key}]: {
    fdcId: ${record.fdcId},
    fdcDescription: ${JSON.stringify(record.fdcDescription)},
    dataType: ${JSON.stringify(record.dataType)},
    source: "USDA FoodData Central",
    verified: ${Boolean(record.verified)},
    verifiedAt: ${JSON.stringify(record.verifiedAt)},
    nutrition: nutrition(${record.nutrition.amount}, ${JSON.stringify(record.nutrition.unit)}, ${record.nutrition.calories}, ${record.nutrition.protein}, ${record.nutrition.carbs}, ${record.nutrition.fat}),
    extraNutrients: {
      fiber: ${extra.fiber ?? 0},
      sugar: ${extra.sugar ?? 0},
      sodium: ${extra.sodium ?? 0},
      calcium: ${extra.calcium ?? 0},
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
