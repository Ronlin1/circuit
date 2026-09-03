function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((acc, key) => {
      if (value[key] !== undefined) acc[key] = normalize(value[key]);
      return acc;
    }, {});
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(normalize(value));
}
