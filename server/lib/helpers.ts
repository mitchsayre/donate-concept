type UndefinedPartial<T> = {
  [K in keyof T]?: T[keyof T] extends null ? null : T[K];
};

export function removeNullFieldsThatAreNonNullable<T extends object>(
  input: Record<string, any>,
  nullability: { [K in keyof T]?: boolean | undefined }
): UndefinedPartial<T> {
  const keysToRemove: (keyof T)[] = [];

  for (const key in input) {
    if (input[key] === null && nullability[key as keyof T] !== true) {
      keysToRemove.push(key as keyof T);
    }
  }

  for (const key of keysToRemove) {
    delete input[key as string];
  }

  return input as UndefinedPartial<T>;
}
