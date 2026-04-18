const DEFAULT_TAGS = [
  { emoji: "👕", label: "টি-শার্ট" },
  { emoji: "👶", label: "রম্পার" },
  { emoji: "👖", label: "প্যান্ট ও জগার" },
];

const POSITIONS = [
  "absolute -top-4 right-8",
  "absolute -bottom-4 left-4",
  "absolute top-1/2 -left-8",
];
const DURATIONS = ["3s", "3.5s", "4s"];
const DELAYS = ["0s", "0.5s", "1s"];

interface FloatingTag { emoji: string; label: string; }

export default function HeroFloatingTags({ tags }: { tags?: FloatingTag[] }) {
  const resolved = [0, 1, 2].map(i => {
    const custom = tags?.[i];
    const def = DEFAULT_TAGS[i];
    return {
      emoji: custom?.emoji || def.emoji,
      label: custom?.label || def.label,
      cls: POSITIONS[i],
      duration: DURATIONS[i],
      delay: DELAYS[i],
    };
  });

  return (
    <>
      {resolved.map((tag, i) => (
        <div
          key={i}
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
