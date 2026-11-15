"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    $?: JQueryStatic;
    jQuery?: JQueryStatic;
  }
}

export default function JQuerySetup() {
  useEffect(() => {
    // jQuery needs a browser document, so load it after hydration.
    import("jquery")
      .then(({ default: jquery }) => {
        window.$ = window.jQuery = jquery;
      })
      .catch((error: unknown) => {
        console.error("Could not initialize jQuery.", error);
      });
  }, []);

  return null;
}
