import ColorPalette from "@/components/ColorPalette";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Palette | Akhiyan Ecom",
  description: "Visual guide to all colors used in the Akhiyan Ecom project",
};

export default function ColorPalettePage() {
  return <ColorPalette />;
}
