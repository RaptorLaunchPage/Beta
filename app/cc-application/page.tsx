import CCApplicationForm from "@/components/cc-application/CCApplicationForm";
import { Metadata } from "next";
import { VideoBackground } from "@/components/video-background";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { PublicFooter } from "@/components/public/PublicFooter";
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll";

export const metadata: Metadata = {
  title: "CC Application | Raptor Esports",
  description: "Apply to become a content creator for Raptor Esports.",
};

export default function CCApplicationPage() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* Hero Section */}
        <section className="relative h-[40vh] sm:h-[48vh] w-full pt-14">
          <div className="absolute inset-0">
            <div className="h-full w-full bg-gradient-to-b from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <FadeInOnScroll>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white drop-shadow-xl">
                Content Creator Application
              </h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-3 max-w-3xl text-white/85">
                Join the creative force of Raptor Esports.
              </p>
            </FadeInOnScroll>
          </div>
        </section>

        {/* Form Section */}
        <section className="max-w-5xl mx-auto px-4 py-10">
          <FadeInOnScroll>
             <CCApplicationForm />
          </FadeInOnScroll>
        </section>

        <PublicFooter />
      </div>
    </VideoBackground>
  );
}
