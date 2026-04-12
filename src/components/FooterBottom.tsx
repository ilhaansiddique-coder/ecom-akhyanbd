import Link from "next/link";
import T, { TNum } from "./T";

export default function FooterBottom() {
  return (
    <div className="bg-primary-darker text-white/60 py-4">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-2 text-sm">
        <p className="text-center md:text-left">
          © <TNum value={new Date().getFullYear()} /> <T k="footer.copyright" />{" "}
          <span className="text-white font-semibold"><T k="footer.companyName" /></span>
        </p>
        <p className="text-center text-sm">
          <T k="footer.developedBy" />{" "}
          <a href="https://contradigital.agency/" target="_blank" rel="noopener noreferrer" className="text-white hover:text-white/80 transition-colors font-semibold">
            <T k="footer.developerName" />
          </a>
        </p>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-white transition-colors"><T k="footer.terms" /></Link>
          <span className="text-white/30">|</span>
          <Link href="/privacy" className="hover:text-white transition-colors"><T k="footer.privacy" /></Link>
        </div>
      </div>
    </div>
  );
}
