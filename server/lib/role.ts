import { FastifyAuthFunction } from "@fastify/auth";
import { AuthMethod, Role } from "@prisma/client";

export const verifyAuthenticated: FastifyAuthFunction = (request, reply, done) => {
  const me = request.session.me;
  if (!me) {
    return reply.redirect("/login");
  }

  done();
};

export const verifyAdmin: FastifyAuthFunction = (request, reply, done) => {
  const me = request.session.me;
  if (!me) {
    return reply.redirect("/login");
  }

  if (me.authMethod === AuthMethod.Pending) {
    return Error("TODO: Should this redirect to the signup page?");
  }

  done();
};

export const verifyOwner: FastifyAuthFunction = (request, reply, done) => {
  const me = request.session.me;
  if (!me) {
    return reply.redirect("/login");
  }
  if (me.role !== Role.Owner) {
    return reply.redirect("/login");
  }

  if (me.authMethod === AuthMethod.Pending) {
    return Error("TODO: Should this redirect to the signup page?");
  }

  done();
};

export const verifyPending: FastifyAuthFunction = (request, reply, done) => {
  const me = request.session.me;
  if (!me) {
    return reply.redirect("/login");
  }

  if (me.authMethod !== AuthMethod.Pending) {
    return Error("TODO: Should 404 or redirect to the dashboard?");
  }

  // const signupToken = request.session.signupToken;
  // if (!signupToken) {
  //   return Error("TODO: Should 404?");
  // }

  done();
};
