import { error } from "console";
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

addEventListener("htmx:load", (_e) => {
  document.querySelectorAll("[data-input]").forEach((el) => {
    el.addEventListener("focus", () => {
      el.classList.remove("input-error");
      const sibling = el.nextElementSibling;
      if (sibling) {
        const errorMessage = sibling.querySelector("[data-input-error-message]");
        errorMessage?.remove();
      }
    });
  });

  const passwordInput: HTMLInputElement | null = document.querySelector(
    "[data-validate-password-input]"
  );

  function updatePasswordValidation() {
    const validatePasswordIcon = document.querySelector("[data-validate-password-icon]");
    const validatePasswordMessage = document.querySelector("[data-validate-password-message]");
    const passwordLength = passwordInput!.value.length;

    if (passwordLength >= 12) {
      validatePasswordMessage?.classList.remove("validate-password-text");
      validatePasswordMessage?.classList.add("validate-password-text-success");
      validatePasswordIcon?.classList.remove("hidden");
    } else {
      validatePasswordMessage?.classList.remove("validate-password-text-success");
      validatePasswordMessage?.classList.add("validate-password-text");
      validatePasswordIcon?.classList.add("hidden");
    }
  }

  if (passwordInput) {
    updatePasswordValidation();

    passwordInput.addEventListener("input", function () {
      updatePasswordValidation();
    });
  }

  document.querySelectorAll("[data-input]").forEach((el) => {
    el.addEventListener("focus", () => {
      el.classList.remove("input-error");
      const sibling = el.nextElementSibling;
      if (sibling) {
        const errorMessage = sibling.querySelector("[data-input-error-message]");
        errorMessage?.remove();
      }
    });
  });
});
