import { FastifyInstance } from "fastify";
import { IndexPage } from "../views/IndexPage";
import { NotFoundPage } from "../views/NotFoundPage";
import { ErrorPage } from "../views/ErrorPage";
import { ServerTime } from "../views/components/ServerTime";
import { ListingEdit } from "../views/components/ListingEdit";
// import { FastifyInstance } from "fastify";
import { Login } from "../src/login/login.view";
import { LoginRequest, LoginSchema } from "../src/login/login.service";

/**
 * Encapsulates the routes
 * @param {FastifyInstance} fastify  Encapsulated Fastify Instance
 * @param {Object} options plugin options, refer to https://www.fastify.dev/docs/latest/Reference/Plugins/#plugin-options
 */
const router = async (app: FastifyInstance) => {
  app.get("/", async () => {
    return <IndexPage title="Home" />;
  });

  // // Renders the server time partial upon HTMX request
  // app.get("/api/server-time", async () => {
  //   return <ServerTime />;
  // });

  // Renders the server time partial upon HTMX request
  app.get("/listing/new", async () => {
    return <ListingEdit />;
  });

  app.setNotFoundHandler(() => {
    return <NotFoundPage title="Page not found" />;
  });

  app.setErrorHandler((err, req) => {
    app.log.error(err);
    // Fastify will lowercase the header name
    if (req.headers["hx-request"]) {
      // If the request is a HTMX request, we send the error message as
      // a normal partial response.
      return <ServerTime error="An unexpected error occurred" />;
    } else {
      return <ErrorPage title="Unhandled error" error={err} />;
    }
  });
};

export default router;
