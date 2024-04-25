import { nowToISOString, updateElementContent } from "./lib/tools.js";
// import { ClientSchema } from "../prisma/generated/zod/modelSchema/ClientSchema.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const htmx = (window as any).htmx;

if (htmx !== undefined) {
  htmx.defineExtension("current-time", {
    onEvent: (name: string, evt: Event) => {
      const el = evt.target as HTMLElement;
      if (name === "htmx:afterSwap" || name === "htmx:afterProcessNode") {
        if (el && el.dataset) {
          updateElementContent(el.dataset.target!, nowToISOString());
        }
      }
    },
  });
}

console.log("This code runs on the client side");

// const form = document.getElementById("clientForm");
// if (form) {
//   console.log(form);
//   form.addEventListener("submit", function (event) {
//     event.preventDefault();
//     console.log(event);
//   });
// }
