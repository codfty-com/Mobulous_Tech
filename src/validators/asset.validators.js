const statuses = ["available", "coming_soon", "disabled"];
const valuationSources = ["stocks", "mutual_funds", "none"];
const result = (errors, data) =>
  errors.length ? { success: false, errors } : { success: true, data };
const trimmedString = (value) =>
  typeof value === "string" ? value.trim() : undefined;

const buildAsset = (body, required) => {
  const errors = [];
  const data = {};

  for (const [field, maxLength] of [
    ["assetId", 50], ["key", 50], ["name", 100], ["icon", 500], ["description", 500],
    ["dataRoute", 200], ["searchParam", 50],
  ]) {
    if (body[field] === undefined) continue;
    if (body[field] === null && ["dataRoute", "searchParam"].includes(field)) {
      data[field] = null;
      continue;
    }
    const value = trimmedString(body[field]);
    if (value === undefined) errors.push(`${field} must be a string`);
    else if (!value && ["assetId", "key", "name"].includes(field)) errors.push(`${field} cannot be empty`);
    else if (value.length > maxLength) errors.push(`${field} cannot exceed ${maxLength} characters`);
    else data[field] = field === "key" ? value.toLowerCase() : value;
  }

  if (data.key && !/^[a-z0-9_]+$/.test(data.key)) {
    errors.push("key can only contain lowercase letters, numbers, and underscores");
  }

  if (body.status !== undefined) {
    const value = trimmedString(body.status)?.toLowerCase();
    if (!statuses.includes(value)) errors.push(`status must be one of: ${statuses.join(", ")}`);
    else data.status = value;
  }

  if (body.valuationSource !== undefined) {
    const value = trimmedString(body.valuationSource)?.toLowerCase();
    if (!valuationSources.includes(value)) {
      errors.push(`valuationSource must be one of: ${valuationSources.join(", ")}`);
    } else data.valuationSource = value;
  }

  if (body.examples !== undefined) {
    if (!Array.isArray(body.examples)) errors.push("examples must be an array of strings");
    else {
      const examples = body.examples.map(trimmedString);
      if (examples.some((value) => !value)) errors.push("examples must only contain non-empty strings");
      else if (examples.length > 20) errors.push("examples cannot contain more than 20 items");
      else data.examples = examples;
    }
  }

  if (body.displayOrder !== undefined) {
    const value = Number(body.displayOrder);
    if (!Number.isInteger(value) || value < 0) errors.push("displayOrder must be a non-negative integer");
    else data.displayOrder = value;
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") errors.push("isActive must be a boolean");
    else data.isActive = body.isActive;
  }

  if (required) {
    for (const field of ["key", "name"]) {
      if (!data[field]) errors.push(`${field} is required`);
    }
  } else if (!Object.keys(data).length) errors.push("At least one asset field is required");

  return result(errors, data);
};

export const createAssetSchema = { body: (body) => buildAsset(body, true) };
export const updateAssetSchema = { body: (body) => buildAsset(body, false) };
export const getAssetsQuerySchema = {
  query(query) {
    const errors = [];
    const data = {};
    if (query.status !== undefined) {
      const status = trimmedString(query.status)?.toLowerCase();
      if (!statuses.includes(status)) errors.push(`status must be one of: ${statuses.join(", ")}`);
      else data.status = status;
    }
    if (query.isActive !== undefined) {
      const value = String(query.isActive).toLowerCase();
      if (!["true", "false"].includes(value)) errors.push("isActive must be true or false");
      else data.isActive = value === "true";
    }
    return result(errors, data);
  },
};
