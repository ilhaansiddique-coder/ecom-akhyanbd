import { FiRefreshCw } from "react-icons/fi";

export const metadata = {
  title: "রিফান্ড পলিসি",
  description: "আমাদের রিফান্ড ও রিটার্ন নীতি সম্পর্কে জানুন।",
};

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-linear-to-br from-primary via-primary-light to-primary-dark py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <FiRefreshCw className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">রিফান্ড পলিসি</h1>
          <p className="text-white/75 text-base max-w-lg mx-auto">
            সর্বশেষ আপডেট: ১ জানুয়ারি ২০২৫
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5 mb-10">
              <p className="text-text-body text-sm leading-relaxed">
                আমরা আপনার সন্তুষ্টিকে সর্বোচ্চ অগ্রাধিকার দেই। আমাদের রিফান্ড
                পলিসি সম্পূর্ণ স্বচ্ছ ও সহজ। আপনি যদি কোনো কারণে আমাদের পণ্যে সন্তুষ্ট না হন,
                তাহলে নিচের নির্দেশিকা অনুসরণ করে রিফান্ড বা এক্সচেঞ্জের জন্য আবেদন করুন।
              </p>
            </div>

            <div className="space-y-10">
              {/* Section 1 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">১</span>
                  রিফান্ড যোগ্যতা
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>নিম্নলিখিত ক্ষেত্রে আপনি রিফান্ডের জন্য যোগ্য হবেন:</p>
                  <ul className="space-y-2">
                    {[
                      "ভুল পণ্য ডেলিভারি হলে — অর্ডার করা পণ্যের পরিবর্তে অন্য পণ্য পাঠানো হলে।",
                      "পণ্য ক্ষতিগ্রস্ত অবস্থায় পৌঁছালে — ডেলিভারির সময় পণ্য ভাঙা বা নষ্ট হলে।",
                      "মানহীন পণ্য পেলে — পণ্যের মান বর্ণনার সাথে মেলে না এমন হলে।",
                      "মেয়াদ উত্তীর্ণ পণ্য পেলে — প্যাকেটে মেয়াদ থাকলেও পণ্য নষ্ট হলে।",
                      "পণ্য না পেলে — ডেলিভারি সম্পন্ন দেখানো কিন্তু পণ্য না পাওয়া গেলে।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-3">
                    <p className="text-amber-800 text-xs font-medium">
                      দ্রষ্টব্য: পণ্য পাওয়ার ৭ দিনের মধ্যে রিফান্ডের আবেদন করতে হবে। পণ্য
                      অবশ্যই অব্যবহৃত এবং মূল প্যাকেজিংসহ ফেরত দিতে হবে।
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">২</span>
                  রিফান্ড প্রক্রিয়া
                </h2>
                <div className="pl-11 space-y-4 text-text-body text-sm leading-relaxed">
                  <p>রিফান্ডের জন্য নিচের ধাপগুলি অনুসরণ করুন:</p>
                  <div className="space-y-3">
                    {[
                      { step: "ধাপ ১", desc: "আমাদের যোগাযোগ পেজে দেওয়া নম্বরে ফোন করুন অথবা ইমেইল পাঠান।" },
                      { step: "ধাপ ২", desc: "আপনার অর্ডার নম্বর, সমস্যার বিবরণ এবং সমস্যার ছবি (যদি প্রযোজ্য) শেয়ার করুন।" },
                      { step: "ধাপ ৩", desc: "আমরা ২৪ ঘণ্টার মধ্যে আপনার আবেদন পর্যালোচনা করব এবং সিদ্ধান্ত জানাব।" },
                      { step: "ধাপ ৪", desc: "রিফান্ড অনুমোদন হলে পণ্য ফেরত পাঠানোর নির্দেশনা দেওয়া হবে।" },
                      { step: "ধাপ ৫", desc: "পণ্য ফেরত পাওয়ার পর নির্ধারিত সময়ের মধ্যে রিফান্ড প্রক্রিয়া সম্পন্ন হবে।" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 bg-background-alt rounded-xl p-3">
                        <span className="px-2 py-0.5 bg-primary text-white text-xs font-bold rounded-md shrink-0 mt-0.5">
                          {item.step}
                        </span>
                        <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৩</span>
                  রিফান্ডের সময়সীমা
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>রিফান্ড অনুমোদন হওয়ার পর পেমেন্ট মেথড অনুযায়ী সময় লাগবে:</p>
                  <div className="grid gap-3">
                    {[
                      { method: "বিকাশ / নগদ / রকেট", time: "৩–৫ কার্যদিবস" },
                      { method: "ডেবিট / ক্রেডিট কার্ড", time: "৭–১০ কার্যদিবস" },
                      { method: "ব্যাংক ট্রান্সফার", time: "৭–১০ কার্যদিবস" },
                      { method: "ক্যাশ অন ডেলিভারি", time: "৩–৭ কার্যদিবস (বিকাশে)" },
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-background-alt rounded-xl px-4 py-3">
                        <span className="font-medium text-foreground">{item.method}</span>
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold">{item.time}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted mt-2">
                    * ব্যাংক ছুটির দিনগুলি কার্যদিবস হিসেবে গণনা করা হয় না।
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৪</span>
                  এক্সচেঞ্জ নীতি
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    আপনি রিফান্ডের পরিবর্তে পণ্য এক্সচেঞ্জ করতে পারবেন। এক্সচেঞ্জের
                    ক্ষেত্রে নিম্নলিখিত নিয়মগুলি প্রযোজ্য:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "একই মূল্যের পণ্যের সাথে বিনামূল্যে এক্সচেঞ্জ করা যাবে।",
                      "বেশি মূল্যের পণ্যের সাথে এক্সচেঞ্জের ক্ষেত্রে মূল্যের পার্থক্য পরিশোধ করতে হবে।",
                      "কম মূল্যের পণ্যের সাথে এক্সচেঞ্জের ক্ষেত্রে পার্থক্য ফেরত দেওয়া হবে।",
                      "এক্সচেঞ্জের জন্যও পণ্য মূল প্যাকেজিংসহ অব্যবহৃত থাকতে হবে।",
                      "একটি পণ্য সর্বোচ্চ একবার এক্সচেঞ্জ করা যাবে।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৫</span>
                  যোগাযোগ
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>রিফান্ড বা এক্সচেঞ্জ সংক্রান্ত যেকোনো প্রশ্নের জন্য আমাদের যোগাযোগ পেজ দেখুন।</p>
                  <p className="text-xs text-text-muted">
                    আমরা আপনার সমস্যা দ্রুত সমাধান করতে সর্বদা প্রস্তুত। গ্রাহক সন্তুষ্টিই আমাদের
                    সর্বোচ্চ অগ্রাধিকার।
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
