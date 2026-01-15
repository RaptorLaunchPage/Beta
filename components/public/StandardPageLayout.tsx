
import { FadeInOnScroll } from "@/components/ui/fade-in-on-scroll"

interface StandardPageLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
}

export function StandardPageLayout({ title, description, children }: StandardPageLayoutProps) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto">
      <section className="max-w-6xl mx-auto px-4 pt-24 pb-10">
        <div className="text-center mb-8">
          <FadeInOnScroll>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white drop-shadow-xl">{title}</h1>
          </FadeInOnScroll>
          {description && (
            <FadeInOnScroll delayMs={120}>
              <p className="mt-2 text-white/85 max-w-3xl mx-auto">{description}</p>
            </FadeInOnScroll>
          )}
        </div>
        <FadeInOnScroll>
          {children}
        </FadeInOnScroll>
      </section>
    </div>
  )
}
