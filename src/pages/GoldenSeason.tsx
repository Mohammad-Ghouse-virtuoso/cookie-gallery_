import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const conciergeSurfaceStyle = useMemo(() => ({
    marginTop: 'var(--space-xl)',
    padding: 'var(--space-xl)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--shadow-medium)',
    background: 'rgba(248, 237, 220, 0.45)',
    border: '1px solid rgba(219, 166, 97, 0.28)',
  }), []);

  const tastingGridStyle = useMemo(() => ({
    gap: 'var(--space-md)',
  }), []);

  const tastingCardStyle = useMemo(() => ({
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(219, 166, 97, 0.28)',
    background: 'rgba(255, 250, 243, 0.92)',
    padding: 'var(--space-xl)',
    boxShadow: 'var(--shadow-light)',
  }), []);

  const highlightCardStyle = useMemo(() => ({
    borderRadius: 'var(--radius-md)',
    border: '1px solid rgba(219, 166, 97, 0.28)',
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(6px)',
    boxShadow: 'var(--shadow-light)',
    padding: 'var(--space-lg)',
  }), []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <main className="font-inter antialiased">
      <GoldenSeasonHero />

      <SectionDivider color="#dba661" />

      <section
        id="golden-season-preorder"
        className="mx-auto max-w-5xl"
        style={conciergeSurfaceStyle}
        aria-labelledby="preorder-heading"
      >
        <div className="grid items-start gap-8 md:grid-cols-[0.8fr_1fr]">
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
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate('/gift/warm-glow')}
                className="inline-flex items-center justify-center text-sm font-semibold text-white"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-pill)',
                  background: 'linear-gradient(135deg, #e6b76f 0%, #d49a58 100%)',
                  boxShadow: 'var(--shadow-medium)',
                  transition: `transform var(--duration-small) ease, box-shadow var(--duration-small) ease`,
                }}
              >
                Personalise a gift
              </button>
              <button
                type="button"
                onClick={() => navigate('/cookies')}
                className="inline-flex items-center justify-center text-sm font-semibold text-[#5b3a20]"
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid rgba(219, 166, 97, 0.4)',
                  background: 'rgba(248, 237, 220, 0.7)',
                  boxShadow: 'var(--shadow-light)',
                  transition: `transform var(--duration-small) ease, box-shadow var(--duration-small) ease`,
                }}
              >
                View seasonal cookies
              </button>
            </div>
          </div>
          <ul className="grid gap-4" aria-label="Golden Season premium services">
            {featureHighlights.map(feature => (
              <li
                key={feature.heading}
                style={highlightCardStyle}
              >
                <h3 className="text-lg font-semibold text-[#5b3a20]">{feature.heading}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[rgba(74,47,26,0.75)]">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className="mx-auto max-w-5xl"
        style={{ padding: 'var(--space-xl)' }}
      >
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
        <div className="mt-10 grid md:grid-cols-2 lg:grid-cols-3" style={tastingGridStyle}>
          {tastingNotes.map(note => (
            <article
              key={note.title}
              style={tastingCardStyle}
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
