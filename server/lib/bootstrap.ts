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

declare module "fastify" {
  interface Session {
    me: User;
    loaders: ReturnType<typeof createLoaders>;
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
    // TODO: infer userId from session token
    const currentUserId = "";

    request.session.loaders = createLoaders();
    const me = await request.session.loaders.user.load(currentUserId);
    if (me) {
      request.session.me = me;
    }
    // next();
  })

  .register(router)
  .register(LoginRouter);

export default () => app;
