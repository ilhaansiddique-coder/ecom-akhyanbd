import { FiFileText } from "react-icons/fi";

export const metadata = {
  title: "শর্তাবলী",
  description: "আমাদের ওয়েবসাইট ও সেবা ব্যবহারের শর্তাবলী সম্পর্কে জানুন।",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-linear-to-br from-primary via-primary-light to-primary-dark py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <FiFileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">শর্তাবলী</h1>
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
                আমাদের ওয়েবসাইট ও সেবা ব্যবহার করার আগে অনুগ্রহ করে এই শর্তাবলী
                মনোযোগ দিয়ে পড়ুন। আমাদের ওয়েবসাইট ব্যবহার করার মাধ্যমে আপনি এই শর্তগুলিতে
                সম্মত হচ্ছেন বলে বিবেচিত হবে। আপনি যদি এই শর্তগুলির সাথে একমত না হন তাহলে
                অনুগ্রহ করে আমাদের সেবা ব্যবহার থেকে বিরত থাকুন।
              </p>
            </div>

            <div className="space-y-10">
              {/* Section 1 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">১</span>
                  সাধারণ শর্তাবলী
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    আমাদের সকল পণ্য ও সেবা ব্যবহারের ক্ষেত্রে নিম্নলিখিত
                    সাধারণ শর্তাবলী প্রযোজ্য:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "আমাদের ওয়েবসাইট ব্যবহারকারীর বয়স কমপক্ষে ১৮ বছর হতে হবে।",
                      "আপনি সঠিক ও সত্য তথ্য প্রদান করতে বাধ্য।",
                      "অ্যাকাউন্টের নিরাপত্তা রক্ষা করা ব্যবহারকারীর দায়িত্ব।",
                      "আমাদের ওয়েবসাইটের কোনো অংশ অনুমতি ছাড়া কপি বা ব্যবহার করা নিষিদ্ধ।",
                      "আমরা যেকোনো সময় শর্তাবলী পরিবর্তন করার অধিকার রাখি।",
                      "আমাদের সেবা কেবল বাংলাদেশের মধ্যে প্রযোজ্য।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">২</span>
                  অর্ডার ও পেমেন্ট
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>পণ্য অর্ডার ও পেমেন্টের ক্ষেত্রে নিম্নলিখিত শর্তগুলি মেনে চলতে হবে:</p>
                  <ul className="space-y-2">
                    {[
                      "অর্ডার সম্পন্ন হওয়ার পর একটি নিশ্চিতকরণ বার্তা পাঠানো হবে।",
                      "পণ্যের মূল্য পরিবর্তনের ক্ষেত্রে আমরা আগে থেকে জানাব।",
                      "পেমেন্ট সফলভাবে সম্পন্ন না হলে অর্ডার প্রক্রিয়া করা হবে না।",
                      "ক্যাশ অন ডেলিভারি, বিকাশ, নগদ ও কার্ডের মাধ্যমে পেমেন্ট গ্রহণযোগ্য।",
                      "পণ্যের স্টক শেষ হলে বিকল্প প্রস্তাব করা হবে বা অর্ডার বাতিল করা হবে।",
                      "প্রমোশনাল অফার সীমিত সময় ও পরিমাণের জন্য প্রযোজ্য।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৩</span>
                  ডেলিভারি নীতি
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>পণ্য ডেলিভারির ক্ষেত্রে নিম্নলিখিত নিয়মগুলি প্রযোজ্য:</p>
                  <ul className="space-y-2">
                    {[
                      "সারা বাংলাদেশে সাধারণত ৩–৫ কার্যদিবসের মধ্যে ডেলিভারি দেওয়া হয়।",
                      "নাটোর ও আশেপাশের জেলায় ১–২ কার্যদিবসের মধ্যে ডেলিভারি সম্ভব।",
                      "ডেলিভারি চার্জ অর্ডারের পরিমাণ ও অবস্থান অনুযায়ী নির্ধারিত হয়।",
                      "নির্দিষ্ট পরিমাণের বেশি অর্ডারে বিনামূল্যে ডেলিভারি পাওয়া যেতে পারে।",
                      "ডেলিভারিতে বিলম্বের জন্য আমরা আগে থেকে অবহিত করব।",
                      "অনুপস্থিত থাকলে পুনরায় ডেলিভারির ব্যবস্থা করা হবে।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৪</span>
                  রিটার্ন ও রিফান্ড
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    গ্রাহক সন্তুষ্টি আমাদের প্রধান লক্ষ্য। তাই আমরা একটি সহজ রিটার্ন ও
                    রিফান্ড নীতি অনুসরণ করি:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "পণ্য পাওয়ার ৭ দিনের মধ্যে রিটার্নের আবেদন করতে হবে।",
                      "ত্রুটিপূর্ণ বা ক্ষতিগ্রস্ত পণ্য বিনামূল্যে প্রতিস্থাপন করা হবে।",
                      "মূল প্যাকেজিংসহ পণ্য ফেরত দিতে হবে।",
                      "ব্যক্তিগত কারণে রিটার্নের ক্ষেত্রে ডেলিভারি চার্জ কাটা যাবে।",
                      "রিফান্ড ৭–১০ কার্যদিবসের মধ্যে সম্পন্ন হবে।",
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
                  পণ্যের গুণগত মান
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>আমরা সর্বোচ্চ মানের পণ্য সরবরাহ নিশ্চিত করতে প্রতিশ্রুতিবদ্ধ:</p>
                  <ul className="space-y-2">
                    {[
                      "সকল পোশাক যাচাইকৃত ও বিশ্বস্ত উৎস থেকে সংগ্রহ করা হয়।",
                      "প্রতিটি পোশাকে ব্যবহৃত কাপড়ের ধরন ও সাইজ স্পষ্টভাবে উল্লেখ থাকে।",
                      "শিশুদের সংবেদনশীল ত্বকের জন্য সম্পূর্ণ নিরাপদ ও ত্বক-বান্ধব কাপড় ব্যবহার করা হয়।",
                      "প্রতিটি পণ্যের ফ্যাব্রিক ও কেয়ার সম্পর্কে সঠিক তথ্য প্রদান করা হয়।",
                      "কোনো ক্ষতিকর রং বা রাসায়নিক ব্যবহার করা হয় না।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৬</span>
                  দায়বদ্ধতা
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>আমাদের দায়বদ্ধতার সীমা নিম্নলিখিতভাবে নির্ধারিত:</p>
                  <ul className="space-y-2">
                    {[
                      "আমাদের পণ্য চিকিৎসার বিকল্প নয়; গুরুতর স্বাস্থ্য সমস্যায় ডাক্তারের পরামর্শ নিন।",
                      "ব্যক্তিগত অ্যালার্জি বা প্রতিক্রিয়ার জন্য আমরা দায়ী নই।",
                      "ইন্টারনেট সংযোগ বা প্রযুক্তিগত সমস্যার কারণে সেবায় বিঘ্নের জন্য ক্ষমাপ্রার্থী।",
                      "তৃতীয় পক্ষের কার্যক্রমের জন্য আমরা দায়ী নই।",
                      "আমাদের সর্বোচ্চ দায় পণ্যের ক্রয়মূল্যের মধ্যে সীমাবদ্ধ।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2 list-none">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="bg-background-alt border border-border rounded-xl p-4 mt-4">
                    <p className="font-semibold text-foreground mb-1">আরও তথ্যের জন্য যোগাযোগ করুন:</p>
                    <p>বিস্তারিত যোগাযোগের তথ্যের জন্য আমাদের যোগাযোগ পেজ দেখুন।</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
