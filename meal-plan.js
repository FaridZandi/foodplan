const meal = (title, ingredients, note = "") => ({
  title,
  ingredients,
  note,
});

const food = (amount = "", unit = "", ingredients = []) => {
  const hasUnit = !Array.isArray(unit);

  return {
    amount,
    unit: hasUnit ? unit : "",
    ingredients: hasUnit ? ingredients : unit,
  };
};

const defaultMealPlan = [
  {
    day: "Sunday",
    meals: {
      breakfast: meal("Greek yogurt bowl", [
        food(1, "cup", [Ingredient.GREEK_YOGURT, Ingredient.COTTAGE_CHEESE, Ingredient.PLAIN_SKYR]),
        food(0.5, "cup", [Ingredient.BLUEBERRIES, Ingredient.RASPBERRIES, Ingredient.STRAWBERRIES]),
        food(1, [Ingredient.BANANA, Ingredient.ORANGE, Ingredient.APPLE]),
        food(2, "tbsp", [Ingredient.ALMONDS, Ingredient.WALNUTS, Ingredient.PUMPKIN_SEEDS]),
      ]),
      lunch: meal("Rotisserie chicken corn salad", [
        food(5, "oz", [Ingredient.ROTISSERIE_CHICKEN, Ingredient.GRILLED_CHICKEN_BREAST, Ingredient.DELI_TURKEY]),
        food(0.5, "cup", [Ingredient.FROZEN_CORN, Ingredient.BLACK_BEANS, Ingredient.FROZEN_PEAS]),
        food(2, "tbsp", [Ingredient.CHIPOTLE_SAUCE, Ingredient.SALSA, Ingredient.GREEK_YOGURT_RANCH]),
        food(2, "cups", [Ingredient.ROMAINE_SALAD, Ingredient.SPINACH, Ingredient.SPRING_MIX]),
      ]),
      dinner: meal("Air-fryer chicken rice bowl", [
        food(6, "oz", [Ingredient.MARINATED_CHICKEN_BREAST, Ingredient.CHICKEN_THIGHS, Ingredient.EXTRA_FIRM_TOFU]),
        food(1, "cup", [Ingredient.JASMINE_RICE, Ingredient.COOKED_BASMATI_RICE, Ingredient.COOKED_QUINOA]),
        food(2, "cups", [Ingredient.BROCCOLI_FLORETS, Ingredient.GREEN_BEANS, Ingredient.ZUCCHINI]),
      ]),
    },
  },
  {
    day: "Monday",
    meals: {
      breakfast: meal("Boiled eggs and toast", [
        food(2, [Ingredient.EGGS, Ingredient.EGG_WHITES, Ingredient.COTTAGE_CHEESE]),
        food(1, "slice", [Ingredient.WHOLE_WHEAT_TOAST, Ingredient.SOURDOUGH_TOAST, Ingredient.ENGLISH_MUFFIN]),
      ]),
      lunch: meal("Rotisserie chicken tortilla wrap", [
        food(1, [Ingredient.FLOUR_TORTILLA, Ingredient.WHOLE_WHEAT_TORTILLA, Ingredient.PITA]),
        food(5, "oz", [Ingredient.ROTISSERIE_CHICKEN, Ingredient.GRILLED_CHICKEN_BREAST, Ingredient.DELI_TURKEY]),
        food(0.5, "cup", [Ingredient.FROZEN_CORN, Ingredient.BLACK_BEANS, Ingredient.FROZEN_PEAS]),
        food(2, "tbsp", [Ingredient.CHIPOTLE_SAUCE, Ingredient.SALSA, Ingredient.GREEK_YOGURT_RANCH]),
        food(1, "cup", [Ingredient.ROMAINE_SALAD, Ingredient.SPINACH, Ingredient.SPRING_MIX]),
      ]),
      dinner: meal("Tuna cucumber toast", [
        food(1, "can", [Ingredient.CANNED_TUNA, Ingredient.CANNED_SALMON, Ingredient.CANNED_CHICKEN]),
        food(1, "slice", [Ingredient.SOURDOUGH_BREAD, Ingredient.WHOLE_WHEAT_BREAD, Ingredient.RYE_BREAD]),
        food(1, "tbsp", [Ingredient.MAYO, Ingredient.GREEK_YOGURT_CONDIMENT, Ingredient.MUSTARD]),
        food(0.5, [Ingredient.CUCUMBER, Ingredient.CELERY, Ingredient.BELL_PEPPER]),
      ]),
    },
  },
  {
    day: "Tuesday",
    meals: {
      breakfast: meal("Apple oatmeal", [
        food(0.5, "cup", [Ingredient.ROLLED_OATS]),
        food(1, [Ingredient.HONEYCRISP_APPLE, Ingredient.BANANA, Ingredient.PEAR]),
        food(1, "tbsp", [Ingredient.ALMONDS, Ingredient.WALNUTS, Ingredient.PUMPKIN_SEEDS]),
      ]),
      lunch: meal("Turkey Caesar salad", [
        food(1, "serving", [Ingredient.CAESAR_SALAD_KIT, Ingredient.SOUTHWEST_SALAD_KIT, Ingredient.CHOPPED_GARDEN_SALAD_KIT]),
        food(4, "oz", [Ingredient.DELI_TURKEY, Ingredient.DELI_CHICKEN, Ingredient.ROAST_BEEF]),
      ]),
      dinner: meal("Air-fryer chicken and broccoli", [
        food(6, "oz", [Ingredient.MARINATED_CHICKEN_BREAST, Ingredient.CHICKEN_THIGHS, Ingredient.EXTRA_FIRM_TOFU]),
        food(2, "cups", [Ingredient.BROCCOLI_FLORETS, Ingredient.GREEN_BEANS, Ingredient.ZUCCHINI]),
      ]),
    },
  },
  {
    day: "Wednesday",
    meals: {
      breakfast: meal("Cottage cheese with blueberries", [
        food(1, "cup", [Ingredient.COTTAGE_CHEESE]),
        food(0.5, "cup", [Ingredient.BLUEBERRIES, Ingredient.RASPBERRIES, Ingredient.STRAWBERRIES]),
      ]),
      lunch: meal("Turkey cheddar sandwich", [
        food(2, "slices", [Ingredient.SOURDOUGH_BREAD, Ingredient.WHOLE_WHEAT_BREAD, Ingredient.RYE_BREAD]),
        food(4, "oz", [Ingredient.DELI_TURKEY, Ingredient.DELI_CHICKEN, Ingredient.ROAST_BEEF]),
        food(1, "slice", [Ingredient.CHEDDAR_CHEESE, Ingredient.SWISS_CHEESE, Ingredient.PROVOLONE]),
        food(1, [Ingredient.HONEYCRISP_APPLE, Ingredient.BANANA, Ingredient.PEAR]),
      ]),
      dinner: meal("Tuna spinach rice bowl", [
        food(1, "can", [Ingredient.CANNED_TUNA, Ingredient.CANNED_SALMON, Ingredient.CANNED_CHICKEN]),
        food(1, "cup", [Ingredient.JASMINE_RICE, Ingredient.COOKED_BASMATI_RICE, Ingredient.COOKED_QUINOA]),
        food(2, "cups", [Ingredient.SPINACH, Ingredient.ARUGULA, Ingredient.KALE]),
        food(1, "tbsp", [Ingredient.CHIPOTLE_SAUCE, Ingredient.SALSA, Ingredient.GREEK_YOGURT_RANCH]),
      ]),
    },
  },
  {
    day: "Thursday",
    meals: {
      breakfast: meal("Peanut butter banana toast", [
        food(1, "slice", [Ingredient.WHOLE_WHEAT_TOAST, Ingredient.SOURDOUGH_TOAST, Ingredient.ENGLISH_MUFFIN]),
        food(2, "tbsp", [Ingredient.PEANUT_BUTTER, Ingredient.ALMOND_BUTTER, Ingredient.SUNFLOWER_SEED_BUTTER]),
        food(1, [Ingredient.BANANA, Ingredient.ORANGE, Ingredient.APPLE]),
      ]),
      lunch: meal("Hummus pita plate", [
        food(1, [Ingredient.WHOLE_WHEAT_PITA]),
        food(0.33, "cup", [Ingredient.HUMMUS, Ingredient.ROASTED_RED_PEPPER_HUMMUS, Ingredient.TZATZIKI]),
        food(1, "cup", [Ingredient.BABY_CARROTS, Ingredient.SNAP_PEAS, Ingredient.BELL_PEPPER_STRIPS]),
        food(0.5, [Ingredient.CUCUMBER, Ingredient.CELERY, Ingredient.BELL_PEPPER]),
        food(2, [Ingredient.EGGS, Ingredient.EGG_WHITES, Ingredient.COTTAGE_CHEESE]),
      ]),
      dinner: meal("Lentil soup with toast", [
        food(1, "can", [Ingredient.LENTIL_SOUP, Ingredient.CANNED_BLACK_BEAN_SOUP, Ingredient.CANNED_MINESTRONE]),
        food(1, "slice", [Ingredient.WHOLE_WHEAT_TOAST, Ingredient.SOURDOUGH_TOAST, Ingredient.ENGLISH_MUFFIN]),
      ]),
    },
  },
  {
    day: "Friday",
    meals: {
      breakfast: meal("Greek yogurt granola bowl", [
        food(1, "cup", [Ingredient.GREEK_YOGURT, Ingredient.COTTAGE_CHEESE, Ingredient.PLAIN_SKYR]),
        food(0.33, "cup", [Ingredient.GRANOLA, Ingredient.MUESLI, Ingredient.BRAN_CEREAL]),
        food(0.5, "cup", [Ingredient.BLUEBERRIES, Ingredient.RASPBERRIES, Ingredient.STRAWBERRIES]),
      ]),
      lunch: meal("Chicken Caesar salad", [
        food(1, "serving", [Ingredient.CAESAR_SALAD_KIT, Ingredient.SOUTHWEST_SALAD_KIT, Ingredient.CHOPPED_GARDEN_SALAD_KIT]),
        food(4, "oz", [Ingredient.ROTISSERIE_CHICKEN, Ingredient.GRILLED_CHICKEN_BREAST, Ingredient.DELI_TURKEY]),
      ]),
      dinner: meal("Frozen burrito bowl", [
        food(1, [Ingredient.FROZEN_BURRITO_BOWL, Ingredient.FROZEN_CHICKEN_FRIED_RICE, Ingredient.FROZEN_VEGETABLE_CURRY_BOWL]),
      ]),
    },
  },
  {
    day: "Saturday",
    meals: {
      breakfast: meal("Scrambled eggs with spinach toast", [
        food(2, [Ingredient.EGGS, Ingredient.EGG_WHITES, Ingredient.COTTAGE_CHEESE]),
        food(1, "cup", [Ingredient.SPINACH, Ingredient.ARUGULA, Ingredient.KALE]),
        food(1, "slice", [Ingredient.WHOLE_WHEAT_TOAST, Ingredient.SOURDOUGH_TOAST, Ingredient.ENGLISH_MUFFIN]),
      ]),
      lunch: meal("Tuna sourdough sandwich", [
        food(1, "can", [Ingredient.CANNED_TUNA, Ingredient.CANNED_SALMON, Ingredient.CANNED_CHICKEN]),
        food(2, "slices", [Ingredient.SOURDOUGH_BREAD, Ingredient.WHOLE_WHEAT_BREAD, Ingredient.RYE_BREAD]),
        food(1, "tbsp", [Ingredient.MAYO, Ingredient.GREEK_YOGURT_CONDIMENT, Ingredient.MUSTARD]),
        food(0.5, [Ingredient.CUCUMBER, Ingredient.CELERY, Ingredient.BELL_PEPPER]),
      ]),
      dinner: meal("Rotisserie chicken rice reset bowl", [
        food(5, "oz", [Ingredient.ROTISSERIE_CHICKEN, Ingredient.GRILLED_CHICKEN_BREAST, Ingredient.DELI_TURKEY]),
        food(1, "cup", [Ingredient.JASMINE_RICE, Ingredient.COOKED_BASMATI_RICE, Ingredient.COOKED_QUINOA]),
        food(1.5, "cups", [Ingredient.BROCCOLI_FLORETS, Ingredient.GREEN_BEANS, Ingredient.ZUCCHINI]),
        food(1, "tbsp", [Ingredient.CHIPOTLE_SAUCE, Ingredient.SALSA, Ingredient.GREEK_YOGURT_RANCH]),
      ]),
    },
  },
];

const emptyMealPlan = [{
    day: "Sunday",
    meals: {
      breakfast: meal("Greek yogurt bowl", [
        food(1, "cup", [Ingredient.GREEK_YOGURT, Ingredient.PLAIN_SKYR]),
        food(0.5, "cup", [Ingredient.BLUEBERRIES]),
        food(50, "g", [Ingredient.GRANOLA]),
        food(2, "tbsp", [Ingredient.ALMONDS, Ingredient.WALNUTS, Ingredient.PUMPKIN_SEEDS]),
      ]),
      lunch: meal("Rotisserie chicken corn salad", [
        food(5, "oz", [Ingredient.ROTISSERIE_CHICKEN, Ingredient.GRILLED_CHICKEN_BREAST, Ingredient.DELI_TURKEY]),
        food(0.5, "cup", [Ingredient.FROZEN_CORN, Ingredient.BLACK_BEANS, Ingredient.FROZEN_PEAS]),
        food(2, "tbsp", [Ingredient.CHIPOTLE_SAUCE, Ingredient.SALSA, Ingredient.GREEK_YOGURT_RANCH]),
        food(2, "cups", [Ingredient.ROMAINE_SALAD, Ingredient.SPINACH, Ingredient.SPRING_MIX]),
      ]),
      dinner: meal("Air-fryer chicken rice bowl", [
        food(6, "oz", [Ingredient.MARINATED_CHICKEN_BREAST, Ingredient.CHICKEN_THIGHS, Ingredient.EXTRA_FIRM_TOFU]),
        food(1, "cup", [Ingredient.JASMINE_RICE, Ingredient.COOKED_BASMATI_RICE, Ingredient.COOKED_QUINOA]),
        food(2, "cups", [Ingredient.BROCCOLI_FLORETS, Ingredient.GREEN_BEANS, Ingredient.ZUCCHINI]),
      ]),
    },
  }];

const mealPlans = Object.freeze([
    {
    id: "empty-plan",
    name: "Empty plan",
    plan: emptyMealPlan,
  },
  {
    id: "weekly-default",
    name: "Weekly default",
    plan: defaultMealPlan,
  },
]);

let mealPlan = mealPlans[0].plan;
