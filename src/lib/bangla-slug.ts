const dictionary: Record<string, string> = {
  // Weights & Measures
  "কেজি": "kg",
  "গ্রাম": "gram",
  "লিটার": "liter",
  "মিলি": "ml",
  "হাফ": "half",
  "আধা": "half",
  "পূর্ণ": "full",

  // Numbers
  "১": "1", "২": "2", "৩": "3", "৪": "4", "৫": "5",
  "৬": "6", "৭": "7", "৮": "8", "৯": "9", "০": "0",
  "১০০": "100", "২০০": "200", "৩০০": "300", "৪০০": "400",
  "৫০০": "500", "৬০০": "600", "৭০০": "700", "৮০০": "800",
  "৯০০": "900", "১০০০": "1000",

  // Product Types
  "গুঁড়ো": "powder", "গুড়া": "powder", "গুঁড়া": "powder",
  "পাউডার": "powder", "চা": "tea", "তেল": "oil", "মধু": "honey",
  "রস": "juice", "ক্যাপসুল": "capsule", "ট্যাবলেট": "tablet",
  "সিরাপ": "syrup", "ক্রিম": "cream", "সাবান": "soap",
  "শ্যাম্পু": "shampoo", "প্যাক": "pack", "মিক্স": "mix",
  "কম্বো": "combo", "সেট": "set", "বক্স": "box",

  // States / Processing
  "কাঁচা": "raw", "শুকনো": "dried", "শুকনা": "dried",
  "ভাজা": "roasted", "গুঁড়ো করা": "powdered", "জৈব": "organic",
  "প্রাকৃতিক": "natural", "খাঁটি": "pure", "বিশুদ্ধ": "pure",
  "তাজা": "fresh", "স্প্রে": "spray", "ড্রাইড": "dried",

  // Herbs & Ingredients
  "সজনে": "moringa", "সজিনা": "moringa", "মরিঙ্গা": "moringa",
  "নিম": "neem", "তুলসী": "tulsi", "তুলসি": "tulsi",
  "অর্জুন": "arjun", "অশ্বগন্ধা": "ashwagandha",
  "হলুদ": "turmeric", "আদা": "ginger", "রসুন": "garlic",
  "মেথি": "fenugreek", "মেথির": "fenugreek",
  "কালোজিরা": "black-seed", "কালিজিরা": "black-seed",
  "জিরা": "cumin", "ধনিয়া": "coriander", "দারুচিনি": "cinnamon",
  "এলাচ": "cardamom", "এলাচি": "cardamom", "লবঙ্গ": "clove",
  "গোলমরিচ": "black-pepper", "মরিচ": "pepper",
  "তেজপাতা": "bay-leaf", "পুদিনা": "mint", "বাসক": "basak",
  "আমলকী": "amla", "আমলা": "amla", "হরীতকী": "haritaki",
  "বহেরা": "bahera", "ত্রিফলা": "triphala", "শতমূলী": "shatamuli",
  "চিয়া": "chia", "সীড": "seed", "বীজ": "seed",
  "রোজেলা": "rosella", "বিটরুট": "beetroot", "পঞ্চভূত": "panchbhut",
  "মেহেদী": "mehedi", "মেহেদি": "mehedi", "জবা": "hibiscus",
  "ইসবগুল": "isabgol", "তোকমা": "basil-seed", "কিসমিস": "raisin",
  "বাদাম": "almond", "কাজু": "cashew", "পেস্তা": "pistachio",
  "আখরোট": "walnut", "খেজুর": "dates", "ডুমুর": "fig",
  "জলপাই": "olive", "নারকেল": "coconut", "তিল": "sesame",
  "তিসি": "flaxseed", "সরিষা": "mustard", "জাফরান": "saffron",
  "স্টিভিয়া": "stevia", "অ্যালোভেরা": "aloe-vera",
  "থানকুনি": "thankuni", "পাতা": "leaf",

  // Body & Health
  "হার্ট": "heart", "হৃদয়": "heart", "কেয়ার": "care", "যত্ন": "care",
  "চুল": "hair", "চুলের": "hair", "ত্বক": "skin", "ত্বকের": "skin",
  "স্বাস্থ্য": "health", "শরীর": "body", "রক্ত": "blood",
  "রক্তচাপ": "blood-pressure", "ডায়াবেটিস": "diabetes",
  "ওজন": "weight", "হজম": "digestion", "রোগ": "disease",
  "ব্যথা": "pain", "জ্বর": "fever", "কাশি": "cough",
  "সর্দি": "cold", "এলার্জি": "allergy", "ইমিউনিটি": "immunity",
  "প্রতিরোধ": "immunity",

  // Common Adjectives
  "বিশেষ": "special", "প্রিমিয়াম": "premium", "এক্সট্রা": "extra",
  "সুপার": "super", "গোল্ড": "gold", "রেগুলার": "regular",
  "মিনি": "mini", "বড়": "large", "ছোট": "small",
  "ভেষজ": "herbal", "আয়ুর্বেদিক": "ayurvedic",

  // Actions / Descriptions
  "রেমেডি": "remedy", "সমাধান": "remedy", "যাদু": "magic",
  "শক্তি": "energy", "বুস্ট": "boost", "উপাদান": "ingredients",
  "মিশ্রণ": "mix", "ফর্মুলা": "formula", "পণ্য": "product",
  "অফার": "offer", "প্যাকেজ": "package",
};

const digitMap: Record<string, string> = {
  "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
  "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
};

// Basic Bangla → Roman transliteration for unknown words
const translitMap: Record<string, string> = {
  "অ": "o", "আ": "a", "ই": "i", "ঈ": "ee", "উ": "u", "ঊ": "oo",
  "ঋ": "ri", "এ": "e", "ঐ": "oi", "ও": "o", "ঔ": "ou",
  "ক": "k", "খ": "kh", "গ": "g", "ঘ": "gh", "ঙ": "ng",
  "চ": "ch", "ছ": "chh", "জ": "j", "ঝ": "jh", "ঞ": "n",
  "ট": "t", "ঠ": "th", "ড": "d", "ঢ": "dh", "ণ": "n",
  "ত": "t", "থ": "th", "দ": "d", "ধ": "dh", "ন": "n",
  "প": "p", "ফ": "f", "ব": "b", "ভ": "bh", "ম": "m",
  "য": "z", "র": "r", "ল": "l", "শ": "sh", "ষ": "sh", "স": "s",
  "হ": "h", "ড়": "r", "ঢ়": "rh", "য়": "y", "ৎ": "t",
  "ং": "ng", "ঃ": "h", "ঁ": "n",
  "া": "a", "ি": "i", "ী": "ee", "ু": "u", "ূ": "oo",
  "ৃ": "ri", "ে": "e", "ৈ": "oi", "ো": "o", "ৌ": "ou",
  "্": "", "়": "",
};

function transliterate(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    // Try two-char combo first (e.g. ড়, ঢ়, য়)
    const twoChar = text.substring(i, i + 2);
    if (translitMap[twoChar] !== undefined) {
      result += translitMap[twoChar];
      i++;
      continue;
    }
    const ch = text[i];
    if (translitMap[ch] !== undefined) {
      result += translitMap[ch];
    } else if (/[a-zA-Z0-9]/.test(ch)) {
      result += ch.toLowerCase();
    } else if (ch === " " || ch === "-") {
      result += "-";
    }
    // skip unknown chars
  }
  return result.replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isAscii(text: string): boolean {
  return /^[\x00-\x7F]*$/.test(text);
}

export function makeBanglaSlug(text: string): string {
  text = text.trim();
  if (!text) return "";

  // If already ASCII, just slugify
  if (isAscii(text)) return slugify(text);

  // Replace multi-word phrases first (longest key first)
  const phrases = Object.entries(dictionary)
    .filter(([k]) => k.includes(" "))
    .sort(([a], [b]) => b.length - a.length);

  for (const [bn, en] of phrases) {
    text = text.replaceAll(bn, ` ${en} `);
  }

  // Split into tokens
  const tokens = text.split(/[\s\-/_,।]+/).filter(Boolean);
  const translated: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    // Already English?
    if (/^[a-zA-Z0-9-]+$/.test(trimmed)) {
      translated.push(trimmed.toLowerCase());
      continue;
    }

    // Dictionary lookup
    if (dictionary[trimmed]) {
      translated.push(dictionary[trimmed]);
      continue;
    }

    // Try removing common suffixes
    const stripped = trimmed.replace(/(র|ের|এর|তে|তা|য়|ে)$/, "");
    if (stripped && dictionary[stripped]) {
      translated.push(dictionary[stripped]);
      continue;
    }

    // Bangla digit conversion
    const converted = trimmed.replace(/[০-৯]/g, (d) => digitMap[d] || d);
    if (/^[0-9]+$/.test(converted)) {
      translated.push(converted);
      continue;
    }

    // Fallback: transliterate Bangla to Roman
    const translit = transliterate(trimmed);
    if (translit) {
      translated.push(translit);
    } else {
      const fallback = slugify(trimmed);
      if (fallback) translated.push(fallback);
    }
  }

  let slug = translated.filter(Boolean).join("-");
  slug = slug.replace(/-{2,}/g, "-").replace(/^-|-$/g, "");

  // Ensure uniqueness with timestamp if slug is too generic
  if (!slug || slug === "item") {
    slug = `product-${Date.now()}`;
  }

  return slug;
}
