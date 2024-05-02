import { FastifyInstance } from "fastify";
import { IndexPage } from "../views/IndexPage";
import { NotFoundPage } from "../views/NotFoundPage";
import { ErrorPage } from "../views/ErrorPage";
import { ServerTime } from "../views/components/ServerTime";
import { ListingEdit } from "../views/components/ListingEdit";

const router = async (app: FastifyInstance) => {
  app.get("/", { preHandler: app.auth([app.verifyOwner]) }, async () => {
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

  app.get("/dashboard", async () => {
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
