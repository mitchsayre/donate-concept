import { DB } from "../../prisma/generated/kysely";
import pg from "pg";
import { Kysely, PostgresDialect } from "kysely";
import { removeNullFieldsThatAreNonNullable } from "./helpers";
import { PrismaModel, createLoaders } from "./loaders";
import { Session } from "./bootstrap";
export const PAGE_LIMIT = 100;

const POSTGRES_USER = process.env.POSTGRES_USER;
const POSTGRES_DB = process.env.POSTGRES_DB;
const POSTGRES_PW = process.env.POSTGRES_PW;
const POSTGRES_PORT = parseInt(process.env.POSTGRES_PORT!);
const POSTGRES_SERVICE_NAME = process.env.POSTGRES_SERVICE_NAME;

const dialect = new PostgresDialect({
  pool: new pg.Pool({
    database: POSTGRES_DB,
    host: POSTGRES_SERVICE_NAME,
    user: POSTGRES_USER,
    password: POSTGRES_PW,
    port: POSTGRES_PORT,
    max: 10,
  }),
});

export const db = new Kysely<DB>({
  dialect,
});

export async function create<T extends keyof DB & string>(
  tableName: T,
  session: Session,
  input: Omit<
    DB[T],
    "id" | "createdById" | "updatedById" | "createdDate" | "updatedDate" | "isDeleted"
  >
) {
  const me = session.me;
  if (!me) {
    throw Error(`User sesssion not established.`);
  }

  const inputAny = input as any;
  inputAny.id = undefined;
  inputAny.createdDate = new Date();
  inputAny.updatedDate = new Date();
  inputAny.createdById = me.id;
  inputAny.updatedById = me.id;
  inputAny.isDeleted = false;

  const result = await db
    .insertInto(tableName)
    .values(inputAny)
    .returning(["id"])
    .executeTakeFirstOrThrow();

  const tableNameCamelCase = (tableName.charAt(0).toLowerCase() +
    tableName.slice(1)) as keyof ReturnType<typeof createLoaders>;

  const row = await session.loaders[tableNameCamelCase].load(result.id);

  if (!row) {
    throw Error(`Failed to create new ${tableName}.`);
  }

  return row;
}

export async function update<T1 extends keyof DB & string, T2 extends PrismaModel<T1>>(
  tableName: T1,
  session: Session,
  input: Partial<
    Omit<T2, "createdById" | "updatedById" | "createdDate" | "updatedDate" | "isDeleted">
  > & { id: string }
) {
  const me = session.me;
  if (!me) {
    throw Error(`User sesssion not established.`);
  }

  const inputAny = input as any;
  inputAny.updatedDate = new Date();
  inputAny.updatedById = me.id;

  const id = inputAny.id;
  inputAny.id = undefined;

  const result = await db
    .updateTable(tableName)
    .set(inputAny)
    .where("id", "=", id)
    .executeTakeFirstOrThrow();

  const tableNameCamelCase = (tableName.charAt(0).toLowerCase() +
    tableName.slice(1)) as keyof ReturnType<typeof createLoaders>;

  const row = (await session.loaders[tableNameCamelCase].load(id)) as T2;

  if (!row) {
    throw Error(`${tableName} not found with id: ${id}.`);
  }

  return row;
}

// export async function get<T extends keyof DB & string>(table: T, id: string) {
//   let ans: keyof DB;
//   const rows = await db
//     .selectFrom(table)
//     .selectAll()
//     .where("checksumMD5ForWeights", "in", keys)
//     .execute();
// }

// export async function create() {
//   const input = removeNullFieldsThatAreNonNullable<VoiceModel>(
//     { ...args.input },
//     VoiceModelNullability
//   );
//   input.id = undefined;

//   const result = await db
//     .updateTable("VoiceModel")
//     .set(input)
//     .where("id", "=", args.input.id)
//     .executeTakeFirstOrThrow();

//   const row = await context.loaders.voiceModel.load(args.input.id);
//   return row as NonNullable<typeof row>;
// }

// {
//   let requestedLimit = args.first ?? args.last ?? 0;
//   let limit = Math.min(requestedLimit, PAGE_LIMIT);
//   limit = limit + 1; // Retrieve an extra record used for pageInfo hasNextPage/hasPreviousPage

//   let cursor = query.cursor?.id;
//   let cursorRow: VoiceModel | null = null;
//   if (cursor) {
//     cursorRow = await loaders.voiceModel.load(cursor);
//     // TODO: Error handle if cursorRow not found
//   }

//   // Based on https://the-guild.dev/blog/graphql-cursor-pagination-with-postgresql
//   let result = await db
//     .selectFrom("VoiceModel")
//     .select(["id", "name", "hidden"])

//     .where("isDeleted", "=", false)

//     .$if(args.first ? true : false, (qb) => qb.orderBy(["name asc", "id asc"]))
//     .$if(args.last ? true : false, (qb) => qb.orderBy(["name desc", "id desc"]))

//     // .$if(args.minDownloadCount ? true : false, (qb) =>
//     //   qb.where("downloadCount", ">=", args.minDownloadCount!)
//     // )

//     .$if(args.after && cursorRow ? true : false, (qb) =>
//       qb.where((eb) =>
//         eb.or([
//           eb("name", "=", cursorRow?.name!).and("id", ">", cursorRow?.id!),
//           eb("name", ">", cursorRow?.name!),
//         ])
//       )
//     )
//     .$if(args.before && cursorRow ? true : false, (qb) =>
//       qb.where((eb) =>
//         eb.or([
//           eb("name", "=", cursorRow?.name!).and("id", "<", cursorRow?.id!),
//           eb("name", "<", cursorRow?.name!),
//         ])
//       )
//     )

//     .limit(limit)
//     .execute();

//   let ids = result.map((row) => row.id);
//   let rows = await Promise.all(ids.map((id) => context.loaders.voiceModel.load(id)));

//   if (rows.some((item) => item === null)) {
//     throw new Error(
//       "One or more records returned by the loader are either null or instanceof Error."
//     );
//   } else {
//     if (args.last) {
//       rows = rows.reverse();
//     }
//     return rows as VoiceModel[];
//   }
// }
