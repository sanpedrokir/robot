import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Neo the Robot",
    short_name: "Neo",
    description: "Neo, your friendly desktop AI robot assistant.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f5",
    theme_color: "#0284c7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
