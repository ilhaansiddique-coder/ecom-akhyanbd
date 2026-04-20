import type { Metadata } from "next";
import BlogClient from "./BlogClient";

export const metadata: Metadata = {
  title: "Blog",
  description: "Read latest posts, tips and updates.",
};

export default function BlogPage() {
  return <BlogClient />;
}
