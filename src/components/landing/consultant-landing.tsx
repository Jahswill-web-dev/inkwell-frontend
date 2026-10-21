import {
  ArrowRight,
  Check,
  Copy,
  DownloadSimple,
  FileText,
  Pause,
  Sparkle,
  Stop,
} from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { Footer } from "./footer";
import { Navigation } from "./navigation";
import styles from "./consultant-landing.module.css";

function InterviewPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.interviewPreview} ${compact ? styles.interviewCompact : ""}`}>
      <div className={styles.previewTopline}>
        <span className={styles.previewBrand}>inkwell</span>
        <span className={styles.previewState}><span /> Interview</span>
      </div>
      <div className={styles.orbArea}>
        <Image
          src="/images/consultant/voice-orb.png"
          alt=""
          width={310}
          height={310}
          className={styles.orbImage}
        />
        <span className={styles.listening}>Listening…</span>
        <span className={styles.soundBars} aria-hidden="true">▮▯▮▮▯▮▯▮▮▯▮</span>
      </div>
      <p className={styles.question}>
        What is a lesson you learned from working with clients?
      </p>
      <div className={styles.voiceControls} aria-hidden="true">
        <span><Pause size={17} weight="fill" /></span>
        <span><Stop size={16} weight="fill" /></span>
      </div>
    </div>
  );
}

function DraftPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.draftPreview} ${compact ? styles.draftCompact : ""}`}>
      <div className={styles.draftEyebrow}><FileText size={17} /> Article draft</div>
      <h3>Turning Ambiguity into Progress</h3>
      <p>
        Progress often starts when a team can name what is unclear. That gives
        people a shared place to begin, even before every answer is known.
      </p>
      <blockquote>
        A useful next step can bring more clarity than another round of
        abstract discussion.
      </blockquote>
      <p>
        The conversation becomes more productive when the choices, trade-offs,
        and next actions are visible to everyone involved.
      </p>
    </div>
  );
}

function EditorPreview() {
  return (
    <div className={styles.editorPreview}>
      <div className={styles.editorTopline}>
        <span><FileText size={17} /> Edit your article</span>
        <span>Saved <Check size={16} /></span>
      </div>
      <div className={styles.editorToolbar} aria-hidden="true">
        <span>T<span className={styles.toolbarSmall}>T</span></span>
        <strong>B</strong>
        <em>I</em>
        <span>☷</span>
      </div>
      <div className={styles.editorBody}>
        <h3>Turning Ambiguity into Progress</h3>
        <p>
          Progress often starts when a team can <mark>name what is unclear</mark>.
          A useful next step makes the choices easier to discuss.
        </p>
      </div>
      <div className={styles.proposal}>
        <div className={styles.proposalTitle}><Sparkle size={16} /> Ask AI · Preview</div>
        <p>
          Progress starts when a team names what is unclear and agrees on one
          useful next step.
        </p>
        <div className={styles.proposalActions}>
          <span>Use this version</span><span>Reject change</span>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>YOUR IDEAS, IN YOUR VOICE</p>
          <h1 id="landing-title">
            Talk through your ideas. Turn them into articles that sound like you.
          </h1>
          <p className={styles.heroDescription}>
            Inkwell interviews you about what you know, shapes your answers
            into a structured draft, and gives you the final say before you
            share it.
          </p>
          <a className={styles.primaryButton} href="/signup?experience=consultant">
            Start an article <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
        <div className={styles.heroVisual} aria-label="An interview becoming an article draft">
          <div className={styles.heroInterview}><InterviewPreview compact /></div>
          <div className={styles.heroDraft}><DraftPreview compact /></div>
        </div>
      </div>
    </section>
  );
}

const chapters = [
  {
    number: "01 / CONVERSATION",
    title: "Start with what you know.",
    description:
      "Speak naturally about your work, your point of view, and the moments that shaped it. Inkwell asks focused follow-up questions so the substance comes from you.",
    visual: <InterviewPreview />,
    className: styles.chapterInterview,
  },
  {
    number: "02 / FIRST DRAFT",
    title: "See your thinking take shape.",
    description:
      "Your answers become a structured article with a clear thread and room for your perspective. Read the full draft before deciding what stays.",
    visual: <DraftPreview />,
    className: styles.chapterDraft,
  },
  {
    number: "03 / YOUR FINAL SAY",
    title: "Refine every word.",
    description:
      "Edit directly or ask AI for a focused change. Preview the suggestion, use it or reject it, and keep control of the final draft.",
    visual: <EditorPreview />,
    className: styles.chapterEditor,
  },
] as const;

function HowItWorks() {
  return (
    <section id="how-it-works" className={styles.workSection} aria-label="How Inkwell works">
      <div className={styles.sectionIntro}>
        <p className={styles.eyebrow}>HOW IT WORKS</p>
        <h2>From conversation to an article that sounds like you.</h2>
        <p>You bring the thinking. Inkwell helps shape it. Every choice stays yours.</p>
      </div>
      <div className={styles.chapters}>
        {chapters.map((chapter) => (
          <article className={`${styles.chapter} ${chapter.className}`} key={chapter.number}>
            <div className={styles.chapterCopy}>
              <p className={styles.eyebrow}>{chapter.number}</p>
              <h3>{chapter.title}</h3>
              <p>{chapter.description}</p>
            </div>
            <div className={styles.chapterVisual}>{chapter.visual}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ExportSection() {
  return (
    <section id="for-consultants" className={styles.exportSection} aria-labelledby="export-title">
      <div className={styles.exportInner}>
        <div className={styles.exportVisual} aria-hidden="true">
          <div className={styles.exportHeading}><FileText size={19} /> Export article</div>
          <div className={styles.exportOptions}>
            <span><Copy size={18} /> Copy draft</span>
            <span><DownloadSimple size={18} /> Download Markdown</span>
            <span><DownloadSimple size={18} /> Download HTML</span>
          </div>
        </div>
        <div className={styles.exportCopy}>
          <p className={styles.eyebrow}>MAKE IT YOURS</p>
          <h2 id="export-title">Ready when you are.</h2>
          <p>
            Bring your article wherever you publish. Copy the draft or download
            it as Markdown or HTML after you are happy with every word.
          </p>
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.finalCta} aria-labelledby="final-cta-title">
      <p className={styles.eyebrow}>YOUR NEXT ARTICLE</p>
      <h2 id="final-cta-title">Your next article starts with a conversation.</h2>
      <a className={styles.primaryButton} href="/signup?experience=consultant">
        Start an article <ArrowRight size={18} aria-hidden="true" />
      </a>
    </section>
  );
}

export function ConsultantLanding() {
  return (
    <main id="home" className={styles.page}>
      <Navigation />
      <Hero />
      <HowItWorks />
      <ExportSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
