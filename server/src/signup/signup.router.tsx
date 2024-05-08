import { FastifyInstance } from "fastify";
import { Signup } from "./view/signup.view";
import { SignupToken, SignupRequest, SignupSchema, createSignupTokenPair } from "./signup.util";
import { SignupOptions } from "./view/signup-options.view";
import { decrypt, encrypt, generateSalt } from "../../lib/secrets";
import { AuthMethod, Role, User } from "@prisma/client";
import { create, db, update } from "../../lib/database";
import { randomUUID } from "crypto";
import { sendSignupEmail } from "../../lib/email";
import { SignupExpired } from "./view/signup-expired.view";

const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN!;

export const SignupRouter = async (app: FastifyInstance) => {
  app.get("/register", async (req, reply) => {
    const queryParams = req.query as any;
    if (!queryParams.state) {
      return Error("TODO: handle either a 404 or a redirect");
    }

    try {
      const signupTokenString = decrypt(queryParams.state, SESSION_ENCRYPTION_KEY);
      const signupToken: SignupToken = JSON.parse(signupTokenString);

      const user = req.session.loaders.user.load(signupToken.sub);
      if (!user) {
        throw new Error("User not found");
      }

      reply.setCookie("session", signupTokenString, {
        path: "/",
        domain: WEBSITE_DOMAIN,
        secure: true,
        httpOnly: true,
        sameSite: "strict",
      });

      if (signupToken.exp < Date.now()) {
        reply.redirect("/signup/expired");
      }

      reply.redirect("/signup/options");
    } catch (error) {
      return Error("TODO: handle either a 404 or a redirect");
    }
  });

  app.get("/signup/expired", async () => {
    return <SignupExpired />;
  });

  app.get("/signup/options", async () => {
    return <SignupOptions />;
  });

  app.get("/signup", async () => {
    return <Signup />;
  });

  app.post("/signup", async (req, reply) => {
    await sendSignupEmail();

    const body = req.body as SignupRequest;
    const result = SignupSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      return <Signup body={body} errors={errors} />;
    }

    const user = await req.session.loaders.user.load(accessToken.sub);

    if (!user) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    if (user.id !== accessToken.sub) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    const passwordSalt = generateSalt();
    const passwordSalted = `${passwordSalt}${body.password}`;
    const passwordEncrypted = encrypt(passwordSalted, DB_ENCRYPTION_KEY);

    const refreshToken = create("RefreshToken", req.session, {
      userId: user.id,
      accessTokenId: randomUUID(),
      expiresAt: 1,
    });

    if (!refreshToken) {
      return <Signup body={body} pageError={"The information provided could not be validated."} />;
    }

    const userUpdated = await update("User", req.session, {
      passwordEncrypted,
      passwordSalt,
      authMethod: AuthMethod.Email,
    });

    // const refreshToken = req.session.loaders.refreshTokenFromAccessToken()
    // const refreshToken = create("RefreshToken", req.session, {
    //   userId: user.id,
    //   accessTokenId: randomUUID(),
    //   // passwordEncrypted: null,
    //   // refreshTokenEncrypted: null,
    //   // authMethod: AuthMethod.Pending,
    //   // organizationId: null,
    // });

    // var token = encrypt({ foo: "bar" }, SESSION_ENCRYPTION_KEY);
    // console.log(token);

    // const user = await create("User", req.session, {
    //   email: body.email,
    //   passwordEncrypted: passwordEncrypted,
    //   refreshTokenEncrypted: null,
    //   role: Role.Admin,
    // });
  });
};
