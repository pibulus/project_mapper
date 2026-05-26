import forms from "@tailwindcss/forms";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#ff6b9d",
        secondary: "#c8a9e9",
        accent: "#ffd93d",
      },
    },
  },
  plugins: [forms, typography],
};
