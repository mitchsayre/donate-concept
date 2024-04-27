import DataLoader from "dataloader";
import { db } from "../database";
import { DB } from "../../prisma/generated/kysely";

function createLoader<T extends keyof DB & string>(tableName: T, columnName: keyof DB[T]) {
  return new DataLoader<string, DB[T] | null>(
    (keys) =>
      new Promise(async (resolve) => {
        try {
          const rows: any = await db
            .selectFrom(tableName)
            .selectAll()
            .where(columnName as any, "in", keys)
            .execute();

          resolve(keys.map((key) => rows.find((row: any) => row.id === key) || null));
        } catch (error) {
          console.error(`Error loading ${tableName}:`, error);
          resolve(keys.map(() => null)); // Resolve with nulls in case of error
        }
      })
  );
}

export function createLoaders() {
  return {
    user: createLoader("User", "id"),
  };
}
