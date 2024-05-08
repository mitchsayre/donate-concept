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
import { fastifySession } from "@fastify/session";
import { fastifyCookie } from "@fastify/cookie";
import { createLoaders } from "./loaders";
import { fastifyAuth, FastifyAuthFunction } from "@fastify/auth";
import { verifyAdmin, verifyOwner } from "./role";
// import { JwtExpiredError } from "aws-jwt-verify/error";
import { decrypt, encrypt } from "./secrets";
import { SignupRouter } from "../src/signup/signup.router";
import { User } from "@prisma/client";
import { SessionToken } from "./auth";
import { randomUUID } from "crypto";
import { update } from "./database";

const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;
const WEBSITE_DOMAIN = process.env.WEBSITE_DOMAIN!;
const ACCESS_TOKEN_VALIDITY_PERIOD = parseInt(process.env.ACCESS_TOKEN_VALIDITY_PERIOD!);

declare module "fastify" {
  interface Session {
    me: User;
    loaders: ReturnType<typeof createLoaders>;
  }

  interface FastifyInstance {
    verifyAdmin: FastifyAuthFunction;
    verifyOwner: FastifyAuthFunction;
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

  .register(fastifyCookie)
  .register(fastifySession, { secret: "a secret with minimum length of 32 characters" })
  .addHook("preHandler", async (request, reply) => {
    request.session.loaders = createLoaders();

    if (request.cookies.session) {
      try {
        const sessionRaw = request.cookies.session;
        const sessionString = decrypt(sessionRaw, SESSION_ENCRYPTION_KEY);
        const session: SessionToken = JSON.parse(sessionString);

        const me = await request.session.loaders.user.load(session.sub);
        if (!me) {
          throw Error("Invalid session");
        }

        if (session.exp < Date.now()) {
          const refreshToken = await request.session.loaders.refreshTokenFromAccessToken.load(
            session.id
          );

          if (!refreshToken) {
            throw Error("Invalid session");
          }

          if (refreshToken.expiresAt < Date.now()) {
            throw Error("Invalid session");
          }

          const newAccessTokenId = randomUUID();
          const newSessionToken: SessionToken = {
            id: newAccessTokenId,
            sub: me.id,
            exp: Date.now() + ACCESS_TOKEN_VALIDITY_PERIOD,
          };
          const newSessionTokenString = JSON.stringify(newSessionToken);
          const newSessionTokenEncrypted = encrypt(newSessionTokenString, SESSION_ENCRYPTION_KEY);

          const refreshTokenUpdated = await update("RefreshToken", request.session, {
            accessTokenId: newAccessTokenId,
          });

          if (!refreshTokenUpdated) {
            throw Error("Invalid session");
          }

          reply.setCookie("session", newSessionTokenEncrypted, {
            path: "/",
            domain: WEBSITE_DOMAIN,
            secure: true,
            httpOnly: true,
            sameSite: "strict",
          });
        }
      } catch (error) {
        reply.clearCookie("session", {
          path: "/",
          httpOnly: true,
        });

        reply.redirect("/login");
      }
    }
    // let accessToken = "";
    // let me: User | null = null;
    // const decodedAccessTokenResult = await cognitoDecodeAccessToken(accessToken);
    // if (decodedAccessTokenResult instanceof JwtExpiredError) {
    //   if (decodedAccessTokenResult.rawJwt?.payload.sub) {
    //     me = await request.session.loaders.userFromCognitoSub.load(
    //       decodedAccessTokenResult.rawJwt.payload.sub
    //     );
    //     if (me) {
    //       if (!me.refreshTokenEncrypted) {
    //         throw new Error(
    //           "TODO: handle if the current user does not have a refresh token in the database."
    //         );
    //       }
    //       const refreshToken = decrypt(me.refreshTokenEncrypted, DB_ENCRYPTION_KEY);
    //       accessToken = await cognitoRefreshAccessToken(refreshToken);
    //     }
    //   }
    // } else {
    //   me = await request.session.loaders.userFromCognitoSub.load(decodedAccessTokenResult.sub);
    // }
    // if (me) {
    //   request.session.me = me;
    // }
  })

  .decorate("verifyAdmin", verifyAdmin)
  .decorate("verifyOwner", verifyOwner)
  .register(fastifyAuth)

  .register(router)
  .register(LoginRouter)
  .register(SignupRouter);

export default () => app;
