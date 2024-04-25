import { FastifyInstance } from "fastify";
import { Login } from "./login.view";
import { LoginRequest, LoginSchema } from "./login.service";
import { getCognitoUser } from "../../auth";

export const LoginRouter = async (app: FastifyInstance) => {
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
      const username = ""; // TODO
      const user = await getCognitoUser(username, body.password);
      console.log(user);

      return <Login body={result.data} />;
    }
  });
};
