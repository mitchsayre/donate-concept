import Fastify from "fastify";
import helmet from "@fastify/helmet";
import staticServe from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import fastifyFavicon from "fastify-favicon";
import path from "path";
import router from "./router";
import { ASSETS_MOUNT_POINT, ASSETS_PATH } from "./constants.js";
import { PinoLoggerOptions } from "fastify/types/logger";
import { NodeEnv } from "../types";
import jsxRenderer from "./jsxRenderer";
import { LoginRouter } from "../src/login/login.router";
import { fastifyCookie } from "@fastify/cookie";
import { createLoaders } from "./loaders";
import { fastifyAuth, FastifyAuthFunction } from "@fastify/auth";
import { verifyAdmin, verifyAuthenticated, verifyOwner, verifyPending } from "./role";
// import { JwtExpiredError } from "aws-jwt-verify/error";
import { decrypt, encrypt } from "./secrets";
import { SignupRouter } from "../src/signup/signup.router";
import { User } from "@prisma/client";
import { randomUUID } from "crypto";
import { update } from "./database";

const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN!;
const ACCESS_TOKEN_VALIDITY_PERIOD = parseInt(process.env.ACCESS_TOKEN_VALIDITY_PERIOD!);
const REFRESH_TOKEN_VALIDITY_PERIOD = parseInt(process.env.REFRESH_TOKEN_VALIDITY_PERIOD!);
const STAGE = process.env.STAGE!;
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN!;

export type SessionToken = {
  sub: string; // User's id
  exp: number; // Expiration unix timestamp
  id: string; // Access token id
};

// export type SignupToken = {
//   sub: string; // User's id
//   exp: number; // Expiration unix timestamp
//   mode: "Signup";
// };

export type Session = {
  me?: User;
  loaders: ReturnType<typeof createLoaders>;
};

declare module "fastify" {
  interface FastifyRequest {
    session: Session;
  }
  // interface Session {
  //   me: User | null;
  //   loaders: ReturnType<typeof createLoaders>;
  //   token: SessionToken | null;
  //   // signupToken: SignupToken | null;
  // }

  interface FastifyInstance {
    verifyAuthenticated: FastifyAuthFunction;
    verifyAdmin: FastifyAuthFunction;
    verifyOwner: FastifyAuthFunction;
    verifyPending: FastifyAuthFunction;
  }
}

const envToLogger: Record<NodeEnv, PinoLoggerOptions | boolean> = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        ignore: "pid,res,req.remoteAddress,req.remotePort,req.hostname",
      },
    },
  },
  production: true,
};

const app = Fastify({
  logger: envToLogger[(process.env.NODE_ENV as NodeEnv) || "development"] ?? true,
});

app
  .register(fastifyFavicon, {
    path: "./assets",
    name: "favicon.ico",
    maxAge: 3600,
  })
  .register(fastifyFormbody)
  .register(jsxRenderer)
  .register(helmet, {
    contentSecurityPolicy: {
      // If you get stuck in CSP, try this: crossOriginEmbedderPolicy: false,
      directives: {
        "script-src": ["'self'", "'unsafe-inline'"],
      },
    },
  })

  .register(staticServe, {
    root: path.join(__dirname, ASSETS_PATH),
    prefix: `/${ASSETS_MOUNT_POINT}`,
  })

  .register(fastifyCookie, {
    hook: "preHandler",
    secret: {
      sign: (value) => {
        return encrypt(value, SESSION_ENCRYPTION_KEY);
      },
      unsign: (value) => {
        let valueDecrypted;
        let valid = false;
        try {
          valueDecrypted = decrypt(value, SESSION_ENCRYPTION_KEY);
          valid = true;
        } catch (error) {
          valueDecrypted = null;
        }
        return {
          valid: valid,
          renew: false,
          value: valueDecrypted,
        };
      },
    },
    // secret: {
    //   sign: (value) => {
    //     return encrypt(value, SESSION_ENCRYPTION_KEY);
    //   },
    //   unsign: (value) => {
    //     return {
    //       valid: true,
    //       renew: false,
    //       value: decrypt(value, SESSION_ENCRYPTION_KEY),
    //     };
    //   },
    // },
    // secret: SESSION_ENCRYPTION_KEY,
    // algorithm: "aes-256-cbc",
    parseOptions: {
      domain: COOKIE_DOMAIN,
      httpOnly: true,
      sameSite: "strict",
      secure: STAGE === "local" ? false : true,
    },
  })
  // .register(fastifySession, { secret: SESSION_ENCRYPTION_KEY })
  // .addHook("onSend", (request, reply, payload, done) => {
  //   const err = null;
  //   // const newPayload = payload.replace('some-text', 'some-new-text')
  //   // done(err, newPayload)
  // })
  .addHook("preHandler", async (request, reply) => {
    // request.temp = "temp";
    // request.session.loaders = createLoaders();
    console.log("");

    // if (request.cookies.signupSession) {
    //   try {
    //     const sessionRaw = request.cookies.signupSession;
    //     const sessionString = decrypt(sessionRaw, SESSION_ENCRYPTION_KEY);
    //     const sessionParsed = JSON.parse(sessionString);

    //     const session: SignupToken = sessionParsed;
    //     const me = await request.session.loaders.user.load(session.sub);
    //     if (!me) {
    //       throw new Error("Invalid registration session");
    //     }

    //     request.session.me = me;
    //     if (session.exp < Date.now()) {
    //       // reply.redirect("/signup/expired");
    //     }

    //     // reply.redirect("/signup/options");
    //   } catch (error) {
    //     // reply.redirect("/dashboard");
    //     // throw Error("TODO: handle either a 404 or a redirect");
    //   }
    // } else if (request.cookies.session) {
    //   try {
    //     const sessionRaw = request.cookies.session;
    //     const sessionString = decrypt(sessionRaw, SESSION_ENCRYPTION_KEY);
    //     const sessionParsed = JSON.parse(sessionString);

    //     const session: SessionToken = sessionParsed;

    //     const me = await request.session.loaders.user.load(session.sub);
    //     if (!me) {
    //       throw Error("Invalid session");
    //     }

    //     request.session.me = me;
    //     request.session.token = session;

    //     if (session.exp < Date.now()) {
    //       const refreshToken = await request.session.loaders.refreshTokenFromAccessToken.load(
    //         session.id
    //       );

    //       if (!refreshToken) {
    //         throw Error("Invalid session");
    //       }

    //       if (refreshToken.expiresAt < Date.now()) {
    //         throw Error("Invalid session");
    //       }

    //       const newAccessTokenId = randomUUID();
    //       const newSessionToken: SessionToken = {
    //         id: newAccessTokenId,
    //         sub: me.id,
    //         exp: Date.now() + ACCESS_TOKEN_VALIDITY_PERIOD,
    //       };
    //       const newSessionTokenString = JSON.stringify(newSessionToken);
    //       const newSessionTokenEncrypted = encrypt(newSessionTokenString, SESSION_ENCRYPTION_KEY);
    //       const refreshTokenUpdated = await update("RefreshToken", request.session, {
    //         accessTokenId: newAccessTokenId,
    //       });

    //       if (!refreshTokenUpdated) {
    //         throw Error("Invalid session");
    //       }

    //       request.session.token = newSessionToken;

    //       reply.setCookie("session", newSessionTokenEncrypted, {
    //         // path: "/",
    //         domain: WEBSITE_DOMAIN,
    //         secure: true,
    //         httpOnly: true,
    //         sameSite: "strict",
    //       });
    //     }
    //   } catch (error) {
    //     reply.clearCookie("session", {
    //       // path: "/",
    //       domain: WEBSITE_DOMAIN,
    //       httpOnly: true,
    //       secure: true,
    //       sameSite: "strict",
    //     });

    //     request.session.me = null;
    //     request.session.token = null;

    //     // reply.redirect("/login");
    //   }
    // } else if (request.routeOptions.url === "/signup") {
    //   try {
    //     const queryParams = request.query as any;
    //     if (!queryParams.token) {
    //       return Error("Invalid registration session");
    //     }

    //     const signupTokenString = decrypt(queryParams.token, SESSION_ENCRYPTION_KEY);
    //     const signupToken: SignupToken = JSON.parse(signupTokenString);

    //     const me = await request.session.loaders.user.load(signupToken.sub);
    //     if (!me) {
    //       throw new Error("Invalid registration session");
    //     }

    //     request.session.me = me;
    //     if (signupToken.exp < Date.now()) {
    //       // reply.redirect("/signup/expired");
    //     }

    //     const signupTokenEncrypted = encrypt(signupTokenString, SESSION_ENCRYPTION_KEY);
    //     reply.setCookie("signupSession", signupTokenEncrypted, {
    //       // path: "/",
    //       domain: WEBSITE_DOMAIN,
    //       secure: true,
    //       httpOnly: true,
    //       sameSite: "strict",
    //     });

    //     // reply.redirect("/signup/options");
    //   } catch (error) {
    //     // reply.redirect("/dashboard");
    //     // throw Error("TODO: handle either a 404 or a redirect");
    //   }
    // }
  })
  .addHook("onResponse", (request, reply, done) => {
    // Some code
    done();
  })
  // .addHook("onRequest", (request, reply) => {
  //   reply.setCookie("bar", "bar", {
  //     path: "/",
  //     signed: true,
  //   });
  // })

  .decorate("verifyAuthenticated", verifyAuthenticated)
  .decorate("verifyAdmin", verifyAdmin)
  .decorate("verifyOwner", verifyOwner)
  .decorate("verifyPending", verifyPending)
  .register(fastifyAuth)

  .register(router)
  .register(LoginRouter)
  .register(SignupRouter);

export default () => app;
