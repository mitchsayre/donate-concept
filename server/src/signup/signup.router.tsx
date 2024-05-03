import { FastifyInstance } from "fastify";
import { Signup } from "./signup.view";
import { SignupRequest, SignupSchema } from "./signup.service";
import { SignupOptions } from "./signup-options.view";

export const SignupRouter = async (app: FastifyInstance) => {
  app.get("/signup/options", async () => {
    return <SignupOptions />;
  });

  app.get("/signup", async () => {
    return <Signup />;
  });

  app.post("/signup", async (req, reply) => {
    const body = req.body as SignupRequest;
    const result = SignupSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten();
      return <Signup body={body} errors={errors} />;
    }
  });
};
