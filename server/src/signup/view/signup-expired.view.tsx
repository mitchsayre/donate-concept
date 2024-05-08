import { userBuildAuthUrl } from "../../../lib/auth";
import { Layout } from "../../../views/Layout";
import { InputError } from "../../components/InputError";
import { typeToFlattenedError } from "zod";
import { LegalLinks } from "../../components/LegalLinks";

export const SignupExpired = () => {
  const organizationName = "[Organization Name]";

  return (
    <Layout title={`Join ${organizationName}`}>
      <div class="flex min-h-screen flex-col justify-center px-6 pt-12 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Welcome to {organizationName}.
          </h2>
          <h4 class="mt-2 text-center text-xl leading-9 tracking-tight text-gray-700">
            Your invite link has expired. Please contact the person who invited you to issue a fresh
            invitation.
          </h4>
        </div>

        <div class="flex flex-grow items-end mb-3">
          <LegalLinks />
        </div>
      </div>
    </Layout>
  );
};
