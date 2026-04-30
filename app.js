const mealTypes = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

const selectedIngredientByLine = new Map();
let selectedMealPlanId = mealPlans[0].id;
const NUTRITION_STORAGE_KEY = "foodplan.nutritionData";
const nutrientRows = [
  { key: "calories", label: "Calories", unit: "kcal", dailyValue: 2000, referenceType: "guide" },
  { key: "protein", label: "Protein", unit: "g", dailyValue: 50, referenceType: "daily value" },
  { key: "carbs", label: "Total carbohydrate", unit: "g", dailyValue: 275, referenceType: "daily value" },
  { key: "fat", label: "Total fat", unit: "g", dailyValue: 78, referenceType: "daily value" },
  { key: "fiber", label: "Dietary fiber", unit: "g", dailyValue: 28, referenceType: "target" },
  { key: "sugar", label: "Total sugars", unit: "g" },
  { key: "addedSugar", label: "Added sugars", unit: "g", dailyValue: 50, referenceType: "limit" },
  { key: "saturatedFat", label: "Saturated fat", unit: "g", dailyValue: 20, referenceType: "limit" },
  { key: "transFat", label: "Trans fat", unit: "g", referenceText: "keep low" },
  { key: "cholesterol", label: "Cholesterol", unit: "mg", dailyValue: 300, referenceType: "limit" },
  { key: "sodium", label: "Sodium", unit: "mg", dailyValue: 2300, referenceType: "limit" },
  { key: "potassium", label: "Potassium", unit: "mg", dailyValue: 4700, referenceType: "target" },
  { key: "calcium", label: "Calcium", unit: "mg", dailyValue: 1300, referenceType: "target" },
  { key: "iron", label: "Iron", unit: "mg", dailyValue: 18, referenceType: "target" },
  { key: "vitaminD", label: "Vitamin D", unit: "mcg", dailyValue: 20, referenceType: "target" },
  { key: "magnesium", label: "Magnesium", unit: "mg", dailyValue: 420, referenceType: "target" },
  { key: "vitaminC", label: "Vitamin C", unit: "mg", dailyValue: 90, referenceType: "target" },
  { key: "vitaminA", label: "Vitamin A", unit: "mcg RAE", dailyValue: 900, referenceType: "target" },
  { key: "folate", label: "Folate", unit: "mcg DFE", dailyValue: 400, referenceType: "target" },
  { key: "vitaminB12", label: "Vitamin B12", unit: "mcg", dailyValue: 2.4, referenceType: "target" },
];

const readStagedNutritionData = () => {
  try {
    return JSON.parse(localStorage.getItem(NUTRITION_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
};

const createElement = (tagName, options = {}) => {
  const element = document.createElement(tagName);

  if (options.className) {
    element.className = options.className;
  }

  if (options.text !== undefined) {
    element.textContent = options.text;
  }

  if (options.attrs) {
    Object.entries(options.attrs).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
  }

  return element;
};

const getSelectedMealPlan = () =>
  mealPlans.find((plannedMeal) => plannedMeal.id === selectedMealPlanId) ?? mealPlans[0];

const getCurrentMealPlan = () => getSelectedMealPlan().plan;

const getSummaryItems = () => {
  const currentMealPlan = getCurrentMealPlan();
  const allMeals = currentMealPlan.flatMap((dayPlan) =>
    mealTypes.map((mealType) => dayPlan.meals[mealType.key]),
  );
  const ingredientCount = allMeals.reduce(
    (count, plannedMeal) => count + plannedMeal.ingredients.length,
    0,
  );

  return [
    {
      label: "Week structure",
      value: `${currentMealPlan.length} days`,
    },
    {
      label: "Meals planned",
      value: `${allMeals.length} slots`,
    },
    {
      label: "Ingredient lines",
      value: `${ingredientCount} planned`,
    },
  ];
};

const createPlanSelector = () => {
  const select = createElement("select", {
    attrs: {
      id: "meal-plan-select",
      "aria-label": "Meal plan",
    },
  });

  select.append(...mealPlans.map((plannedMeal) =>
    createElement("option", {
      text: plannedMeal.name,
      attrs: { value: plannedMeal.id },
    }),
  ));
  select.value = selectedMealPlanId;
  select.addEventListener("change", () => {
    selectedMealPlanId = select.value;
    mealPlan = getCurrentMealPlan();
    selectedIngredientByLine.clear();
    renderApp();
  });

  return select;
};

const formatAmount = ({ amount, unit }) => {
  if (amount === "") {
    return "";
  }

  return [amount, unit].filter(Boolean).join(" ");
};

const getIngredient = (ingredientId) => {
  const ingredientDetails = ingredientCatalog[ingredientId];

  if (!ingredientDetails) {
    throw new Error(`Unknown ingredient id: ${ingredientId}`);
  }

  return ingredientDetails;
};

const getChoiceName = (ingredientId) => getIngredient(ingredientId).name;

const getRecordNutrients = (record) => record?.nutrients ?? record?.nutrition;

const mergeNutrients = (...nutrientSources) =>
  nutrientSources
    .filter(Boolean)
    .reduce((merged, nutrients) => ({ ...merged, ...nutrients }), undefined);

const getChoiceNutrition = (ingredientId) => {
  const stagedNutrition = getRecordNutrients(readStagedNutritionData()[ingredientId]);
  const cachedNutrition = typeof nutritionData === "undefined" ? undefined : getRecordNutrients(nutritionData[ingredientId]);
  const nutritionDetails = mergeNutrients(
    ingredientNutrition[ingredientId],
    cachedNutrition,
    stagedNutrition,
  );

  if (!nutritionDetails) {
    throw new Error(`Missing nutrition estimate for: ${getChoiceName(ingredientId)}`);
  }

  return nutritionDetails;
};

const normalizeUnit = (unit) => String(unit).toLowerCase().replace(/s$/, "");

const sameUnit = (firstUnit, secondUnit) => normalizeUnit(firstUnit) === normalizeUnit(secondUnit);

const gramsPerUnit = (ingredientId, unit) => {
  const normalizedUnit = normalizeUnit(unit) || "count";
  const weights = typeof ingredientGramWeights === "undefined" ? undefined : ingredientGramWeights[ingredientId];

  return weights?.[normalizedUnit];
};

const plannedAmountInGrams = (plannedIngredient, ingredientId, nutritionDetails) => {
  const amount = plannedIngredient.amount === "" ? 1 : plannedIngredient.amount;
  const plannedUnit = normalizeUnit(plannedIngredient.unit);

  if (plannedUnit === "g") {
    return amount;
  }

  const gramWeight = gramsPerUnit(ingredientId, plannedUnit);

  if (gramWeight) {
    return amount * gramWeight;
  }

  if (nutritionDetails.unit === "g") {
    return amount * nutritionDetails.amount;
  }

  return undefined;
};

const scaleNutrition = (plannedIngredient, choice) => {
  const nutritionDetails = getChoiceNutrition(choice);
  const plannedGrams = plannedAmountInGrams(plannedIngredient, choice, nutritionDetails);
  const scale = plannedGrams && nutritionDetails.unit === "g"
    ? plannedGrams / nutritionDetails.amount
    : sameUnit(plannedIngredient.unit, nutritionDetails.unit)
      ? (plannedIngredient.amount === "" ? nutritionDetails.amount : plannedIngredient.amount) / nutritionDetails.amount
      : 1;
  const scaledNutrition = {};

  Object.entries(nutritionDetails).forEach(([key, value]) => {
    if (key !== "amount" && key !== "unit" && typeof value === "number") {
      scaledNutrition[key] = value * scale;
    }
  });

  return scaledNutrition;
};

const getScaledIngredientNutrition = (plannedIngredient, ingredientId) => {
  const nutritionDetails = getChoiceNutrition(ingredientId);
  const plannedGrams = plannedAmountInGrams(plannedIngredient, ingredientId, nutritionDetails);

  return {
    nutrition: scaleNutrition(plannedIngredient, ingredientId),
    plannedGrams,
  };
};

const addNutrition = (total, nutritionDetails) => {
  const nextTotal = { ...total };

  Object.entries(nutritionDetails).forEach(([key, value]) => {
    if (typeof value === "number") {
      nextTotal[key] = (nextTotal[key] ?? 0) + value;
    }
  });

  return nextTotal;
};

const emptyNutrition = () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

const getDefaultChoices = (plannedMeal) =>
  plannedMeal.ingredients.map((plannedIngredient) => plannedIngredient.ingredients[0]);

const getFoodLineKey = (dayIndex, mealKey, ingredientIndex) =>
  `${dayIndex}:${mealKey}:${ingredientIndex}`;

const getSelectedIngredient = (dayIndex, mealKey, ingredientIndex, plannedIngredient) => {
  const key = getFoodLineKey(dayIndex, mealKey, ingredientIndex);

  if (!selectedIngredientByLine.has(key)) {
    selectedIngredientByLine.set(key, plannedIngredient.ingredients[0]);
  }

  return selectedIngredientByLine.get(key);
};

const setSelectedIngredient = (dayIndex, mealKey, ingredientIndex, ingredientId) => {
  selectedIngredientByLine.set(getFoodLineKey(dayIndex, mealKey, ingredientIndex), ingredientId);
};

const getSelectedChoices = (plannedMeal, dayIndex, mealKey) =>
  plannedMeal.ingredients.map((plannedIngredient, ingredientIndex) =>
    getSelectedIngredient(dayIndex, mealKey, ingredientIndex, plannedIngredient),
  );

const calculateMealNutrition = (plannedMeal, selectedChoices) =>
  plannedMeal.ingredients
    .map((plannedIngredient, index) => scaleNutrition(plannedIngredient, selectedChoices[index]))
    .reduce(addNutrition, emptyNutrition());

const calculateDayNutrition = (mealTotals) =>
  Object.values(mealTotals).reduce(addNutrition, emptyNutrition());

const formatMacro = (value) => Math.round(value);

const weeklyReference = (nutrient) => nutrient.dailyValue * getCurrentMealPlan().length;

const formatNutrientAmount = (value, nutrient) => {
  const roundedValue = Math.abs(value) >= 100 ? Math.round(value) : Number(value.toFixed(1));

  return `${roundedValue.toLocaleString()} ${nutrient.unit}`;
};

const formatNutrientReference = (nutrient) => {
  if (nutrient.referenceText) {
    return nutrient.referenceText;
  }

  if (!nutrient.dailyValue) {
    return "No FDA DV";
  }

  return `${nutrient.referenceType}: ${formatNutrientAmount(weeklyReference(nutrient), nutrient)}`;
};

const renderTotalWithReference = (value, nutrient) => {
  const wrapper = createElement("div", { className: "nutrient-total" });

  wrapper.append(
    createElement("strong", { text: formatNutrientAmount(value, nutrient) }),
    createElement("span", { text: formatNutrientReference(nutrient) }),
  );

  return wrapper;
};

const formatGrams = (grams) => {
  if (!grams) {
    return "";
  }

  return `${Number(grams.toFixed(1)).toLocaleString()} g`;
};

const closeIngredientInfo = (overlay) => {
  overlay.remove();
};

const openIngredientInfo = (plannedIngredient, ingredientId) => {
  const ingredient = getIngredient(ingredientId);
  const { nutrition, plannedGrams } = getScaledIngredientNutrition(plannedIngredient, ingredientId);
  const overlay = createElement("div", { className: "ingredient-info-overlay" });
  const panel = createElement("div", {
    className: "ingredient-info",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "ingredient-info-title",
    },
  });
  const header = createElement("div", { className: "ingredient-info__header" });
  const titleBlock = createElement("div");
  const closeButton = createElement("button", {
    className: "ingredient-info__close",
    text: "x",
    attrs: { type: "button", "aria-label": "Close ingredient nutrition" },
  });
  const table = createElement("table", { className: "ingredient-info__table" });
  const thead = createElement("thead");
  const headerRow = createElement("tr");
  const tbody = createElement("tbody");
  const portionText = [
    formatAmount(plannedIngredient),
    formatGrams(plannedGrams),
  ].filter(Boolean).join(" / ");

  titleBlock.append(
    createElement("span", { className: "summary__label", text: "Ingredient nutrition" }),
    createElement("h3", {
      text: ingredient.name,
      attrs: { id: "ingredient-info-title" },
    }),
    createElement("p", {
      text: portionText ? `Shown for ${portionText}` : "Shown for the selected portion",
    }),
  );

  closeButton.addEventListener("click", () => closeIngredientInfo(overlay));
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeIngredientInfo(overlay);
    }
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeIngredientInfo(overlay);
    }
  });

  header.append(titleBlock, closeButton);
  ["Nutrient", "Amount"].forEach((label) => {
    headerRow.append(createElement("th", {
      text: label,
      attrs: { scope: "col" },
    }));
  });

  nutrientRows.forEach((nutrient) => {
    const row = createElement("tr");

    row.append(
      createElement("th", {
        text: nutrient.label,
        attrs: { scope: "row" },
      }),
      createElement("td", {
        text: formatNutrientAmount(nutrition[nutrient.key] ?? 0, nutrient),
      }),
    );
    tbody.append(row);
  });

  thead.append(headerRow);
  table.append(thead, tbody);
  panel.append(header, table);
  overlay.append(panel);
  document.body.append(overlay);
  closeButton.focus();
};

const renderIngredientInfoButton = (plannedIngredient, ingredientIndex, selectedChoices) => {
  const button = createElement("button", {
    className: "ingredient-info-button",
    text: "i",
    attrs: {
      type: "button",
      "aria-label": "Show ingredient nutrition",
      title: "Show nutrition",
    },
  });

  button.addEventListener("click", () => {
    openIngredientInfo(plannedIngredient, selectedChoices[ingredientIndex]);
  });

  return button;
};

const renderNutritionLine = (nutritionDetails) => {
  const line = createElement("dl", { className: "nutrition-line" });
  const items = [
    ["Calories", formatMacro(nutritionDetails.calories)],
    ["Protein", `${formatMacro(nutritionDetails.protein)}g`],
    ["Carbs", `${formatMacro(nutritionDetails.carbs)}g`],
    ["Fat", `${formatMacro(nutritionDetails.fat)}g`],
  ];

  items.forEach(([label, value]) => {
    const group = createElement("div");

    group.append(
      createElement("dt", { text: label }),
      createElement("dd", { text: value }),
    );
    line.append(group);
  });

  return line;
};

const updateNutritionLine = (line, nutritionDetails) => {
  const values = [
    formatMacro(nutritionDetails.calories),
    `${formatMacro(nutritionDetails.protein)}g`,
    `${formatMacro(nutritionDetails.carbs)}g`,
    `${formatMacro(nutritionDetails.fat)}g`,
  ];

  line.querySelectorAll("dd").forEach((valueElement, index) => {
    valueElement.textContent = values[index];
  });
};

const renderDailyTotal = (nutritionDetails) => {
  const wrapper = createElement("div", { className: "daily-total" });
  const heading = createElement("strong", {
    className: "daily-total__title",
    text: "Daily total",
  });

  wrapper.append(heading, renderNutritionLine(nutritionDetails));

  return wrapper;
};

const formatAggregateAmount = (amount) =>
  Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));

const formatAggregateUnit = (amount, unit) => {
  if (!unit) {
    return "";
  }

  return amount === 1 ? normalizeUnit(unit) : `${normalizeUnit(unit)}s`;
};

const getWeeklyIngredientTotals = () => {
  const totals = new Map();

  getCurrentMealPlan().forEach((dayPlan, dayIndex) => {
    mealTypes.forEach((mealType) => {
      const plannedMeal = dayPlan.meals[mealType.key];

      plannedMeal.ingredients.forEach((plannedIngredient, ingredientIndex) => {
        const ingredientId = getSelectedIngredient(dayIndex, mealType.key, ingredientIndex, plannedIngredient);
        const unit = normalizeUnit(plannedIngredient.unit);
        const key = `${ingredientId}:${unit}`;
        const amount = plannedIngredient.amount === "" ? 1 : plannedIngredient.amount;
        const current = totals.get(key) ?? {
          ingredientId,
          unit,
          amount: 0,
        };

        current.amount += amount;
        totals.set(key, current);
      });
    });
  });

  return [...totals.values()].sort((first, second) =>
    getChoiceName(first.ingredientId).localeCompare(getChoiceName(second.ingredientId)),
  );
};

const renderWeeklyIngredientTotals = () => {
  const mount = document.querySelector("#weekly-ingredient-totals");
  const table = createElement("table", { className: "weekly-ingredients__table" });
  const thead = createElement("thead");
  const headerRow = createElement("tr");
  const tbody = createElement("tbody");
  const totals = getWeeklyIngredientTotals();

  if (totals.length === 0) {
    mount.replaceChildren(createElement("p", {
      className: "empty-state",
      text: "No ingredients in this meal plan yet.",
    }));
    return;
  }

  ["Ingredient", "Amount", "Category", "Area"].forEach((label) => {
    headerRow.append(createElement("th", {
      text: label,
      attrs: { scope: "col" },
    }));
  });

  totals.forEach((total) => {
    const ingredient = getIngredient(total.ingredientId);
    const row = createElement("tr");
    const amount = [
      formatAggregateAmount(total.amount),
      formatAggregateUnit(total.amount, total.unit),
    ].filter(Boolean).join(" ");

    row.append(
      createElement("th", {
        text: ingredient.name,
        attrs: { scope: "row" },
      }),
      createElement("td", { text: amount }),
      createElement("td", { text: ingredient.category }),
      createElement("td", { text: ingredient.groceryArea }),
    );
    tbody.append(row);
  });

  thead.append(headerRow);
  table.append(thead, tbody);
  mount.replaceChildren(table);
};

const calculateWeeklyNutrientTotals = () => {
  const totals = {
    breakfast: emptyNutrition(),
    lunch: emptyNutrition(),
    dinner: emptyNutrition(),
  };

  getCurrentMealPlan().forEach((dayPlan, dayIndex) => {
    mealTypes.forEach((mealType) => {
      const plannedMeal = dayPlan.meals[mealType.key];
      const selectedChoices = getSelectedChoices(plannedMeal, dayIndex, mealType.key);

      totals[mealType.key] = addNutrition(
        totals[mealType.key],
        calculateMealNutrition(plannedMeal, selectedChoices),
      );
    });
  });

  return totals;
};

const renderWeeklyNutrientTotals = () => {
  const mount = document.querySelector("#weekly-nutrient-totals");
  const table = createElement("table", { className: "weekly-ingredients__table weekly-nutrients__table" });
  const thead = createElement("thead");
  const headerRow = createElement("tr");
  const tbody = createElement("tbody");
  const mealTotals = calculateWeeklyNutrientTotals();

  if (getCurrentMealPlan().length === 0) {
    mount.replaceChildren(createElement("p", {
      className: "empty-state",
      text: "No nutrient totals to show yet.",
    }));
    return;
  }

  ["Nutrient", "Breakfast", "Lunch", "Dinner", "Total"].forEach((label) => {
    headerRow.append(createElement("th", {
      text: label,
      attrs: { scope: "col" },
    }));
  });

  nutrientRows.forEach((nutrient) => {
    const row = createElement("tr");
    const total = mealTypes.reduce(
      (sum, mealType) => sum + (mealTotals[mealType.key][nutrient.key] ?? 0),
      0,
    );

    row.append(createElement("th", {
      text: nutrient.label,
      attrs: { scope: "row" },
    }));

    mealTypes.forEach((mealType) => {
      row.append(createElement("td", {
        text: formatNutrientAmount(mealTotals[mealType.key][nutrient.key] ?? 0, nutrient),
      }));
    });

    const totalCell = createElement("td");
    totalCell.append(renderTotalWithReference(total, nutrient));
    row.append(totalCell);
    tbody.append(row);
  });

  thead.append(headerRow);
  table.append(thead, tbody);
  mount.replaceChildren(table);
};

const renderIngredientChoice = (plannedIngredient, ingredientIndex, selectedChoices, onChange) => {
  const choices = plannedIngredient.ingredients;
  const defaultChoiceName = getChoiceName(choices[0]);

  if (choices.length === 1) {
    return createElement("span", { text: defaultChoiceName });
  }

  const select = createElement("select", {
    className: "ingredient-select",
    attrs: {
      "aria-label": `Choose option for ${defaultChoiceName}`,
    },
  });

  choices.forEach((choice) => {
    select.append(createElement("option", {
      text: getChoiceName(choice),
      attrs: { value: choice },
    }));
  });

  select.addEventListener("change", () => {
    selectedChoices[ingredientIndex] = choices[select.selectedIndex];
    onChange(ingredientIndex, choices[select.selectedIndex]);
  });

  return select;
};

const renderIngredients = (ingredients, selectedChoices, onChange) => {
  const list = createElement("ul", { className: "ingredient-list" });

  ingredients.forEach((plannedIngredient, ingredientIndex) => {
    const item = createElement("li");
    const amount = formatAmount(plannedIngredient);

    if (amount) {
      item.append(
        createElement("span", { className: "ingredient-amount", text: amount }),
        renderIngredientChoice(plannedIngredient, ingredientIndex, selectedChoices, onChange),
        renderIngredientInfoButton(plannedIngredient, ingredientIndex, selectedChoices),
      );
    } else {
      item.append(
        createElement("span", { className: "ingredient-amount", text: "" }),
        renderIngredientChoice(plannedIngredient, ingredientIndex, selectedChoices, onChange),
        renderIngredientInfoButton(plannedIngredient, ingredientIndex, selectedChoices),
      );
    }

    list.append(item);
  });

  return list;
};

const renderMeal = (plannedMeal, dayIndex, mealKey, onNutritionChange = () => {}) => {
  const wrapper = createElement("div", { className: "meal" });
  const title = createElement("strong", {
    className: "meal__title",
    text: plannedMeal.title,
  });
  const selectedChoices = getSelectedChoices(plannedMeal, dayIndex, mealKey);
  const nutritionLine = renderNutritionLine(calculateMealNutrition(plannedMeal, selectedChoices));
  const recalculate = () => {
    const updatedNutrition = calculateMealNutrition(plannedMeal, selectedChoices);

    updateNutritionLine(nutritionLine, updatedNutrition);
    onNutritionChange(updatedNutrition);
    renderWeeklyIngredientTotals();
    renderWeeklyNutrientTotals();
  };

  wrapper.append(title, renderIngredients(plannedMeal.ingredients, selectedChoices, (ingredientIndex, ingredientId) => {
    setSelectedIngredient(dayIndex, mealKey, ingredientIndex, ingredientId);
    recalculate();
  }), nutritionLine);

  if (plannedMeal.note) {
    wrapper.append(createElement("p", { className: "meal__note", text: plannedMeal.note }));
  }

  return wrapper;
};

const renderSummary = () => {
  const summary = document.querySelector("#summary");
  const fragment = document.createDocumentFragment();
  const selectorWrapper = createElement("div", { className: "summary__control" });

  getSummaryItems().forEach((item) => {
    const wrapper = createElement("div");
    const label = createElement("span", {
      className: "summary__label",
      text: item.label,
    });
    const value = createElement("strong", { text: item.value });

    wrapper.append(label, value);
    fragment.append(wrapper);
  });

  selectorWrapper.append(
    createElement("span", { className: "summary__label", text: "Meal plan" }),
    createPlanSelector(),
  );
  fragment.append(selectorWrapper);

  summary.replaceChildren(fragment);
};

const renderTable = () => {
  const tableHead = document.querySelector("#meal-table-head");
  const tableBody = document.querySelector("#meal-table-body");
  const headFragment = document.createDocumentFragment();
  const bodyFragment = document.createDocumentFragment();
  const currentMealPlan = getCurrentMealPlan();

  [
    { label: "Day", attrs: { scope: "col" } },
    ...mealTypes.map((mealType) => ({
      label: mealType.label,
      attrs: { scope: "col" },
    })),
    { label: "Day total", attrs: { scope: "col" } },
  ].forEach((column) => {
    headFragment.append(
      createElement("th", {
        text: column.label,
        attrs: column.attrs,
      }),
    );
  });

  if (currentMealPlan.length === 0) {
    const row = createElement("tr");
    const cell = createElement("td", {
      className: "empty-state",
      text: "This meal plan is empty.",
      attrs: { colspan: String(mealTypes.length + 2) },
    });

    row.append(cell);
    bodyFragment.append(row);
  }

  currentMealPlan.forEach((dayPlan, dayIndex) => {
    const row = createElement("tr");
    const dayHeader = createElement("th", {
      text: dayPlan.day,
      attrs: { scope: "row" },
    });
    const mealTotals = Object.fromEntries(
      mealTypes.map((mealType) => {
        const plannedMeal = dayPlan.meals[mealType.key];

        return [mealType.key, calculateMealNutrition(plannedMeal, getSelectedChoices(plannedMeal, dayIndex, mealType.key))];
      }),
    );
    const dailyTotal = renderDailyTotal(calculateDayNutrition(mealTotals));
    const dailyTotalLine = dailyTotal.querySelector(".nutrition-line");

    row.append(dayHeader);

    mealTypes.forEach((mealType) => {
      const cell = createElement("td");
      cell.append(renderMeal(dayPlan.meals[mealType.key], dayIndex, mealType.key, (updatedNutrition) => {
        mealTotals[mealType.key] = updatedNutrition;
        updateNutritionLine(dailyTotalLine, calculateDayNutrition(mealTotals));
      }));
      row.append(cell);
    });

    const totalCell = createElement("td", { className: "day-total-cell" });
    totalCell.append(dailyTotal);
    row.append(totalCell);

    bodyFragment.append(row);
  });

  tableHead.replaceChildren(headFragment);
  tableBody.replaceChildren(bodyFragment);
};

const renderCards = () => {
  const cards = document.querySelector("#meal-cards");
  const fragment = document.createDocumentFragment();
  const currentMealPlan = getCurrentMealPlan();

  if (currentMealPlan.length === 0) {
    fragment.append(createElement("p", {
      className: "empty-state",
      text: "This meal plan is empty.",
    }));
  }

  currentMealPlan.forEach((dayPlan, dayIndex) => {
    const card = createElement("article", { className: "day-card" });
    const heading = createElement("h2", { text: dayPlan.day });
    const details = createElement("dl");
    const mealTotals = Object.fromEntries(
      mealTypes.map((mealType) => {
        const plannedMeal = dayPlan.meals[mealType.key];

        return [mealType.key, calculateMealNutrition(plannedMeal, getSelectedChoices(plannedMeal, dayIndex, mealType.key))];
      }),
    );
    const dailyTotal = renderDailyTotal(calculateDayNutrition(mealTotals));
    const dailyTotalLine = dailyTotal.querySelector(".nutrition-line");

    mealTypes.forEach((mealType) => {
      const description = createElement("dd");
      description.append(renderMeal(dayPlan.meals[mealType.key], dayIndex, mealType.key, (updatedNutrition) => {
        mealTotals[mealType.key] = updatedNutrition;
        updateNutritionLine(dailyTotalLine, calculateDayNutrition(mealTotals));
      }));

      details.append(
        createElement("dt", { text: mealType.label }),
        description,
      );
    });

    card.append(heading, details, dailyTotal);
    fragment.append(card);
  });

  cards.replaceChildren(fragment);
};

const renderApp = () => {
  renderSummary();
  renderTable();
  renderCards();
  renderWeeklyIngredientTotals();
  renderWeeklyNutrientTotals();
};

renderApp();
