import { FiShield } from "react-icons/fi";

export const metadata = {
  title: "গোপনীয়তা নীতি",
  description: "আমাদের গোপনীয়তা নীতি সম্পর্কে জানুন।",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-linear-to-br from-primary via-primary-light to-primary-dark py-14 md:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/15 rounded-2xl mb-4">
            <FiShield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">গোপনীয়তা নীতি</h1>
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
                আমরা আপনার গোপনীয়তাকে সর্বোচ্চ গুরুত্ব দিই। এই গোপনীয়তা নীতিটি
                আমাদের ওয়েবসাইট ব্যবহার করার সময় আমরা কীভাবে আপনার তথ্য সংগ্রহ, ব্যবহার এবং
                সুরক্ষিত রাখি তা বর্ণনা করে। আমাদের সেবা ব্যবহার করার মাধ্যমে আপনি এই নীতিতে
                সম্মত হচ্ছেন বলে বিবেচিত হবে।
              </p>
            </div>

            <div className="space-y-10">
              {/* Section 1 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">১</span>
                  তথ্য সংগ্রহ
                </h2>
                <div className="pl-11 space-y-3 text-text-body leading-relaxed">
                  <p>
                    আমরা আমাদের পরিষেবা প্রদান করার জন্য নিম্নলিখিত তথ্য সংগ্রহ করতে পারি:
                  </p>
                  <ul className="space-y-2 list-none">
                    {[
                      "ব্যক্তিগত তথ্য: নাম, ইমেইল ঠিকানা, ফোন নম্বর, ডেলিভারি ঠিকানা।",
                      "অর্ডার তথ্য: আপনি যে পণ্য কিনেছেন, পেমেন্টের তথ্য (নিরাপদভাবে প্রক্রিয়াকৃত)।",
                      "ব্রাউজিং তথ্য: আপনি কোন পণ্য দেখেছেন, কত সময় ব্যয় করেছেন।",
                      "ডিভাইস তথ্য: ব্রাউজারের ধরন, IP ঠিকানা, অপারেটিং সিস্টেম।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    আমরা কেবলমাত্র সেই তথ্যই সংগ্রহ করি যা আমাদের সেবা প্রদানের জন্য প্রয়োজনীয়।
                    আপনার সংবেদনশীল ব্যক্তিগত তথ্য আমরা কখনো তৃতীয় পক্ষের কাছে বিক্রি করি না।
                  </p>
                </div>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">২</span>
                  তথ্যের ব্যবহার
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>আমরা সংগৃহীত তথ্য নিম্নলিখিত উদ্দেশ্যে ব্যবহার করি:</p>
                  <ul className="space-y-2">
                    {[
                      "আপনার অর্ডার প্রক্রিয়া করা এবং ডেলিভারি নিশ্চিত করা।",
                      "গ্রাহক সেবা প্রদান ও সমস্যা সমাধান করা।",
                      "নতুন পণ্য, অফার ও আপডেট সম্পর্কে আপনাকে জানানো (শুধুমাত্র আপনার সম্মতিতে)।",
                      "আমাদের ওয়েবসাইট ও সেবার মান উন্নত করা।",
                      "প্রযোজ্য আইন ও বিধিমালা মেনে চলা।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
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
                  তথ্যের নিরাপত্তা
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    আপনার তথ্যের নিরাপত্তা আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ। আমরা শিল্প-মানের
                    নিরাপত্তা ব্যবস্থা ব্যবহার করি, যার মধ্যে রয়েছে:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "SSL/TLS এনক্রিপশন প্রযুক্তির মাধ্যমে আপনার তথ্য সুরক্ষিত রাখা।",
                      "পেমেন্ট তথ্য সরাসরি আমাদের সার্ভারে সংরক্ষিত হয় না।",
                      "নিয়মিত নিরাপত্তা অডিট ও আপডেট পরিচালনা।",
                      "কর্মীদের তথ্য সুরক্ষা বিষয়ে প্রশিক্ষণ প্রদান।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    তবে ইন্টারনেটের মাধ্যমে ডেটা ট্রান্সমিশন সম্পূর্ণ নিরাপদ করা সম্ভব নয় এবং
                    আমরা সম্পূর্ণ নিরাপত্তার নিশ্চয়তা দিতে পারি না।
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৪</span>
                  কুকি নীতি
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    আমাদের ওয়েবসাইট কুকি ব্যবহার করে। কুকি হলো ছোট টেক্সট ফাইল যা আপনার
                    ব্রাউজারে সংরক্ষিত হয়। আমরা নিম্নলিখিত ধরনের কুকি ব্যবহার করি:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "প্রয়োজনীয় কুকি: ওয়েবসাইটের মূল কার্যকারিতার জন্য অপরিহার্য।",
                      "পারফরম্যান্স কুকি: ওয়েবসাইটের ব্যবহার বিশ্লেষণের জন্য।",
                      "ফাংশনালিটি কুকি: আপনার পছন্দ ও সেটিংস মনে রাখার জন্য।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    আপনি আপনার ব্রাউজার সেটিংস পরিবর্তন করে কুকি নিষ্ক্রিয় করতে পারেন, তবে
                    এতে ওয়েবসাইটের কিছু কার্যকারিতা সীমিত হতে পারে।
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৫</span>
                  তৃতীয় পক্ষ
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    আমরা নির্দিষ্ট পরিষেবা প্রদানের জন্য বিশ্বস্ত তৃতীয় পক্ষের সাথে কাজ করি।
                    এই তৃতীয় পক্ষগুলি শুধুমাত্র তাদের নির্ধারিত কাজের জন্য আপনার তথ্য ব্যবহার
                    করতে পারে:
                  </p>
                  <ul className="space-y-2">
                    {[
                      "পেমেন্ট গেটওয়ে: নিরাপদ পেমেন্ট প্রক্রিয়াকরণের জন্য।",
                      "ডেলিভারি সার্ভিস: পণ্য পৌঁছে দেওয়ার জন্য।",
                      "অ্যানালিটিক্স সার্ভিস: ওয়েবসাইটের ব্যবহার বিশ্লেষণের জন্য।",
                      "কাস্টমার সাপোর্ট টুলস: আপনাকে সহায়তা করার জন্য।",
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p>
                    আমরা আপনার তথ্য কখনো বিজ্ঞাপনদাতা বা অন্য কোনো তৃতীয় পক্ষের কাছে
                    বিক্রি বা ভাড়া দিই না।
                  </p>
                </div>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <span className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">৬</span>
                  যোগাযোগ
                </h2>
                <div className="pl-11 space-y-3 text-text-body text-sm leading-relaxed">
                  <p>
                    গোপনীয়তা সংক্রান্ত যেকোনো প্রশ্ন বা উদ্বেগের জন্য আমাদের সাথে যোগাযোগ করুন:
                  </p>
                  <div className="bg-background-alt border border-border rounded-xl p-4 space-y-1.5">
                    <p>বিস্তারিত যোগাযোগের তথ্যের জন্য আমাদের যোগাযোগ পেজ দেখুন।</p>
                  </div>
                  <p>
                    এই গোপনীয়তা নীতি যেকোনো সময় পরিবর্তন করা হতে পারে। গুরুত্বপূর্ণ পরিবর্তনের
                    ক্ষেত্রে আমরা আপনাকে ইমেইলের মাধ্যমে অবহিত করব।
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
