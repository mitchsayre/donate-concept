import { jsFile } from "../lib/assets";
import { Layout } from "./Layout";
import { ServerTime } from "./components/ServerTime";
import { PageProps } from "../types";

export const IndexPage = ({ title }: PageProps) => (
  <Layout title={title}>
    <img src="/assets/images/google.svg" alt="" />
    <div>
      <a href="/listing/new">Add Contact</a>
      <a href="/login">Login</a>
    </div>
    <h1 class="text-3xl font-bold underline">Hello world!</h1>

    {/* <p>
      <strong>Browser time: </strong>
      <span id="currentTime">…</span>
    </p> */}
    {/* <p hx-ext="current-time" data-target="#currentTime">
      <ServerTime />
    </p> */}
    {/* <form action="/" hx-get="/api/server-time" hx-target="previous p" hx-trigger="submit,every 30s">
      <button class="button primary" type="submit">
        Update server time
      </button>
    </form> */}
    {/* <script src="/a/vendor/htmx.min.js"></script> */}
    {/* <script type="module" src={jsFile}></script> */}
  </Layout>
);
