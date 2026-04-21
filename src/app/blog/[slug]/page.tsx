import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FiClock, FiUser, FiArrowLeft, FiFileText } from "react-icons/fi";
import { api } from "@/lib/api";
import { toBn } from "@/utils/toBn";
import { TText } from "@/components/ProductDetailClient";

// Since we're using a dynamic slug from the API, we'll fetch it on the server
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await api.getBlogPost(slug);
    if (!post) return { title: "Post Not Found" };
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: post.image ? [post.image] : [],
      }
    };
  } catch {
    return { title: "Blog" };
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post;
  
  try {
    post = await api.getBlogPost(slug);
  } catch {
    return notFound();
  }

  if (!post) return notFound();

  return (
    <section className="py-12 bg-white min-h-[70vh]">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-text-muted hover:text-primary transition-colors mb-8">
          <FiArrowLeft className="w-4 h-4" />
          <TText en="Back to Blog" bn="ব্লগে ফিরুন" />
        </Link>

        {post.image && (
          <div className="relative aspect-[21/9] rounded-2xl overflow-hidden mb-10 shadow-lg">
            <img 
              src={post.image} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-6 text-sm text-text-muted mb-6">
          <div className="flex items-center gap-2">
            <FiClock className="w-4 h-4 text-primary" />
            <span suppressHydrationWarning>{new Date(post.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <FiUser className="w-4 h-4 text-primary" />
            <span>{post.author_name}</span>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-8 leading-tight">
          {post.title}
        </h1>

        <div 
          className="prose prose-lg max-w-none text-text-body leading-relaxed whitespace-pre-line"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <FiUser className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-text-muted">লিখেছেন</p>
                <p className="font-bold text-foreground">{post.author_name}</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted">শেয়ার করুন:</span>
              {/* Simple share buttons could go here */}
              <button className="p-2 bg-background-alt hover:bg-primary/10 rounded-lg transition-colors text-primary font-bold">FB</button>
              <button className="p-2 bg-background-alt hover:bg-primary/10 rounded-lg transition-colors text-primary font-bold">WA</button>
           </div>
        </div>
      </div>
    </section>
  );
}
