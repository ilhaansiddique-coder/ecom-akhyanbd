import { FiTruck, FiHeadphones, FiShield, FiRefreshCw } from "react-icons/fi";
import { MotionStaggerContainer, MotionStaggerItem } from "./MotionStagger";
import T from "./T";

const features = [
  { icon: FiTruck, titleKey: "feature.delivery.title", descKey: "feature.delivery.desc" },
  { icon: FiHeadphones, titleKey: "feature.support.title", descKey: "feature.support.desc" },
  { icon: FiShield, titleKey: "feature.safe.title", descKey: "feature.safe.desc" },
  { icon: FiRefreshCw, titleKey: "feature.return.title", descKey: "feature.return.desc" },
];

export default function Features() {
  return (
    <section className="py-12 md:py-16 bg-primary">
      <div className="container mx-auto px-4">
        <MotionStaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {features.map((feature) => (
            <MotionStaggerItem key={feature.titleKey} className="text-center group">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto bg-white/15 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/25 group-hover:scale-110 transition-all duration-300 backdrop-blur-sm">
                <feature.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <h3 className="text-white font-bold text-sm md:text-base"><T k={feature.titleKey} /></h3>
              <p className="text-white/60 text-xs mt-1.5"><T k={feature.descKey} /></p>
            </MotionStaggerItem>
          ))}
        </MotionStaggerContainer>
      </div>
    </section>
  );
}
