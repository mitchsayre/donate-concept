import DataLoader from "dataloader";
import { db } from "./database";
import { DB } from "../../prisma/generated/kysely";
import { Prisma } from "@prisma/client";
import PrismaRuntime from "@prisma/client/runtime/library";

// Enables getting a Prisma type from a string. Ex: PrismaModel<"User">
// https://github.com/prisma/prisma/issues/6980#issuecomment-2049264510
export type ModelName = Prisma.ModelName;
// type PrismaModelName = ModelName;
export type PrismaModelType<N extends ModelName = ModelName> = Prisma.TypeMap["model"][N];
export type PrismaModelPayload<N extends ModelName = ModelName> = PrismaModelType<N>["payload"];
export type PrismaModel<N extends ModelName = ModelName> =
  PrismaRuntime.Types.Result.DefaultSelection<PrismaModelPayload<N>>;

function createLoader<T1 extends keyof DB & string, T2 extends PrismaModel<T1>>(
  tableName: T1,
  columnName: keyof DB[T1]
) {
  return new DataLoader<string, T2 | null>(
    (keys) =>
      new Promise(async (resolve) => {
        try {
          const rows: any = await db
            .selectFrom(tableName)
            .selectAll()
            .where(columnName as any, "in", keys)
            .execute();

          resolve(keys.map((key) => rows.find((row: any) => row[columnName] === key) || null));
        } catch (error) {
          console.error(`Error loading for ${tableName}:`, error);
          resolve(keys.map(() => null)); // Resolve with nulls in case of error
        }
      })
  );
}

export function createLoaders() {
  return {
    user: createLoader("User", "id"),
    refreshToken: createLoader("RefreshToken", "id"),
    // 1 to 1 relation loaders
    userFromEmail: createLoader("User", "email"),
    refreshTokenFromAccessToken: createLoader("RefreshToken", "accessTokenId"),
  };
}
