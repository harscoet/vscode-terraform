export function newMap<T>(value: { [key: string]: T }): Map<string, T> {
  return new Map(Object.keys(value).map((x) => [x, value[x]]));
}
