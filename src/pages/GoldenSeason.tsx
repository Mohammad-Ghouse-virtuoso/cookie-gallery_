import { useEffect } from 'react';
import GoldenSeasonHero from '../components/GoldenSeasonHero';
import SectionDivider from '../components/SectionDivider';

const featureHighlights = [
  {
    heading: 'Limited Micro-Batches',
    body: "Each drop is capped so every box ships oven-fresh with the season's spotlight flavours.",
  },
  {
    heading: 'Gift-Wrapped Ritual',
    body: 'Layered tissue, satin ribbons, and handwritten tasting notes included with every order.',
  },
  {
    heading: 'Pairing Concierge',
    body: 'Need beverage pairings or custom notes? Our kitchen team curates a perfect ritual for your recipient.',
  },
];

const tastingNotes = [
  {
    title: 'Golden Hearth Collection',
    stories: [
      'Oatmeal cinnamon rounds, toasted almond florentines, and molten chocolate disks are ribbon-wrapped on a wooden harvest table, lit by strings of fairy lights.',
      'It tastes like home in its most polished form—warm, cozy, and finished with the premium sheen of our bakery artisans.',
    ],
  },
  {
    title: 'Midnight Luxe Box',
    stories: [
      'Single-origin dark chocolate sablés rest on black marble with flickers of candlelight catching every golden sprinkle.',
      'Expect a moody, espresso-forward indulgence crafted for midnight toasts and whispered, cinematic conversations.',
    ],
  },
  {
    title: 'Starlight Reverie Box',
    stories: [
      'Rosewater shortbreads and pistachio pralines shimmer on white ceramic, surrounded by pastel gold confetti and a soft, dreamy glow.',
      'Delicate, high-end, and quietly enchanting—the box for stargazers who love their desserts to whisper luxury.',
    ],
  },
];

export default function GoldenSeason() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="font-inter antialiased">
      <GoldenSeasonHero />

      <SectionDivider color="#dba661" />

      <section
        id="golden-season-preorder"
        className="max-w-5xl mx-auto px-6 py-12 sm:py-16 bg-[rgba(248,237,220,0.45)] rounded-3xl shadow-[0_28px_60px_-32px_rgba(91,58,32,0.35)] mt-10"
        aria-labelledby="preorder-heading"
      >
        <div className="grid gap-8 md:grid-cols-[0.8fr_1fr] items-start">
          <div>
            <p className="text-xs tracking-[0.32em] uppercase text-[rgba(91,58,32,0.72)] font-semibold">Golden Season Concierge</p>
            <h2
              id="preorder-heading"
              className="text-3xl sm:text-4xl font-extrabold text-[#5b3a20] mt-3 mb-4"
            >
              Reserve your drop before the trays leave the oven
            </h2>
            <p className="text-base leading-relaxed text-[rgba(74,47,26,0.78)]">
              Choose your box, add concierge notes, and lock in your dispatch week. We&apos;ll send tasting cues
              and a gift-ready unboxing guide as soon as your batch begins tempering.
            </p>
          </div>
          <ul className="grid gap-4" aria-label="Golden Season premium services">
            {featureHighlights.map(feature => (
              <li
                key={feature.heading}
                className="rounded-2xl bg-white/70 backdrop-blur-sm border border-[rgba(219,166,97,0.28)] p-5 shadow-[0_18px_40px_-30px_rgba(91,58,32,0.55)]"
              >
                <h3 className="text-lg font-semibold text-[#5b3a20]">{feature.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[rgba(74,47,26,0.75)]">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <p className="text-xs tracking-[0.32em] uppercase text-[rgba(91,58,32,0.72)] font-semibold text-center">
          tasting notes
        </p>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#5b3a20] text-center mt-3">
          Three signature boxes, endless rituals
        </h2>
        <p className="text-base text-[rgba(74,47,26,0.78)] leading-relaxed text-center max-w-3xl mx-auto mt-3">
          Designed for gifting, curated for immersive flavourscapes. Choose the mood—we&apos;ll finish the story with
          ribbons, pairings, and freshly tempered chocolate.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tastingNotes.map(note => (
            <article
              key={note.title}
              className="rounded-3xl border border-[rgba(219,166,97,0.28)] bg-[rgba(255,250,243,0.92)] p-8 shadow-[0_24px_48px_-32px_rgba(91,58,32,0.5)]"
            >
              <h3 className="text-2xl font-semibold text-[#4b2f1d]">{note.title}</h3>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-[rgba(74,47,26,0.78)]">
                {note.stories.map(line => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <span
                className="inline-block mt-5 text-[#7a4b24] font-medium"
                style={{ fontFamily: '"Great Vibes","Allura","Lucida Handwriting","Caveat",cursive', letterSpacing: '0.04em', fontSize: '1.1rem' }}
              >
                From the baker&apos;s note
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
