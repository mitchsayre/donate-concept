import { FastifyInstance } from "fastify";
import { Login } from "./login.view";
import { LoginRequest, LoginSchema } from "./login.service";

export const LoginRouter = async (app: FastifyInstance) => {
  app.get("/login", async () => {
    return <Login />;
  });

  app.post("/login", async (req) => {
    const body = req.body as LoginRequest;
    const result = LoginSchema.safeParse(body);
    if (!result.success) {
      console.log("result", result.error);
      const errors = result.error.flatten();
      console.log("errors", errors);
      const error = errors.fieldErrors.email;
      return <Login body={body} errors={errors} />;
    } else return <Login body={result.data} />;
    // result.data.email.
  });
};
