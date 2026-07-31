from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "inkwell_product_features.pdf"

PAGE_W, PAGE_H = A4
NAVY = colors.HexColor("#17243D")
INK = colors.HexColor("#263248")
MUTED = colors.HexColor("#667085")
TEAL = colors.HexColor("#1E8C81")
TEAL_DARK = colors.HexColor("#12665E")
MINT = colors.HexColor("#DDF3EF")
CREAM = colors.HexColor("#FAF7F0")
WHITE = colors.white
LINE = colors.HexColor("#D9E1E7")
PALE = colors.HexColor("#F4F7F8")
GOLD = colors.HexColor("#D49A3A")


def register_fonts():
    font_dir = Path("C:/Windows/Fonts")
    candidates = {
        "Inter": font_dir / "arial.ttf",
        "Inter-Bold": font_dir / "arialbd.ttf",
        "Inter-Italic": font_dir / "ariali.ttf",
        "Display": font_dir / "georgia.ttf",
        "Display-Bold": font_dir / "georgiab.ttf",
    }
    for name, path in candidates.items():
        pdfmetrics.registerFont(TTFont(name, str(path)))


register_fonts()

styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverEyebrow",
        fontName="Inter-Bold",
        fontSize=10,
        leading=13,
        textColor=MINT,
        spaceAfter=8,
        tracking=1.2,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        fontName="Display-Bold",
        fontSize=34,
        leading=39,
        textColor=WHITE,
        spaceAfter=13,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSub",
        fontName="Inter",
        fontSize=14,
        leading=21,
        textColor=colors.HexColor("#DCE4ED"),
        spaceAfter=14,
    )
)
styles.add(
    ParagraphStyle(
        name="SectionKicker",
        fontName="Inter-Bold",
        fontSize=8.5,
        leading=11,
        textColor=TEAL,
        tracking=1.1,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="H1Custom",
        fontName="Display-Bold",
        fontSize=23,
        leading=28,
        textColor=NAVY,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        name="H2Custom",
        fontName="Inter-Bold",
        fontSize=13,
        leading=17,
        textColor=NAVY,
        spaceBefore=4,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyCustom",
        fontName="Inter",
        fontSize=9.4,
        leading=14.2,
        textColor=INK,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="Small",
        fontName="Inter",
        fontSize=8.1,
        leading=11.6,
        textColor=MUTED,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="BulletCustom",
        fontName="Inter",
        fontSize=9,
        leading=13,
        textColor=INK,
        leftIndent=12,
        firstLineIndent=-8,
        bulletIndent=0,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="Quote",
        fontName="Display",
        fontSize=18,
        leading=25,
        alignment=TA_CENTER,
        textColor=NAVY,
        leftIndent=16,
        rightIndent=16,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="CardTitle",
        fontName="Inter-Bold",
        fontSize=10.5,
        leading=14,
        textColor=NAVY,
        spaceAfter=3,
    )
)
styles.add(
    ParagraphStyle(
        name="CardBody",
        fontName="Inter",
        fontSize=8.6,
        leading=12.4,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        fontName="Inter-Bold",
        fontSize=8,
        leading=10.5,
        textColor=WHITE,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        fontName="Inter",
        fontSize=7.7,
        leading=10.7,
        textColor=INK,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCellBold",
        fontName="Inter-Bold",
        fontSize=7.8,
        leading=10.8,
        textColor=NAVY,
    )
)


def p(text, style="BodyCustom"):
    return Paragraph(text, styles[style])


def bullet(text):
    return Paragraph(f"- {text}", styles["BulletCustom"])


def section_header(kicker, title, intro=None):
    parts = [p(kicker.upper(), "SectionKicker"), p(title, "H1Custom")]
    if intro:
        parts.append(p(intro, "BodyCustom"))
    parts.append(Spacer(1, 2 * mm))
    return parts


def card(number, title, body, width=78 * mm):
    number_box = Table(
        [[p(str(number).zfill(2), "SectionKicker"), p(title, "CardTitle")]],
        colWidths=[12 * mm, width - 18 * mm],
    )
    number_box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, 0), MINT),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (0, 0), 7),
                ("RIGHTPADDING", (0, 0), (0, 0), 5),
                ("TOPPADDING", (0, 0), (0, 0), 7),
                ("BOTTOMPADDING", (0, 0), (0, 0), 6),
                ("LEFTPADDING", (1, 0), (1, 0), 8),
                ("RIGHTPADDING", (1, 0), (1, 0), 4),
            ]
        )
    )
    box = Table(
        [[number_box], [p(body, "CardBody")]],
        colWidths=[width],
    )
    box.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("LINEBELOW", (0, 0), (-1, 0), 0.5, LINE),
                ("LEFTPADDING", (0, 0), (-1, 0), 0),
                ("RIGHTPADDING", (0, 0), (-1, 0), 0),
                ("TOPPADDING", (0, 0), (-1, 0), 0),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 0),
                ("LEFTPADDING", (0, 1), (-1, 1), 11),
                ("RIGHTPADDING", (0, 1), (-1, 1), 11),
                ("TOPPADDING", (0, 1), (-1, 1), 9),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    return box


def page_footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(22 * mm, 16 * mm, PAGE_W - 22 * mm, 16 * mm)
    canvas.setFont("Inter", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(22 * mm, 10.5 * mm, "INKWELL  /  PRODUCT FEATURE BLUEPRINT")
    canvas.drawRightString(PAGE_W - 22 * mm, 10.5 * mm, f"{doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(TEAL_DARK)
    canvas.circle(PAGE_W - 15 * mm, PAGE_H - 10 * mm, 65 * mm, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.circle(25 * mm, 23 * mm, 4 * mm, stroke=0, fill=1)
    canvas.setStrokeColor(colors.HexColor("#4E637D"))
    canvas.setLineWidth(0.7)
    for offset in range(0, 70, 10):
        canvas.line(25 * mm, (33 + offset) * mm, 185 * mm, (33 + offset) * mm)
    canvas.restoreState()


doc = BaseDocTemplate(
    str(OUTPUT),
    pagesize=A4,
    rightMargin=22 * mm,
    leftMargin=22 * mm,
    topMargin=20 * mm,
    bottomMargin=22 * mm,
    title="Inkwell Product Feature Blueprint",
    author="Inkwell",
    subject="Feature strategy for a faster, clearer blog and article writing product",
)

cover_frame = Frame(
    25 * mm,
    42 * mm,
    PAGE_W - 50 * mm,
    PAGE_H - 76 * mm,
    leftPadding=0,
    rightPadding=0,
    topPadding=0,
    bottomPadding=0,
)
body_frame = Frame(
    22 * mm,
    20 * mm,
    PAGE_W - 44 * mm,
    PAGE_H - 40 * mm,
    leftPadding=0,
    rightPadding=0,
    topPadding=0,
    bottomPadding=0,
)
doc.addPageTemplates(
    [
        PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_page),
        PageTemplate(id="Body", frames=[body_frame], onPage=page_footer),
    ]
)

story = []

# Cover
story += [
    Spacer(1, 35 * mm),
    p("PRODUCT FEATURE BLUEPRINT", "CoverEyebrow"),
    p("Inkwell", "CoverTitle"),
    p(
        "A writing companion that turns knowledge, notes, and rough ideas into clear, original, publishable articles - without losing the writer's voice.",
        "CoverSub",
    ),
    Spacer(1, 18 * mm),
    Table(
        [[p("VISION", "CoverEyebrow"), p("PROPOSED MVP", "CoverEyebrow")],
         [p("Help people think, structure, draft, edit, and publish faster.", "CoverSub"),
          p("Brief -> outline -> guided draft -> edit -> export", "CoverSub")]],
        colWidths=[78 * mm, 78 * mm],
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LINEABOVE", (0, 0), (-1, 0), 0.7, colors.HexColor("#7890A7")),
                ("TOPPADDING", (0, 0), (-1, 0), 8),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ]
        ),
    ),
]
story += [NextPageTemplate("Body"), PageBreak()]

# Product thesis
story += section_header(
    "01 / Product thesis",
    "The opportunity is bigger than AI-generated text",
    "Many tools can generate a complete blog post. Inkwell can be more valuable by improving the entire writing process while keeping the user's ideas, expertise, judgment, and voice at the center.",
)
story += [
    Spacer(1, 4 * mm),
    Table(
        [[p("CORE PROMISE", "SectionKicker")],
         [p('"Turn your knowledge and rough ideas into clear, original articles - without losing your voice."', "Quote")],
         [p("AI assists the writer; it does not replace the writer.", "CardBody")]],
        colWidths=[166 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.8, colors.HexColor("#E7DCC8")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
                ("TOPPADDING", (0, 0), (-1, 0), 12),
                ("TOPPADDING", (0, 1), (-1, 1), 14),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 12),
                ("BOTTOMPADDING", (0, 2), (-1, 2), 13),
            ]
        ),
    ),
    Spacer(1, 9 * mm),
    p("A PRODUCT BUILT AROUND FIVE JOBS", "SectionKicker"),
    Table(
        [[card(1, "Discover", "Find useful ideas worth writing about.", 52 * mm),
          card(2, "Structure", "Turn thoughts and notes into a coherent argument.", 52 * mm),
          card(3, "Draft", "Get momentum while keeping the writer in control.", 52 * mm)],
         [card(4, "Improve", "Make the work clearer, stronger, and more original.", 52 * mm),
          card(5, "Publish", "Package and distribute the finished article.", 52 * mm),
          card(6, "Reuse", "Transform one strong idea into multiple formats.", 52 * mm)]],
        colWidths=[54.5 * mm] * 3,
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2.5 * mm),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4 * mm),
            ]
        ),
    ),
    PageBreak(),
]

# Problems
story += section_header(
    "02 / User problems",
    "Where blog and article writing breaks down",
    "Inkwell should reduce friction from the first idea through the final publish-ready package.",
)
problem_rows = [
    ("Writing problem", "Inkwell response"),
    ("I do not know what to write about.",
     "Generate relevant ideas from the user's audience, expertise, goals, and previous posts."),
    ("I have an idea, but I cannot structure it.",
     "Convert rough notes into an outline with a clear argument and logical flow."),
    ("Starting the first draft is difficult.",
     "Create an editable first draft section by section instead of producing one generic article."),
    ("My writing is unclear or repetitive.",
     "Detect repetition, weak sentences, unnecessary jargon, and confusing sections."),
    ("AI writing does not sound like me.",
     "Build a personal voice profile from writing samples and explicit preferences."),
    ("Research takes too long.",
     "Collect sources, extract useful facts, and attach citations to claims."),
    ("I am not sure whether the article is useful.",
     "Review the draft from the target reader's perspective and surface unanswered questions."),
    ("Editing takes longer than writing.",
     "Offer focused editing modes for clarity, brevity, tone, grammar, and structure."),
    ("My headline and introduction are weak.",
     "Generate and explain multiple headlines, hooks, introductions, and conclusions."),
    ("Publishing requires too many extra steps.",
     "Prepare SEO metadata, summaries, social posts, newsletters, and CMS-ready formatting."),
    ("I struggle to write consistently.",
     "Maintain an idea library, editorial calendar, goals, and writing streaks."),
    ("I lose useful ideas and earlier drafts.",
     "Automatically save versions, notes, sources, and reusable content fragments."),
]
table_data = []
for index, row in enumerate(problem_rows):
    style = "TableHead" if index == 0 else ("TableCellBold" if index else "TableCell")
    if index == 0:
        table_data.append([p(row[0], "TableHead"), p(row[1], "TableHead")])
    else:
        table_data.append([p(row[0], "TableCellBold"), p(row[1], "TableCell")])
problems_table = Table(table_data, colWidths=[62 * mm, 104 * mm], repeatRows=1)
problems_table.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, PALE]),
            ("GRID", (0, 0), (-1, -1), 0.45, LINE),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]
    )
)
story += [problems_table, PageBreak()]

# Features 1-4
story += section_header(
    "03 / Main product features",
    "Guide the writer from intent to a strong first draft",
    "The core experience should feel like a structured collaboration, not a one-click text generator.",
)
feature_1 = [
    p("1. Guided article creation", "H2Custom"),
    p("Replace the intimidating blank editor with a short, useful conversation:", "BodyCustom"),
    bullet("What do you want to write about?"),
    bullet("Who is it for?"),
    bullet("What should readers learn or do?"),
    bullet("What is your main opinion or insight?"),
    bullet("Which examples or experiences should be included?"),
    p("The answers become an article brief. Inkwell then proposes an outline before drafting.", "BodyCustom"),
]
feature_2 = [
    p("2. Intelligent outline builder", "H2Custom"),
    p("Give users a visual place to shape the argument before writing:", "BodyCustom"),
    bullet("Generate several outline approaches."),
    bullet("Drag and reorder sections."),
    bullet("Add questions beneath each section."),
    bullet("Expand one section at a time."),
    bullet("Show the purpose of every section."),
    bullet("Detect missing steps and weak transitions."),
]
feature_3 = [
    p("3. Section-by-section writing assistant", "H2Custom"),
    p("Users select a section or paragraph and request focused help:", "BodyCustom"),
    bullet("Help me start or expand this idea."),
    bullet("Give me an example or supporting evidence."),
    bullet("Make this clearer or shorter."),
    bullet("Challenge this argument."),
    bullet("Improve the transition."),
    p("This keeps the writer in control and reduces generic, disconnected output.", "BodyCustom"),
]
feature_4 = [
    p("4. Personal voice profile", "H2Custom"),
    p("Learn style from existing writing and direct preferences:", "BodyCustom"),
    bullet("Formal versus conversational."),
    bullet("Short versus detailed."),
    bullet("Direct versus narrative."),
    bullet("Preferred sentence length and vocabulary."),
    bullet("Phrases, habits, or cliches to avoid."),
    bullet("Use of humor, stories, analogies, and examples."),
    p("A voice-match indicator can flag paragraphs that no longer sound like the author.", "BodyCustom"),
]
feature_table = Table(
    [
        [feature_1, feature_2],
        [feature_3, feature_4],
    ],
    colWidths=[80 * mm, 80 * mm],
)
feature_table.setStyle(
    TableStyle(
        [
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOX", (0, 0), (-1, -1), 0.6, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
            ("RIGHTPADDING", (0, 0), (-1, -1), 10),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ]
    )
)
story += [feature_table, PageBreak()]

# Features 5-7
story += section_header(
    "03 / Main product features",
    "Improve trust, quality, and usefulness",
    "The editing and research layer should help writers make better decisions, not simply rewrite their sentences.",
)
story += [
    card(
        5,
        "Research and citation workspace",
        "<b>Save links, quotations, facts, and notes.</b> Summarize sources, insert properly attributed evidence, flag claims that need citations, and identify unsupported or potentially inaccurate statements. Sources should remain linked to the paragraphs that use them.",
        166 * mm,
    ),
    Spacer(1, 5 * mm),
    card(
        6,
        "Purpose-driven editing modes",
        "<b>Replace the vague 'Improve writing' command with specific goals:</b> clarity, conciseness, grammar, stronger argument, better storytelling, friendlier tone, professional tone, remove cliches, remove AI-sounding language, and improve transitions. Every suggestion should explain the change and remain optional.",
        166 * mm,
    ),
    Spacer(1, 5 * mm),
    card(
        7,
        "Reader simulation",
        "<b>Review the article through several useful lenses:</b> a complete beginner, an industry expert, a skeptical customer, a busy reader, or a search visitor looking for one answer. Inkwell can highlight confusing terminology, missing context, weak evidence, and overly long sections.",
        166 * mm,
    ),
    Spacer(1, 9 * mm),
    Table(
        [[p("DESIGN PRINCIPLE", "SectionKicker"), p("EXPECTED RESULT", "SectionKicker")],
         [p("Show suggestions with reasons. Let writers accept, reject, or modify every change.", "CardBody"),
          p("Greater trust, clearer authorship, and a product that improves the writer rather than hiding them.", "CardBody")]],
        colWidths=[83 * mm, 83 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E7DCC8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#E7DCC8")),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        ),
    ),
    PageBreak(),
]

# Features 8-10
story += section_header(
    "03 / Main product features",
    "Finish, optimize, and extend every article",
    "Once the core article is strong, Inkwell can help the writer package it for discovery and distribution.",
)
story += [
    card(
        8,
        "Headline and introduction workshop",
        "Generate headline variations for search, curiosity, authority, contrarian thinking, practical value, or story-led framing. Explain why each option works rather than presenting an unexplained score. Apply the same workshop approach to hooks, introductions, and conclusions.",
        166 * mm,
    ),
    Spacer(1, 5 * mm),
    card(
        9,
        "SEO assistance without keyword stuffing",
        "Support search intent analysis, primary and related topics, content gaps, title and description suggestions, heading structure review, internal-link suggestions, keyword-overuse warnings, and FAQ or schema-ready content. SEO should be a finishing layer, not the main writing experience.",
        166 * mm,
    ),
    Spacer(1, 5 * mm),
    card(
        10,
        "Content repurposing",
        "Transform the completed article into a newsletter, LinkedIn post, X thread, short social posts, video or podcast script, summary, pull quotes, and promotional email. Every output should remain faithful to the original article and the author's voice.",
        166 * mm,
    ),
    Spacer(1, 9 * mm),
    p("PUBLISHING AND CONTINUITY CAPABILITIES", "SectionKicker"),
    Table(
        [[p("Export and publishing", "CardTitle"), p("Consistency and memory", "CardTitle")],
         [p("Markdown, HTML, document export, CMS-ready formatting, SEO metadata, summaries, and reusable publishing packages.", "CardBody"),
          p("Autosave, version history, idea library, editorial calendar, goals, writing streaks, notes, sources, and reusable content fragments.", "CardBody")]],
        colWidths=[83 * mm, 83 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        ),
    ),
    PageBreak(),
]

# MVP
story += section_header(
    "04 / Recommended MVP",
    "Build the shortest path to a publishable article",
    "The first version should concentrate on the most frequent workflow and deliver a noticeable reduction in time, uncertainty, and editing effort.",
)
workflow = [
    ("1", "Capture", "Start with an idea, note, question, or rough topic."),
    ("2", "Brief", "Clarify audience, outcome, perspective, and examples."),
    ("3", "Outline", "Create and edit the article's logical structure."),
    ("4", "Draft", "Write section by section with contextual assistance."),
    ("5", "Improve", "Strengthen clarity, structure, tone, and originality."),
    ("6", "Package", "Create the title, summary, metadata, and exports."),
]
workflow_cells = []
for num, title, body in workflow:
    workflow_cells.append(
        Table(
            [[p(num, "SectionKicker")], [p(title, "CardTitle")], [p(body, "Small")]],
            colWidths=[25.5 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), PALE),
                    ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                    ("ALIGN", (0, 0), (-1, 0), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            ),
        )
    )
story += [
    Table(
        [workflow_cells],
        colWidths=[27.5 * mm] * 6,
        style=TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 2 * mm),
            ]
        ),
    ),
    Spacer(1, 9 * mm),
    p("ESSENTIAL MVP CAPABILITIES", "SectionKicker"),
]
mvp_rows = [
    ["Distraction-free editor", "Guided article brief"],
    ["Outline generator and editor", "Section-level AI assistance"],
    ["Focused editing actions", "Basic voice preferences"],
    ["Autosave and version history", "Markdown, HTML, and document export"],
]
mvp_table = Table(
    [[p(a, "CardBody"), p(b, "CardBody")] for a, b in mvp_rows],
    colWidths=[83 * mm, 83 * mm],
)
mvp_table.setStyle(
    TableStyle(
        [
            ("BACKGROUND", (0, 0), (-1, -1), WHITE),
            ("BOX", (0, 0), (-1, -1), 0.6, LINE),
            ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ]
    )
)
story += [
    mvp_table,
    Spacer(1, 9 * mm),
    Table(
        [[p("BUILD LATER", "SectionKicker")],
         [p("Advanced research, collaboration, deep SEO, editorial calendars, direct CMS integrations, and broad multi-channel repurposing should follow after the core writing loop is proven.", "CardBody")]],
        colWidths=[166 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), MINT),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#A8D8D0")),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        ),
    ),
    PageBreak(),
]

# Roadmap and measures
story += section_header(
    "05 / Product direction",
    "A practical release sequence",
    "Prioritize the experience that creates trust and repeat use before expanding into a full content operations platform.",
)
roadmap = [
    ("PHASE 1", "Writing foundation", "Briefs, outlines, editor, section-level assistance, focused edits, autosave, exports."),
    ("PHASE 2", "Quality and identity", "Voice profile, research workspace, citations, reader simulation, headline workshop."),
    ("PHASE 3", "Growth workflow", "SEO, repurposing, publishing integrations, editorial calendar, collaboration."),
]
for phase, title, body in roadmap:
    story += [
        Table(
            [[p(phase, "SectionKicker"), p(title, "CardTitle"), p(body, "CardBody")]],
            colWidths=[25 * mm, 43 * mm, 98 * mm],
            style=TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                    ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                    ("TOPPADDING", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ]
            ),
        ),
        Spacer(1, 4 * mm),
    ]
story += [
    Spacer(1, 5 * mm),
    p("WHAT SUCCESS SHOULD FEEL LIKE", "SectionKicker"),
    Table(
        [[p("Faster", "CardTitle"), p("Clearer", "CardTitle"), p("More personal", "CardTitle")],
         [p("Less time from idea to useful draft.", "CardBody"),
          p("Stronger structure, argument, and readability.", "CardBody"),
          p("Output that retains the author's knowledge and voice.", "CardBody")]],
        colWidths=[55.3 * mm] * 3,
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E7DCC8")),
                ("INNERGRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#E7DCC8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ]
        ),
    ),
    Spacer(1, 11 * mm),
    p("THE NORTH STAR", "SectionKicker"),
    p(
        '"Inkwell helps me turn what I know into something worth reading - faster, more clearly, and still in my own voice."',
        "Quote",
    ),
]

doc.build(story)
print(OUTPUT)
