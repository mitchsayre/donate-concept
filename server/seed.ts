import "dotenv/config";
import { createLoaders } from "./lib/loaders";
import { AuthMethod, Role, User } from "@prisma/client";
import { create, db } from "./lib/database";
import { sendSignupEmail } from "./lib/email";
import { Session, SessionToken } from "./lib/bootstrap";
import { randomUUID } from "crypto";
import { encrypt } from "./lib/secrets";
import { RefreshToken } from "@prisma/client";

const OWNER_EMAILS = process.env.OWNER_EMAILS!.split(",");
const BOT_UUID = process.env.BOT_UUID!;
const URL = process.env.URL!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(
  process.env.SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD!
);
const ACCESS_TOKEN_VALIDITY_PERIOD = parseInt(process.env.ACCESS_TOKEN_VALIDITY_PERIOD!);

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

  const owners = await Promise.all(
    OWNER_EMAILS.map(async (email) => {
      return create("User", session, {
        email: email,
        role: Role.Owner,
        passwordEncrypted: null,
        passwordSalt: null,
        authMethod: AuthMethod.Pending,
        organizationId: null,
      });
    })
  );

  owners.forEach(async (owner) => {
    if (!owner) {
      throw Error("Failed to create owner");
    }

    const signupToken: SessionToken = {
      sub: owner.id,
      exp: Date.now() + ACCESS_TOKEN_VALIDITY_PERIOD,
      id: randomUUID(),
    };

    const refreshToken = await create("RefreshToken", session, {
      userId: owner.id,
      expiresAt: new Date(Date.now() + SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD),
      accessTokenId: signupToken.id,
    });

    const signupTokenEncrypted = encrypt(JSON.stringify(signupToken), SESSION_ENCRYPTION_KEY);
    console.log(`Signup token for ${owner.email}: ${signupTokenEncrypted}`);
    // TODO: Send signup email
  });
}

main();
