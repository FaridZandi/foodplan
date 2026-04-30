const FDC_API_KEY = "DEMO_KEY";
const FDC_API_KEY_STORAGE_KEY = "foodplan.fdcApiKey";
const FDC_BASE_URL = "https://api.nal.usda.gov/fdc/v1";

const readFdcApiKey = () => {
  try {
    return localStorage.getItem(FDC_API_KEY_STORAGE_KEY)?.trim() || FDC_API_KEY;
  } catch {
    return FDC_API_KEY;
  }
};

const writeFdcApiKey = (apiKey) => {
  const trimmed = apiKey.trim();

  if (!trimmed) {
    localStorage.removeItem(FDC_API_KEY_STORAGE_KEY);
    return;
  }

  localStorage.setItem(FDC_API_KEY_STORAGE_KEY, trimmed);
};

const appendSearchParam = (url, key, value) => {
  if (Array.isArray(value)) {
    value.filter(Boolean).forEach((item) => url.searchParams.append(key, item));
    return;
  }

  if (value !== undefined && value !== "") {
    url.searchParams.set(key, value);
  }
};

const readFdcError = async (response) => {
  const fallback = `${response.status} ${response.statusText}`.trim();

  try {
    const payload = await response.json();
    const code = payload?.error?.code;
    const message = payload?.error?.message ?? payload?.message;
    const details = [code, message].filter(Boolean).join(": ");

    return details ? `${fallback}: ${details}` : fallback;
  } catch {
    try {
      const text = await response.text();

      return text ? `${fallback}: ${text}` : fallback;
    } catch {
      return fallback;
    }
  }
};

const fdcFetchJson = async (path, params = {}) => {
  const url = new URL(`${FDC_BASE_URL}${path}`);

  Object.entries({ api_key: readFdcApiKey(), ...params }).forEach(([key, value]) => {
    appendSearchParam(url, key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`FoodData Central request failed (${await readFdcError(response)})`);
  }

  return response.json();
};

const Fdc = Object.freeze({
  getApiKey: readFdcApiKey,
  isUsingDemoKey: () => readFdcApiKey() === FDC_API_KEY,
  setApiKey: writeFdcApiKey,

  searchFoods: (query) =>
    fdcFetchJson("/foods/search", {
      query,
      pageSize: 8,
    }),

  getFood: (fdcId) => fdcFetchJson(`/food/${fdcId}`),
});
