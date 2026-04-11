import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Admin User ───
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@mavesoj.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@mavesoj.com",
      password: hashedPassword,
      role: "admin",
      phone: "01700000000",
    },
  });
  console.log("✅ Admin user:", admin.email);

  // ─── Categories ───
  const categories = [
    { name: "ভেষজ গুঁড়ো", slug: "herbal-powder", description: "বিভিন্ন ধরনের ভেষজ গুঁড়ো" },
    { name: "মধু ও তেল", slug: "honey-oil", description: "খাঁটি মধু ও বিভিন্ন ভেষজ তেল" },
    { name: "চা ও পানীয়", slug: "tea-drinks", description: "ভেষজ চা ও স্বাস্থ্যকর পানীয়" },
    { name: "ত্বক ও চুলের যত্ন", slug: "skin-hair-care", description: "প্রাকৃতিক ত্বক ও চুলের যত্ন পণ্য" },
    { name: "মসলা ও বীজ", slug: "spices-seeds", description: "জৈব মসলা ও বিভিন্ন বীজ" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true, sortOrder: 0 },
    });
  }
  console.log("✅ Categories created:", categories.length);

  // ─── Brands ───
  const brands = [
    { name: "মা ভেষজ", slug: "ma-bheshoj" },
    { name: "প্রকৃতি", slug: "prokriti" },
    { name: "সজীব", slug: "sojib" },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: { ...brand, isActive: true },
    });
  }
  console.log("✅ Brands created:", brands.length);

  // ─── Products ───
  const allCategories = await prisma.category.findMany();
  const allBrands = await prisma.brand.findMany();
  const catMap = Object.fromEntries(allCategories.map((c) => [c.slug, c.id]));
  const brandMap = Object.fromEntries(allBrands.map((b) => [b.slug, b.id]));

  const products = [
    {
      name: "অশ্বগন্ধা পাউডার",
      slug: "ashwagandha-powder",
      categoryId: catMap["herbal-powder"],
      brandId: brandMap["ma-bheshoj"],
      description: "খাঁটি অশ্বগন্ধা গুঁড়ো। স্বাস্থ্য ভালো রাখতে প্রতিদিন খান।",
      price: 350,
      originalPrice: 500,
      image: "/uploads/placeholder.jpg",
      stock: 100,
      isActive: true,
      isFeatured: true,
      badge: "জনপ্রিয়",
      weight: "100g",
    },
    {
      name: "খাঁটি সুন্দরবনের মধু",
      slug: "pure-sundarban-honey",
      categoryId: catMap["honey-oil"],
      brandId: brandMap["prokriti"],
      description: "সুন্দরবনের খাঁটি মধু। কোনো মিশ্রণ নেই।",
      price: 750,
      originalPrice: 900,
      image: "/uploads/placeholder.jpg",
      stock: 50,
      isActive: true,
      isFeatured: true,
      badge: "বেস্টসেলার",
      weight: "500g",
    },
    {
      name: "তুলসী পাতা চা",
      slug: "tulsi-leaf-tea",
      categoryId: catMap["tea-drinks"],
      brandId: brandMap["sojib"],
      description: "প্রাকৃতিক তুলসী পাতার চা। রোগ প্রতিরোধ ক্ষমতা বাড়ায়।",
      price: 200,
      image: "/uploads/placeholder.jpg",
      stock: 200,
      isActive: true,
      isFeatured: false,
      weight: "50g",
    },
    {
      name: "নিম তেল",
      slug: "neem-oil",
      categoryId: catMap["skin-hair-care"],
      brandId: brandMap["ma-bheshoj"],
      description: "খাঁটি নিম তেল। ত্বক ও চুলের জন্য উপকারী।",
      price: 280,
      image: "/uploads/placeholder.jpg",
      stock: 75,
      isActive: true,
      isFeatured: false,
      weight: "100ml",
    },
    {
      name: "কালোজিরা বীজ",
      slug: "black-seed",
      categoryId: catMap["spices-seeds"],
      brandId: brandMap["prokriti"],
      description: "খাঁটি কালোজিরা বীজ। সর্দি-কাশি ও রোগ প্রতিরোধে কার্যকর।",
      price: 180,
      image: "/uploads/placeholder.jpg",
      stock: 150,
      isActive: true,
      isFeatured: true,
      weight: "200g",
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }
  console.log("✅ Products created:", products.length);

  // ─── Site Settings ───
  const settings = [
    { key: "site_name", value: "মা ভেষজ বাণিজ্যালয়", group: "general" },
    { key: "site_description", value: "প্রাকৃতিক ও ভেষজ পণ্যের অনলাইন শপ", group: "general" },
    { key: "contact_email", value: "info@mavesoj.com", group: "contact" },
    { key: "contact_phone", value: "01700000000", group: "contact" },
    { key: "facebook_url", value: "https://facebook.com/mavesoj", group: "social" },
  ];

  for (const s of settings) {
    await prisma.siteSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Site settings created");

  // ─── Shipping Zones ───
  const zones = [
    { name: "ঢাকা", cities: JSON.stringify(["dhaka", "ঢাকা"]), rate: 60, estimatedDays: "1-2 দিন" },
    { name: "চট্টগ্রাম", cities: JSON.stringify(["chittagong", "চট্টগ্রাম", "chattogram"]), rate: 100, estimatedDays: "2-3 দিন" },
    { name: "অন্যান্য", cities: JSON.stringify(["other"]), rate: 120, estimatedDays: "3-5 দিন" },
  ];

  for (let i = 0; i < zones.length; i++) {
    await prisma.shippingZone.upsert({
      where: { id: i + 1 },
      update: {},
      create: { ...zones[i], isActive: true },
    });
  }
  console.log("✅ Shipping zones created");

  // ─── Banners ───
  await prisma.banner.upsert({
    where: { id: 1 },
    update: {},
    create: {
      title: "প্রাকৃতিক ভেষজ পণ্য",
      subtitle: "১০০% খাঁটি ও জৈব",
      description: "সরাসরি প্রকৃতি থেকে আপনার দোরগোড়ায়",
      buttonText: "এখনই কিনুন",
      buttonUrl: "/shop",
      position: "hero",
      isActive: true,
      sortOrder: 0,
    },
  });
  console.log("✅ Banner created");

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
