import { FastifyInstance } from "fastify";
import { Login } from "./login.view";
import { LoginRequest, LoginSchema } from "./login.service";
import {
  cognitoLogin,
  cognitoFetchCredentialsFromOAuthResponse,
  StatePassthroughType,
  googleFetchCredentialsFromOAuthResponse,
} from "../../auth";
import { decrypt } from "../../secrets";
import { AuthenticationResultType } from "@aws-sdk/client-cognito-identity-provider";

const OAUTH_RESPONSE_ROUTE = process.env.OAUTH_RESPONSE_ROUTE!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;

type oauthQueryResponse = {
  code: string;
  state: string;
};

export const LoginRouter = async (app: FastifyInstance) => {
  app.get(`/${OAUTH_RESPONSE_ROUTE}`, async (req) => {
    const query = req.query as oauthQueryResponse;
    if (!query.code || !query.state) {
      return <Login />;
    }

    let state = decodeURIComponent(query.state);
    state = decrypt(state, SESSION_ENCRYPTION_KEY);

    const stateParsed = JSON.parse(state) as StatePassthroughType;

    let authCredentials: AuthenticationResultType;
    if (stateParsed.identityProvider === "Google") {
      googleFetchCredentialsFromOAuthResponse(query.code);
    } else if (stateParsed.identityProvider === "Microsoft") {
      // microsoftFetchCredentialsFromOAuthResponse(query.code);
    }
    // const authCredentials = await cognitoFetchCredentialsFromOAuthResponse(query.code);

    // const user = await req.session.loaders.userFromEmail.load(googleCredentials.email);

    return <Login />;
  });

  app.get("/login", async () => {
    return <Login />;
  });

  app.post("/login", async (req) => {
    const body = req.body as LoginRequest;
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      const errors = result.error.flatten();
      return <Login body={body} errors={errors} />;
    } else {
      const user = await req.session.loaders.userFromEmail.load(body.email);
      if (user) {
        await cognitoLogin(user.cognitoSub, body.password);
      }

      // console.log(user);

      return <Login body={result.data} />;
    }
  });
};
