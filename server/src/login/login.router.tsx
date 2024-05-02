import { FastifyInstance } from "fastify";
import { Login } from "./login.view";
import { LoginRequest, LoginSchema } from "./login.service";
import {
  cognitoLogin,
  StatePassthroughType,
  googleFetchCredentialsFromOAuthCode,
  microsoftFetchCredentialsFromOAuthCode,
  AuthCredentials,
} from "../../auth";
import { decrypt } from "../../secrets";

const OAUTH_RESPONSE_ROUTE = process.env.OAUTH_RESPONSE_ROUTE!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;

type oauthQueryResponse = {
  code: string;
  state: string;
};

export const LoginRouter = async (app: FastifyInstance) => {
  app.get(`/${OAUTH_RESPONSE_ROUTE}`, async (req, reply) => {
    const query = req.query as oauthQueryResponse;
    if (!query.code || !query.state) {
      return <Login />;
    }

    let state = decodeURIComponent(query.state);
    state = decrypt(state, SESSION_ENCRYPTION_KEY);

    const stateParsed = JSON.parse(state) as StatePassthroughType;

    let authCredentials: AuthCredentials;
    if (stateParsed.identityProvider === "Google") {
      authCredentials = await googleFetchCredentialsFromOAuthCode(query.code);
    } else if (stateParsed.identityProvider === "Microsoft") {
      authCredentials = await microsoftFetchCredentialsFromOAuthCode(query.code);
    } else {
      throw Error("Invalid identity provider");
    }

    const email = authCredentials.email;
    const user = await req.session.loaders.userFromEmail.load(email);

    if (!user) {
      throw Error("User not found");
    }

    return reply.redirect("/dashboard");
  });

  app.get("/login", async () => {
    return <Login />;
  });

  app.post("/login", async (req, reply) => {
    const body = req.body as LoginRequest;
    const result = LoginSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      return <Login body={body} errors={errors} />;
    }

    const user = await req.session.loaders.userFromEmail.load(body.email);
    if (user) {
      await cognitoLogin(user.cognitoSub, body.password);
    }

    return reply.redirect("/dashboard");
  });
};
