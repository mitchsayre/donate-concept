import { userBuildAuthUrl } from "../../lib/auth";
import { Layout } from "../../views/Layout";
import { InputError } from "../components/InputError";
import { LoginRequest } from "./login.util";
import { typeToFlattenedError } from "zod";
import { LegalLinks } from "../components/LegalLinks";

export interface LoginProps {
  body?: LoginRequest;
  errors?: typeToFlattenedError<LoginRequest, string>;
}

export const Login = ({ body, errors }: LoginProps) => {
  const googleAuthUrl = userBuildAuthUrl("Google");
  const microsoftAuthUrl = userBuildAuthUrl("Microsoft");

  return (
    <Layout title="Login">
      <div class="flex min-h-screen flex-col justify-center px-6 pt-12 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 class="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>

        <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
          <form novalidate={true} class="space-y-4" action="/login" method="post" hx-boost="true">
            <div>
              <label for="email" class="input-label">
                Email address
              </label>
              <div class="mt-2">
                <input
                  data-input
                  value={body?.email}
                  id="email"
                  name="email"
                  autocomplete="email"
                  class={`input-text ${errors?.fieldErrors.email ? "input-error" : ""}`}
                />
                <InputError errors={errors?.fieldErrors.email} />
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between">
                <label for="password" class="input-label">
                  Password
                </label>
                <div class="text-sm">
                  <a href="#" class="font-semibold text-PRIMARY hover:text-PRIMARY_HOVER">
                    Forgot password?
                  </a>
                </div>
              </div>
              <div class="mt-2">
                <input
                  data-input
                  value={body?.password}
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="current-password"
                  class={`input-text ${errors?.fieldErrors.password ? "input-error" : ""}`}
                />
                <InputError errors={errors?.fieldErrors.password} />
              </div>
            </div>

            <div>
              <button type="submit" class="button-primary w-full">
                Sign in
              </button>
            </div>
          </form>

          <div class="text-center my-6">
            <div class="flex items-center justify-center">
              <div class="flex-grow border-t border-gray-300"></div>
              <span class="flex-shrink mx-4 text-gray-900 sm:text-sm">Or continue with</span>
              <div class="flex-grow border-t border-gray-300"></div>
            </div>

            <div class="flex justify-center mt-6">
              <a href={googleAuthUrl} class="flex w-1/2 pe-2">
                <button class="justify-center flex flex-grow items-center bg-white text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    width="24"
                    viewBox="0 0 24 24"
                    class="mr-1"
                  >
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                    <path d="M1 1h22v22H1z" fill="none" />
                  </svg>
                  Google
                </button>
              </a>
              <a disabled href={microsoftAuthUrl} class="flex w-1/2 ps-2">
                <button class="justify-center flex flex-grow items-center bg-white text-gray-700 font-semibold py-2 px-4 border border-gray-300 rounded shadow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    height="24"
                    width="24"
                    viewBox="0 0 24 24"
                    class="mr-1"
                  >
                    <path fill="#f3f3f3" d="M0 0h23v23H0z" />
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Microsoft
                </button>
              </a>
            </div>
          </div>
        </div>
        <div class="flex flex-grow items-end mb-3">
          <LegalLinks />
        </div>
      </div>
    </Layout>
  );
};
