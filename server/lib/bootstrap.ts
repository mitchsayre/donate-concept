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
import { User } from "../../prisma/generated/kysely";
import { createLoaders } from "./loaders";
import { fastifyAuth, FastifyAuthFunction } from "@fastify/auth";
import { verifyAdmin, verifyOwner } from "../role";
import { cognitoDecodeAccessToken, cognitoRefreshAccessToken } from "../auth";
import { JwtExpiredError } from "aws-jwt-verify/error";
import { decrypt } from "../secrets";

const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;
const DB_ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY!;

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

    let accessToken = "";
    let me: User | null = null;
    const decodedAccessTokenResult = await cognitoDecodeAccessToken(accessToken);
    if (decodedAccessTokenResult instanceof JwtExpiredError) {
      if (decodedAccessTokenResult.rawJwt?.payload.sub) {
        me = await request.session.loaders.userFromCognitoSub.load(
          decodedAccessTokenResult.rawJwt.payload.sub
        );
        if (me) {
          if (!me.refreshTokenEncrypted) {
            throw new Error(
              "TODO: handle if the current user does not have a refresh token in the database."
            );
          }
          const refreshToken = decrypt(me.refreshTokenEncrypted, DB_ENCRYPTION_KEY);
          accessToken = await cognitoRefreshAccessToken(refreshToken);
        }
      }
    } else {
      me = await request.session.loaders.userFromCognitoSub.load(decodedAccessTokenResult.sub);
    }

    if (me) {
      request.session.me = me;
    }
  })

  .decorate("verifyAdmin", verifyAdmin)
  .decorate("verifyOwner", verifyOwner)
  .register(fastifyAuth)

  .register(router)
  .register(LoginRouter);

export default () => app;
