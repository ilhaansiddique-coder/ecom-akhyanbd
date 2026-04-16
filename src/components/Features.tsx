import { FiTruck, FiHeadphones, FiShield, FiRefreshCw, FiStar, FiHeart, FiCheck, FiGift, FiClock } from "react-icons/fi";
import { LuLeaf } from "react-icons/lu";
import { MotionStaggerContainer, MotionStaggerItem } from "./MotionStagger";
import T from "./T";

const defaultFeatures = [
  { icon: "truck", titleKey: "feature.delivery.title", descKey: "feature.delivery.desc" },
  { icon: "headphones", titleKey: "feature.support.title", descKey: "feature.support.desc" },
  { icon: "shield", titleKey: "feature.safe.title", descKey: "feature.safe.desc" },
  { icon: "refresh", titleKey: "feature.return.title", descKey: "feature.return.desc" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  truck: FiTruck, headphones: FiHeadphones, shield: FiShield, refresh: FiRefreshCw,
  star: FiStar, heart: FiHeart, check: FiCheck, gift: FiGift, clock: FiClock, leaf: LuLeaf,
};

interface FeatureContent {
  icon: string;
  title: string;
  description: string;
}

export default function Features({ content }: { content?: FeatureContent[] }) {
  // Use content from DB if all items have titles, otherwise fallback to translation keys
  const useCustom = content && content.length > 0 && content.some(f => f.title);

  return (
    <section className="py-12 md:py-16 bg-primary">
      <div className="container mx-auto px-4">
        <MotionStaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {useCustom ? content!.map((feature, idx) => {
            const Icon = ICON_MAP[feature.icon] || FiStar;
            return (
              <MotionStaggerItem key={idx} className="text-center group">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-white/15 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-white font-bold text-sm md:text-base">{feature.title}</h3>
                <p className="text-white/60 text-xs mt-1.5">{feature.description}</p>
              </MotionStaggerItem>
            );
          }) : defaultFeatures.map((feature) => {
            const Icon = ICON_MAP[feature.icon] || FiStar;
            return (
              <MotionStaggerItem key={feature.titleKey} className="text-center group">
                <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-white/15 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                  <Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <h3 className="text-white font-bold text-sm md:text-base"><T k={feature.titleKey} /></h3>
                <p className="text-white/60 text-xs mt-1.5"><T k={feature.descKey} /></p>
              </MotionStaggerItem>
            );
          })}
        </MotionStaggerContainer>
      </div>
    </section>
  );
}
