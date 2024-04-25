import { JSX } from "preact";
import { cssFile, jsFile } from "../lib/assets";
import { PageProps } from "../types";

interface LayoutProps extends PageProps {
  children: string | JSX.Element[] | JSX.Element;
}

export const Layout = ({ title, children }: LayoutProps) => (
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>{title} - Donate Concept</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="Yet another starter kit" />
      <link rel="stylesheet" href={cssFile} />
      <script src="/a/vendor/htmx.min.js"></script>
    </head>
    <body class="container" hx-boost="true">
      {/* <h1 class="text-3xl font-bold underline">Hello world!</h1> */}
      {/* <h1>Welcome to yet another starter kit!</h1> */}
      <main class="row">{children}</main>
    </body>
    <script type="module" src={jsFile}></script>
  </html>
);
