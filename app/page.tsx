import { Camera, PenLine, Share2 } from "lucide-react";

const STEPS = [
  {
    icon: PenLine,
    title: "Invent a place",
    body: "A lighthouse that critiques your outfit. A studio flat inside a vending machine. If it can't exist, it belongs here.",
  },
  {
    icon: Camera,
    title: "Make it look real",
    body: "Photos, amenities, house rules and a nightly price that makes no sense, all presented with a straight face.",
  },
  {
    icon: Share2,
    title: "Share the link",
    body: "Every listing gets its own page and preview card, ready for the group chat. Reservations are, sadly, imaginary.",
  },
];

export default function HomePage() {
  return (
    <main id="main" className="flex-1">
      <section className="page-container py-16 sm:py-24">
        <p className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" aria-hidden="true" />
          Every stay is 100% fictional
        </p>
        <h1 className="mt-6 max-w-4xl font-heading text-5xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-7xl">
          Unreal stays.
          <br />
          <span className="text-brand">Unbelievable experiences.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-muted-foreground sm:text-xl">
          accommodationDog is a marketplace for places that don&apos;t exist. Dream up a listing, give it the full
          five-star treatment, and collect reviews from guests who will never, ever arrive.
        </p>
      </section>

      <section aria-labelledby="how-it-works" className="border-t">
        <div className="page-container py-14 sm:py-20">
          <h2 id="how-it-works" className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            How hosting nowhere works
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map(({ icon: Icon, title, body }, index) => (
              <li key={title} className="grid content-start gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold">
                  <span className="sr-only">Step {index + 1}: </span>
                  {title}
                </h3>
                <p className="text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
