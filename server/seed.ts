import "dotenv/config";
import { createLoaders } from "./lib/loaders";
import { AuthMethod, Role, User } from "@prisma/client";
import { create, db } from "./lib/database";
import { sendSignupEmail } from "./lib/email";
import { Session } from "./lib/bootstrap";

const OWNER_EMAILS = process.env.OWNER_EMAILS!.split(",");
const BOT_UUID = process.env.BOT_UUID!;
const URL = process.env.URL!;

async function main() {
  const botUser: User = {
    id: BOT_UUID,
    email: `noreply@${URL}`,
    role: Role.Owner,
    updatedDate: new Date(),
    createdDate: new Date(),
    createdById: BOT_UUID,
    updatedById: BOT_UUID,
    isDeleted: false,
    passwordEncrypted: null,
    passwordSalt: null,
    authMethod: AuthMethod.None,
    organizationId: null,
  };

  const result = await db
    .insertInto("User")
    .values(botUser)
    .returning(["id"])
    .executeTakeFirstOrThrow();

  const session: Session = {
    me: botUser,
    loaders: createLoaders(),
  };

  OWNER_EMAILS.forEach(async (email) => {
    create("User", session, {
      email: email,
      role: Role.Owner,
      passwordEncrypted: null,
      passwordSalt: null,
      authMethod: AuthMethod.Pending,
      organizationId: null,
    });
  });
}

main();
