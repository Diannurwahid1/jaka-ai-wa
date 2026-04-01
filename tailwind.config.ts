import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f4efe7",
        ink: "#1d2433",
        accent: {
          DEFAULT: "#127369",
          soft: "#daf3ed"
        },
        sand: "#fffaf2",
        slate: {
          950: "#17202f"
        }
      },
      boxShadow: {
        panel: "0 20px 50px rgba(23, 32, 47, 0.08)"
      },
      borderRadius: {
        "4xl": "2rem"
      },
      backgroundImage: {
        glow:
          "radial-gradient(circle at top left, rgba(18, 115, 105, 0.22), transparent 38%), radial-gradient(circle at top right, rgba(255, 186, 73, 0.18), transparent 26%)"
      }
    }
  },
  plugins: []
};

export default config;
