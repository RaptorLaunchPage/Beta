import CCApplicationForm from "@/components/cc-application/CCApplicationForm";
import { Metadata } from "next";
import { VideoBackground } from "@/components/video-background";
import { PublicNavigation } from "@/components/public/PublicNavigation";
import { PublicFooter } from "@/components/public/PublicFooter";
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll";

export const metadata: Metadata = {
  title: "Apply | Raptor Esports",
  description: "Apply to become a content creator for Raptor Esports.",
};

export default function ApplyPage() {
  return (
    <VideoBackground>
      <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
        <PublicNavigation />

        {/* Main Content */}
        <section className="max-w-5xl mx-auto px-4 pt-24 pb-10">
          <div className="text-center mb-8">
            <FadeInOnScroll>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-xl">
                Content Creator Application
              </h1>
            </FadeInOnScroll>
            <FadeInOnScroll delayMs={120}>
              <p className="mt-2 text-white/85">
                Join the creative force of Raptor Esports.
              </p>
            </FadeInOnScroll>
          </div>

          <FadeInOnScroll>
             <CCApplicationForm />
          </FadeInOnScroll>
        </section>

        <PublicFooter />
      </div>
    </VideoBackground>
  );
}
