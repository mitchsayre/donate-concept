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
import { SessionToken } from "../../lib/bootstrap";

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN!;
const REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(process.env.REFRESH_TOKEN_VALIDITY_PERIOD!);
const SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(
  process.env.SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD!
);

export const SignupRouter = async (app: FastifyInstance) => {
  app.get("/signup/expired", async () => {
    return <SignupExpired />;
  });

  app.get("/signup/options", { preHandler: app.auth([app.verifyPending]) }, async (req) => {
    return <SignupOptions />;
  });

  app.get("/signup", async (req, reply) => {
    if (req.session.me) {
      reply.redirect("/dashboard");
    } else {
      try {
        const queryParams = req.query as any;
        if (!queryParams.token) {
          return Error("Invalid registration session");
        }

        const signupTokenString = decrypt(queryParams.token, SESSION_ENCRYPTION_KEY);
        const signupToken: SessionToken = JSON.parse(signupTokenString);

        if (!signupToken.exp || !signupToken.id || !signupToken.sub) {
          throw Error("Invalid registration session");
        }

        const me = await req.session.loaders.user.load(signupToken.sub);
        if (!me) {
          throw new Error("Invalid registration session");
        }

        const refreshToken = await req.session.loaders.refreshTokenFromAccessToken.load(
          signupToken.id
        );

        if (!refreshToken) {
          throw Error("Invalid session");
        }

        if (refreshToken.expiresAt < new Date()) {
          throw Error("Expired session");
        }

        reply.setCookie("session", signupTokenString, {
          path: "/",
          signed: true,
          expires: refreshToken.expiresAt,
        });

        reply.redirect("/signup/options");
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.message === "Expired session") {
            reply.redirect("/signup/expired");
          }
        } else {
          reply.redirect("/TODO: 404");
        }
      }
    }
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
      expiresAt: new Date(Date.now() + SIGNUP_REFRESH_TOKEN_VALIDITY_PERIOD),
    });

    if (!refreshToken) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    // const userUpdated = await update("User", req.session, {
    //   passwordEncrypted,
    //   passwordSalt,
    //   authMethod: AuthMethod.Email,
    // });

    reply.clearCookie("signupSession", {
      // path: "/",
      domain: WEBSITE_DOMAIN,
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });
  });
};
