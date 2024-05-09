import { FastifyInstance } from "fastify";
import { Signup } from "./view/signup.view";
import { SignupRequest, SignupSchema } from "./signup.util";
import { SignupOptions } from "./view/signup-options.view";
import { decrypt, encrypt, generateSalt } from "../../lib/secrets";
import { AuthMethod, Role, User } from "@prisma/client";
import { create, db, update } from "../../lib/database";
import { randomUUID } from "crypto";
import { sendSignupEmail } from "../../lib/email";
import { SignupExpired } from "./view/signup-expired.view";
import { SignupToken } from "../../lib/bootstrap";

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN!;
const REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(process.env.REFRESH_TOKEN_VALIDITY_PERIOD!);

export const SignupRouter = async (app: FastifyInstance) => {
  app.get("/signup/expired", { preHandler: app.auth([app.verifyAuthenticated]) }, async () => {
    return <SignupExpired />;
  });

  app.get("/signup/options", { preHandler: app.auth([app.verifyPending]) }, async () => {
    return <SignupOptions />;
  });

  app.get("/signup", { preHandler: app.auth([app.verifyPending]) }, async () => {
    return <Signup />;
  });

  app.post("/signup", { preHandler: app.auth([app.verifyPending]) }, async (req, reply) => {
    const body = req.body as SignupRequest;
    const result = SignupSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      return <Signup body={body} errors={errors} />;
    }

    const me = req.session.me;

    if (!me) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    const passwordSalt = generateSalt();
    const passwordSalted = `${passwordSalt}${body.password}`;
    const passwordEncrypted = encrypt(passwordSalted, DB_ENCRYPTION_KEY);

    const refreshToken = create("RefreshToken", req.session, {
      userId: me.id,
      accessTokenId: randomUUID(),
      expiresAt: Date.now() + REFRESH_TOKEN_VALIDITY_PERIOD,
    });

    if (!refreshToken) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    const userUpdated = await update("User", req.session, {
      passwordEncrypted,
      passwordSalt,
      authMethod: AuthMethod.Email,
    });

    reply.clearCookie("signupSession", {
      // path: "/",
      domain: WEBSITE_DOMAIN,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
  });
};
