import { FastifyAuthFunction } from "@fastify/auth";
import { Role } from "@prisma/client";

export const verifyAdmin: FastifyAuthFunction = (request, reply, done) => {
  if (!request.session.me) {
    reply.redirect("/login");
    done();
  }
  if (request.session.me.role !== Role.Admin) {
    reply.send("TODO: render a 403 page");
    done();
  }
  done();
};

export const verifyOwner: FastifyAuthFunction = (request, reply, done) => {
  if (!request.session.me) {
    return reply.redirect("/login");
  }
  if (request.session.me.role !== Role.Owner) {
    reply.send("TODO: render a 403 page");
    done();
  }
  done();
};
