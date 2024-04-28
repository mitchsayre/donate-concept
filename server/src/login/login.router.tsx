import { FastifyInstance } from "fastify";
import { Login } from "./login.view";
import { LoginRequest, LoginSchema } from "./login.service";
import { cognitoLogin, googleFetchEmailFromResponseCode } from "../../auth";
import { decrypt } from "../../secrets";

const OAUTH_RESPONSE_ROUTE = process.env.OAUTH_RESPONSE_ROUTE!;
const SESSION_ENCRYPTION_KEY = process.env.SESSION_ENCRYPTION_KEY!;

type GoogleOAuthQueryResponse = {
  error?: string;
  code?: string;
  scope?: string;
  state?: string;
};

export const LoginRouter = async (app: FastifyInstance) => {
  app.get(`/${OAUTH_RESPONSE_ROUTE}`, async (req) => {
    const query = req.query as GoogleOAuthQueryResponse;
    if (query.error) {
      return <Login />;
    }

    if (query.state && query.code) {
      let state = decodeURIComponent(query.state);
      state = decrypt(state, SESSION_ENCRYPTION_KEY);

      state = JSON.parse(state);
      const email = await googleFetchEmailFromResponseCode(query.code);
      if (email) {
        const user = await req.session.loaders.userFromEmail.load(email);
      }
      return <Login />;
    }
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
