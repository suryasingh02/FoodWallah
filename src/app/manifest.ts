import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bharat Burger",
    short_name: "Bharat Burger",
    description: "Seasonal comfort food, ready when you are.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#19352d",
    orientation: "portrait-primary",
    categories: ["food", "lifestyle", "shopping"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}