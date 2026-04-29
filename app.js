const mealTypes = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "dinner", label: "Dinner" },
];

const allMeals = mealPlan.flatMap((dayPlan) =>
  mealTypes.map((mealType) => dayPlan.meals[mealType.key]),
);

const ingredientCount = allMeals.reduce(
  (count, plannedMeal) => count + plannedMeal.ingredients.length,
  0,
);

const summaryItems = [
  {
    label: "Week structure",
    value: `${mealPlan.length} days`,
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

const getChoiceNutrition = (ingredientId) => {
  const nutritionDetails = ingredientNutrition[ingredientId];

  if (!nutritionDetails) {
    throw new Error(`Missing nutrition estimate for: ${getChoiceName(ingredientId)}`);
  }

  return nutritionDetails;
};

const normalizeUnit = (unit) => String(unit).toLowerCase().replace(/s$/, "");

const sameUnit = (firstUnit, secondUnit) => normalizeUnit(firstUnit) === normalizeUnit(secondUnit);

const scaleNutrition = (plannedIngredient, choice) => {
  const nutritionDetails = getChoiceNutrition(choice);
  const amount = plannedIngredient.amount === "" ? nutritionDetails.amount : plannedIngredient.amount;
  const scale = sameUnit(plannedIngredient.unit, nutritionDetails.unit)
    ? amount / nutritionDetails.amount
    : 1;

  return {
    calories: nutritionDetails.calories * scale,
    protein: nutritionDetails.protein * scale,
    carbs: nutritionDetails.carbs * scale,
    fat: nutritionDetails.fat * scale,
  };
};

const addNutrition = (total, nutritionDetails) => ({
  calories: total.calories + nutritionDetails.calories,
  protein: total.protein + nutritionDetails.protein,
  carbs: total.carbs + nutritionDetails.carbs,
  fat: total.fat + nutritionDetails.fat,
});

const calculateMealNutrition = (plannedMeal, selectedChoices) =>
  plannedMeal.ingredients
    .map((plannedIngredient, index) => scaleNutrition(plannedIngredient, selectedChoices[index]))
    .reduce(addNutrition, { calories: 0, protein: 0, carbs: 0, fat: 0 });

const formatMacro = (value) => Math.round(value);

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
    onChange();
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
      );
    } else {
      item.append(renderIngredientChoice(plannedIngredient, ingredientIndex, selectedChoices, onChange));
    }

    list.append(item);
  });

  return list;
};

const renderMeal = (plannedMeal) => {
  const wrapper = createElement("div", { className: "meal" });
  const title = createElement("strong", {
    className: "meal__title",
    text: plannedMeal.title,
  });
  const selectedChoices = plannedMeal.ingredients.map((plannedIngredient) =>
    plannedIngredient.ingredients[0],
  );
  const nutritionLine = renderNutritionLine(calculateMealNutrition(plannedMeal, selectedChoices));
  const recalculate = () => {
    updateNutritionLine(nutritionLine, calculateMealNutrition(plannedMeal, selectedChoices));
  };

  wrapper.append(title, renderIngredients(plannedMeal.ingredients, selectedChoices, recalculate), nutritionLine);

  if (plannedMeal.note) {
    wrapper.append(createElement("p", { className: "meal__note", text: plannedMeal.note }));
  }

  return wrapper;
};

const renderSummary = () => {
  const summary = document.querySelector("#summary");
  const fragment = document.createDocumentFragment();

  summaryItems.forEach((item) => {
    const wrapper = createElement("div");
    const label = createElement("span", {
      className: "summary__label",
      text: item.label,
    });
    const value = createElement("strong", { text: item.value });

    wrapper.append(label, value);
    fragment.append(wrapper);
  });

  summary.replaceChildren(fragment);
};

const renderTable = () => {
  const tableHead = document.querySelector("#meal-table-head");
  const tableBody = document.querySelector("#meal-table-body");
  const headFragment = document.createDocumentFragment();
  const bodyFragment = document.createDocumentFragment();

  [
    { label: "Day", attrs: { scope: "col" } },
    ...mealTypes.map((mealType) => ({
      label: mealType.label,
      attrs: { scope: "col" },
    })),
  ].forEach((column) => {
    headFragment.append(
      createElement("th", {
        text: column.label,
        attrs: column.attrs,
      }),
    );
  });

  mealPlan.forEach((dayPlan) => {
    const row = createElement("tr");
    const dayHeader = createElement("th", {
      text: dayPlan.day,
      attrs: { scope: "row" },
    });

    row.append(dayHeader);

    mealTypes.forEach((mealType) => {
      const cell = createElement("td");
      cell.append(renderMeal(dayPlan.meals[mealType.key]));
      row.append(cell);
    });

    bodyFragment.append(row);
  });

  tableHead.replaceChildren(headFragment);
  tableBody.replaceChildren(bodyFragment);
};

const renderCards = () => {
  const cards = document.querySelector("#meal-cards");
  const fragment = document.createDocumentFragment();

  mealPlan.forEach((dayPlan) => {
    const card = createElement("article", { className: "day-card" });
    const heading = createElement("h2", { text: dayPlan.day });
    const details = createElement("dl");

    mealTypes.forEach((mealType) => {
      const description = createElement("dd");
      description.append(renderMeal(dayPlan.meals[mealType.key]));

      details.append(
        createElement("dt", { text: mealType.label }),
        description,
      );
    });

    card.append(heading, details);
    fragment.append(card);
  });

  cards.replaceChildren(fragment);
};

renderSummary();
renderTable();
renderCards();
