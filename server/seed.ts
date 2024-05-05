import "dotenv/config";
import { Session } from "fastify";
import { createLoaders } from "./lib/loaders";
import { Role, User } from "@prisma/client";
import { create, db } from "./lib/database";

const OWNER_EMAILS = process.env.OWNER_EMAILS!.split(",");
const BOT_UUID = process.env.BOT_UUID!;
const URL_PROD = process.env.URL_PROD!;

async function main() {
  const botUser: User = {
    id: BOT_UUID,
    email: `noreply@${URL_PROD}`,
    role: Role.Owner,
    updatedDate: new Date(),
    createdDate: new Date(),
    createdById: BOT_UUID,
    updatedById: BOT_UUID,
    isDeleted: false,
    passwordEncrypted: null,
    refreshTokenEncrypted: null,
  };

  const result = await db
    .insertInto("User")
    .values(botUser)
    .returning(["id"])
    .executeTakeFirstOrThrow();

  const session = {
    me: botUser,
    loaders: createLoaders(),
  } as Session;

  OWNER_EMAILS.forEach(async (email) => {
    create("User", session, {
      email: email,
      role: Role.Owner,
      passwordEncrypted: null,
      refreshTokenEncrypted: null,
    });
  });
}

main();
