const tags = [
  { emoji: "🌿", label: "ভেষজ গুঁড়ো", cls: "absolute -top-4 right-8", duration: "3s", delay: "0s" },
  { emoji: "🍵", label: "ভেষজ চা", cls: "absolute -bottom-4 left-4", duration: "3.5s", delay: "0.5s" },
  { emoji: "❤️", label: "হার্ট কেয়ার", cls: "absolute top-1/2 -left-8", duration: "4s", delay: "1s" },
];

export default function HeroFloatingTags() {
  return (
    <>
      {tags.map((tag) => (
        <div
          key={tag.label}
          className={`${tag.cls} bg-white rounded-2xl shadow-xl p-3 flex items-center gap-2`}
          style={{ animation: `float-y ${tag.duration} ease-in-out ${tag.delay} infinite` }}
        >
          <span className="text-2xl">{tag.emoji}</span>
          <p className="text-xs font-bold text-foreground">{tag.label}</p>
        </div>
      ))}
    </>
  );
}
