"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FiClock, FiUser, FiArrowRight, FiFileText } from "react-icons/fi";
import { useLang } from "@/lib/LanguageContext";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  image: string | null;
  author_name: string;
  created_at: string;
}

export default function BlogClient() {
  const { lang } = useLang();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBlogPosts()
      .then((res) => {
        setPosts(res.data || res);
      })
      .finally(() => setLoading(false));
  }, []);

  const en = lang === "en";

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <section className="min-h-[70vh] flex items-center justify-center bg-background-alt px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiFileText className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">{en ? "Blog" : "ব্লগ"}</h1>
          <p className="text-text-muted mb-8">
            {en
              ? "Our blog is coming soon. Expect great content on kids fashion, style tips and parenting guides."
              : "আমাদের ব্লগ শীঘ্রই আসছে। শিশু ফ্যাশন, স্টাইল টিপস ও প্যারেন্টিং গাইড নিয়ে দারুণ সব লেখা থাকছে।"}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background-alt min-h-[70vh]">
      <div className="container mx-auto px-4">
        <header className="max-w-2xl mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {en ? "Latest from Blog" : "ব্লগ থেকে সর্বশেষ"}
          </h1>
          <p className="text-text-muted">
            {en 
              ? "Expert tips on childcare, natural health, and lifestyle." 
              : "শিশু যত্ন, প্রাকৃতিক স্বাস্থ্য এবং জীবনধারা সম্পর্কে বিশেষজ্ঞ টিপস।"}
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white rounded-2xl border border-border overflow-hidden hover:shadow-xl transition-all"
            >
              <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/9] overflow-hidden bg-gray-100">
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-muted">
                    <FiFileText className="w-12 h-12 opacity-20" />
                  </div>
                )}
              </Link>

              <div className="p-6">
                <div className="flex items-center gap-4 text-xs text-text-muted mb-4">
                  <div className="flex items-center gap-1">
                    <FiClock className="w-3 h-3" />
                    <span suppressHydrationWarning>{en ? new Date(post.created_at).toLocaleDateString() : toBn(new Date(post.created_at).toLocaleDateString())}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiUser className="w-3 h-3" />
                    <span>{post.author_name}</span>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors line-clamp-2">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                
                <p className="text-text-body text-sm line-clamp-3 mb-6">
                  {post.excerpt}
                </p>

                <Link 
                  href={`/blog/${post.slug}`}
                  className="inline-flex items-center gap-2 text-primary font-bold text-sm hover:gap-3 transition-all"
                >
                  {en ? "Read More" : "আরও পড়ুন"}
                  <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
