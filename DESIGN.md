---
name: SCA / SAA Explorer
description: A navy specimen drawer where nine synthetic samples are classified live, built to be read from the back row of a lit classroom.
colors:
  specimen-navy: "#0b1d33"
  drawer-deep: "#081629"
  tray-navy: "#10294a"
  tray-raised: "#15345b"
  tray-lit: "#1b3f6c"
  rule: "#24466f"
  rule-strong: "#34608f"
  result-white: "#ffffff"
  frost-text: "#eaf1fa"
  muted-steel: "#b4c7de"
  faint-steel: "#8aa3c2"
  catalogue-cream: "#f2e6c9"
  cream-deep: "#e4d2a8"
  label-ink: "#2a2214"
  sca-amber: "#f5b94a"
  saa-sky: "#79c2ff"
  wrong-coral: "#ff7d6e"
  coral-text: "#ffb3a8"
  family-teal: "#3fd0b0"
  family-lilac: "#b8a3ff"
  family-pink: "#ff9bc9"
  family-lime: "#c6e86e"
  edge-steel: "#9db6d6"
  branch-off: "#4f7099"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.62rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.005em"
  headline:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
  title:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 700
    lineHeight: 1.45
  body-lead:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1.04rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Atkinson Hyperlegible, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "0.88rem"
    fontWeight: 400
    lineHeight: 1.45
  data:
    fontFamily: "Courier Prime, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "0.88rem"
    fontWeight: 700
    lineHeight: 1.45
  data-name:
    fontFamily: "Courier Prime, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "1.02rem"
    fontWeight: 700
    lineHeight: 1.45
  data-formula:
    fontFamily: "Courier Prime, ui-monospace, Menlo, Consolas, monospace"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  label: "3px"
  tag: "4px"
  chip: "5px"
  key: "6px"
  control: "8px"
  tray: "10px"
  dialog: "14px"
  pill: "999px"
spacing:
  hairline: "3px"
  chip-gap: "0.3rem"
  tight: "0.6rem"
  row: "1rem"
  tray-pad: "0.75rem 0.9rem"
  stage-pad: "0.9rem 1.4rem 0.6rem"
  bar: "3.4rem"
  status: "2.25rem"
components:
  step-pill:
    backgroundColor: "transparent"
    textColor: "{colors.muted-steel}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.65rem"
    height: "2.3rem"
  step-pill-hover:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
  step-pill-current:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
  button:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.38rem 0.8rem"
  button-primary:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0.38rem 0.8rem"
  icon-button:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 0.8rem"
    height: "2.3rem"
  icon-button-on:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
  segmented-option:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
    typography: "{typography.label}"
    padding: "0.38rem 0.8rem"
  segmented-option-pressed:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
  tray:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.tray}"
    padding: "{spacing.tray-pad}"
  specimen-card:
    backgroundColor: "{colors.tray-navy}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.tray}"
    padding: "0.6rem 0.8rem 0.65rem"
  accession-label:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.label}"
    padding: "0.05rem 0.45rem"
  reference-label:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
    typography: "{typography.data}"
    rounded: "{rounded.tag}"
    padding: "0.4rem 0.7rem 0.45rem"
  tag-sca:
    backgroundColor: "{colors.sca-amber}"
    textColor: "{colors.specimen-navy}"
    typography: "{typography.data}"
    rounded: "{rounded.tag}"
    padding: "0.1rem 0.5rem"
  tag-saa:
    backgroundColor: "{colors.saa-sky}"
    textColor: "{colors.specimen-navy}"
    typography: "{typography.data}"
    rounded: "{rounded.tag}"
    padding: "0.1rem 0.5rem"
  tag-final:
    backgroundColor: "{colors.result-white}"
    textColor: "{colors.specimen-navy}"
    typography: "{typography.data}"
    rounded: "{rounded.tag}"
    padding: "0.1rem 0.5rem"
  family-tag:
    backgroundColor: "{colors.family-teal}"
    textColor: "{colors.specimen-navy}"
    typography: "{typography.data}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.55rem"
  family-tag-unplaced:
    backgroundColor: "transparent"
    textColor: "{colors.catalogue-cream}"
    typography: "{typography.data}"
    rounded: "{rounded.pill}"
    padding: "0.12rem 0.55rem"
  verdict-correct:
    textColor: "{colors.catalogue-cream}"
  verdict-wrong:
    textColor: "{colors.wrong-coral}"
  chip:
    backgroundColor: "{colors.tray-raised}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.chip}"
    padding: "0.12rem 0.5rem"
  chip-on:
    backgroundColor: "{colors.catalogue-cream}"
    textColor: "{colors.label-ink}"
  input-text:
    backgroundColor: "{colors.specimen-navy}"
    textColor: "{colors.frost-text}"
    rounded: "{rounded.control}"
    padding: "0 0.7rem"
    height: "2.2rem"
---

# Design System: SCA / SAA Explorer

## Overview

**Creative North Star: "The Specimen Drawer"**

The whole interface is a natural-history specimen drawer opened under a projector. The ground is a deep navy drawer bed; content sits in raised navy trays; every specimen carries a cream catalogue label with a typewriter accession number. Classification is the drama: specimens start unplaced, and families are inked in colour as a threshold moves. The look is calm, dark and high-contrast because it is read from the back row of a lit classroom, not at arm's length.

Density is deliberately low. One idea fills the stage at a time, type grows with the viewport, and every step fits a 1280×720 projector frame without scrolling. Colour is semantic before it is decorative: three fixed meanings (code, attributes, combined score), four family hues, cream for the catalogue and for "correct", coral for "wrong". Nothing on the page is coloured for atmosphere alone.

This world replaces an earlier packet-capture costume. The analyst drawer still offers a list, a detail tree and a byte view, but in the drawer's own materials: navy panes, cream selection, amber and sky bytes. Data that needs to look like data is set in Courier Prime; nothing borrows a capture tool's chrome or protocol colouring.

**Key Characteristics:**
- Navy drawer ground with raised trays: a lit top edge and a soft drop, never a flat border box.
- Cream catalogue labels with Courier Prime accession numbers ("No. 001").
- Fixed meaning hues: SCA amber, SAA sky, S_final white. Family hues never overlap them.
- Correct is cream with a check icon; wrong is coral with a cross icon. There is no green.
- A dashed outline means unplaced. Selection is always solid.
- The θ cut line sliding through a family tree is the signature device.
- Projector-first sizing: a fluid root size, a 14px floor for on-stage labels, whole-line scroll panes.

## Colors

A cold navy ladder lit by one warm cream, with a small set of saturated hues that each mean exactly one thing.

### Primary
- **Catalogue Cream** (catalogue-cream): the catalogue's voice. Accession labels, the paper-reference label, the current step pill, pressed segments, selected chips, the primary button, the θ cut line and its tag, focus rings, slider fill, and every "correct" verdict. Text on cream is always Label Ink.
- **Aged Cream** (cream-deep): the hover border on trays, cards, buttons and chips, the dashed outline of an unplaced specimen, and completed step numbers.
- **Label Ink** (label-ink): the dark brown-black typed onto cream surfaces (12.7:1 on cream).

### Secondary
- **SCA Amber** (sca-amber): Shared Code Analysis and nothing else. SCA tags, SCA counts and figures, MinHash matching slots and the estimate curve, code bytes.
- **SAA Sky** (saa-sky): Shared Attribute Analysis and nothing else. SAA tags and figures, the shared-attribute column, attribute bytes, the selected pair in the SAA heatmap.
- **Result White** (result-white): the top of the ink ladder and the colour of S_final. Headings, specimen names, slider values, formula results and the scores that matter. Specimen A is outlined in it and specimen B is ringed in it.
- **Wrong Coral** (wrong-coral): a wrong link or a missed link, always paired with the cross icon (6.8:1 on the ground).
- **Soft Coral** (coral-text): text-weight coral for error messages and the destructive "Reset demo" menu item.

### Tertiary
- **Family Teal / Lilac / Pink / Lime** (family-teal, family-lilac, family-pink, family-lime): assigned in order to clusters found at the current θ, used as solid node fills, inked dendrogram branches, leaf marks and family tags with navy text. Lime is a cluster colour only; it never signals correctness.

### Neutral
- **Specimen Navy** (specimen-navy): the drawer bed and page ground. Also the text colour on every saturated tag and node.
- **Drawer Deep** (drawer-deep): the top bar, status line, side drawer and terminal panes; one step below the ground.
- **Tray Navy / Tray Raised / Tray Lit** (tray-navy, tray-raised, tray-lit): three lift levels. Trays and controls sit on Tray Navy; chips and popovers on Tray Raised; keycaps, formula results and selected rows on Tray Lit.
- **Rule / Rule Strong** (rule, rule-strong): hairline dividers and table rules; control borders, scrollbars and slider track.
- **Frost** (frost-text): reading text and control labels. Not white: white is held back for headings and figures.
- **Muted Steel** (muted-steel): ledes, captions, table headers, axis labels, inactive step pills (9.8:1).
- **Faint Steel** (faint-steel): counts inside chips, placeholders, byte offsets, secondary sub-lines (6.5:1).
- **Edge Steel** (edge-steel): edges in the similarity graph, thickening with score above θ.
- **Branch Off** (branch-off): dendrogram branches not yet joined at θ, drawn dashed and thin. A structural stroke, never text (3.3:1).

### Named Rules
**The Fixed Meaning Rule.** Amber is SCA, sky is SAA, white is S_final. These three never colour a family, a state, a hover or a decoration, and the four family hues never stand in for them.

**The No Green Rule.** Correct is Catalogue Cream with a check icon; wrong is Wrong Coral with a cross icon. Meaning is never carried by colour alone, and no green appears anywhere in the system.

**The Cream Is The Catalogue Rule.** Anything the presenter has selected, pressed or is currently on turns cream with Label Ink text. A cream surface means "this one".

## Typography

**Display Font:** Atkinson Hyperlegible (with -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif), self-hosted woff2 at 400, 400 italic and 700.
**Body Font:** Atkinson Hyperlegible.
**Label/Mono Font:** Courier Prime (with ui-monospace, Menlo, Consolas, monospace), self-hosted woff2 at 400 and 700.

**Character:** A face built for low-vision legibility does all the reading, and a typewriter face does all the cataloguing. The pairing reads as a museum label: plain humane prose beside typed accession data.

The root size is fluid and presenter-adjustable: `clamp(15.5px, 0.52vw + 9.5px, 22px)` multiplied by a zoom factor from the menu (about 16px at 1280 wide, 22px at full HD and above). Every size below is in rem, so the whole stage scales together.

### Hierarchy
- **Display** (700, 1.62rem, 1.2, -0.005em, Result White, balanced): the step title. One per stage.
- **Headline** (700, 1.5rem, 1.25, Result White): the single statement a step lands on, with its key figure in cream.
- **Title** (700, 0.9rem, Result White): tray headings, mini headings, table group heads.
- **Body Lead** (400, 1.04rem, Muted Steel, max 70ch): the one-line lede under the title.
- **Body** (400, 1rem, 1.45, Frost): reading text, takeaways, large table cells.
- **Label** (400, 0.88rem): buttons, step pills, captions (0.9rem), control labels.
- **Data** (Courier Prime 700, 0.88rem): accession numbers, meaning and family tags, scores, chips (at 400), terminal output, file names in tables. Numerals that line up use tabular figures.
- **Data Name** (Courier Prime 700, 1.02rem, Result White; 1.22rem when the drawer fills the stage): specimen file names on cards.
- **Data Formula** (Courier Prime 400, 1.35rem): the worked formula line, with the result boxed on Tray Lit in Result White.

### Named Rules
**The Typewriter Is For Data Rule.** Courier Prime sets accession numbers, file names, scores, tags, bytes and formulas. Prose, headings and control labels stay in Atkinson Hyperlegible.

**The Projector Floor Rule.** No on-stage label renders below 14px. SVG text goes through the floor helper (`px(mult, 14)`: root size × multiplier, never under 14); CSS labels use 0.88rem or larger.

## Layout

The app is a three-row grid filling the viewport: a Drawer Deep top bar (3.4rem) with the name, ten numbered step pills and the Specimens / menu actions; the stage; and a Drawer Deep status line (2.25rem) with previous/next, step count, live message and the θ / α / k parameters. The page itself never scrolls at projector sizes.

The stage is stage-first: a head row (title and lede on the left, the cream paper-reference label pinned right) and a body that hands all remaining height to its charts. Steps compose with flex rows of trays (1rem gap); charts read the height their host was given, so every step fits 1280×720. Card grids are three columns of specimens (0.6rem gap, 0.8rem when the drawer fills the stage). Tight groups use 0.3rem (chips) and 0.6rem; separate groups use 1rem.

The specimen drawer slides in from the right (min(36rem, 48vw)) between bar and status line, split into list, detail tree and byte panes.

Responsive: at 1500px and up every step pill shows its label; below that only the current one does. At 900px and below the shell becomes a scrolling column: the step row wraps to its own line, rows stack, card grids go single-column, charts take a fixed 320px, and the status line drops its parameters.

### Named Rules
**The One Frame Rule.** Every step fits a 1280×720 frame with no page scroll. Content that is longer scrolls inside its own tray, never the stage.

**The Whole Line Rule.** A scroll pane ends on a whole line, never a sliced one: terminal panes are resized to an exact multiple of their line height, and chip groups show only the chips that fit whole, then a cream "+n more" chip.

## Elevation & Depth

Depth is physical and quiet: trays are raised off the drawer bed, labels are raised off the trays. Every shadow has a downward offset, a soft blur and a negative spread so it pools beneath the object instead of haloing around it. Trays add a 1px lit top edge (white at 6%) as if lit from above. The ground ladder (Drawer Deep, Specimen Navy, Tray Navy, Tray Raised, Tray Lit) does the rest of the layering.

### Shadow Vocabulary
- **Tray lift** (`box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 14px 28px -18px rgba(2, 8, 18, 0.9)`): every tray and specimen card.
- **Label lift** (`box-shadow: 0 2px 6px -2px rgba(0, 0, 0, 0.55)`): the cream accession label on a card.
- **Reference label lift** (`box-shadow: 0 6px 14px -8px rgba(0, 0, 0, 0.6)`): the paper-reference label in the stage head.
- **Popover** (`box-shadow: 0 18px 40px -12px rgba(3, 10, 20, 0.7)`): the menu and pop-out trays.
- **Side drawer** (`box-shadow: -24px 0 48px -24px rgba(0, 0, 0, 0.75)`): the specimen drawer over the stage.
- **Dialog** (`box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.8)`): the keyboard-shortcuts dialog, over a 70% navy backdrop.

### Named Rules
**The Raised Tray Rule.** A container is a tray: Tray Navy, a 1px Rule border, a 10px radius, the lit top edge and the soft drop. Never a bare border box, never a zero-blur offset block.

## Shapes

Corners are gently rounded and scale with what the object is. Labels are near-square paper (3px accession, 4px tags and reference label); chips and keycaps are 5px; small keys, score pills and focus rings 6px; controls are 8px; trays and cards 10px; the dialog 14px. Step pills and family tags are full pills, so a family reads as a rounded token beside the squarer meaning tags. Graph nodes are pills too; dendrogram leaf marks are 3px squares. Borders are 1px hairlines in Rule or Rule Strong; the unplaced outline is a 1.5px dash in Aged Cream.

### Named Rules
**The Dashed Means Unplaced Rule.** On a specimen mark (card tag, graph node, leaf mark) a dashed outline means unplaced and nothing else. Specimen A is a solid 3px white stroke; specimen B is a solid white ring set 5px outside the node. Dashed lines elsewhere are reserved for the θ threshold, reference values and branches not yet joined at θ.

## Components

### Buttons
Quiet navy keys that turn cream when they are the one in use.
- **Shape:** gently rounded (8px).
- **Default:** Tray Navy fill, 1px Rule Strong border, Frost label at 0.88rem, padding 0.38rem 0.8rem; icon buttons are 2.3rem tall with an 18px stroked SVG icon and a text label.
- **Primary:** Catalogue Cream fill and border, Label Ink, bold.
- **Hover / Focus:** border shifts to Aged Cream (icon buttons also lift to Tray Raised) over 160ms; focus is a 3px cream outline with a 2px offset on every control.
- **On / Expanded:** an icon button whose panel is open turns cream with Label Ink.
- **Disabled:** 35% opacity, default cursor.

### Step Pills (Navigation)
- **Style:** full pills, 2.3rem tall, with a Courier Prime step number in a 1.55rem circle.
- **Default:** transparent, Muted Steel; hover lifts to Tray Navy with Frost text.
- **Done:** the number circle turns Aged Cream with a cream numeral.
- **Current:** cream fill, Label Ink, bold label shown; the number circle inverts to navy with a cream numeral.

### Segmented Controls and Group Tabs
- **Style:** a Tray Navy strip with a Rule Strong border (9px radius), options split by 1px Rule dividers; group tabs are separate 7px-radius keys on Tray Raised.
- **State:** the pressed option is cream with Label Ink and bold text; hover lifts to Tray Raised.

### Chips
- **Style:** Courier Prime 0.88rem on Tray Raised, 1px Rule Strong border, 5px radius, with a Faint Steel count.
- **State:** selected chips are cream with Label Ink; the overflow chip is transparent with a cream label and Aged Cream border.

### Trays / Containers
- **Corner Style:** 10px.
- **Background:** Tray Navy, with Tray Raised for popovers.
- **Shadow Strategy:** Tray lift (see Elevation & Depth).
- **Border:** 1px Rule. The shared-attribute column takes an SAA Sky border because it is SAA's own set.
- **Internal Padding:** 0.75rem 0.9rem; heading row is a bold 0.9rem white title with an optional muted aside on the right.

### Inputs / Fields
- **Text input:** Specimen Navy fill (sunk below the tray), Rule Strong border, 8px radius, Courier Prime, cream caret, Faint Steel placeholder. A valid filter turns the border cream; an invalid one turns it coral, with the message in Soft Coral.
- **Range slider:** a 6px track filled cream up to the value over Rule Strong; a white thumb with a navy rim and a cream ring. The value sits beside it in bold Courier Prime white.
- **Select:** Tray Navy, Rule Strong border, 8px radius, Courier Prime.

### Specimen Card
The unit of the drawer. A raised tray (10px, Tray lift) holding a cream accession label ("No. 001", Courier Prime 700 on cream, 3px radius, Label lift) top-left and the family tag top-right; the file name in Data Name white; kind and first-seen date in Muted Steel; and counts with the SCA figure in amber and the SAA figure in sky. Hover borders Aged Cream; the selected card takes a cream border plus a 1px cream inset. When a specimen is filed, its family tag stamps in (scale from 1.35, 420ms).

### Meaning Tags, Family Tags and Verdicts
- **Meaning tags:** 4px-radius Courier Prime 700 blocks with navy text on SCA Amber, SAA Sky or Result White (S_final).
- **Family tags:** full pills with navy text on the family hue, labelled "Family 1" to "Family 4". Unplaced is a transparent pill with cream text and a 1.5px dashed Aged Cream border.
- **Verdicts:** bold text led by a drawn check (cream) or cross (coral) icon. Score pills carry the same icon on a 14% cream or 16% coral wash.

### Paper Reference Label
A cream label pinned top-right of every stage: a small field key over the section, equation and figure references in Courier Prime 700, Label Ink, 4px radius, Reference label lift, max 22rem.

### θ Cut Line (Signature)
The family tree is a single-linkage dendrogram drawn on the tray, leaves on the left with square family marks, similarity running from 1.0 to 0 along the axis. θ is a vertical dashed cream line (2.2px, 6/5 dash) with a cream tag reading "θ 0.70" in Label Ink. Moving θ glides the line (260ms) and re-inks the tree: branches joined at or above θ turn solid in their family hue at 3.2px, branches beyond the cut drop to thin dashed Branch Off, and the region left of the line takes a 6% cream wash marking "same family". The same cream dashed datum marks θ across score bars.

### Similarity Graph
Specimens as pill nodes: placed nodes fill with their family hue and navy Courier Prime labels; unplaced nodes are navy with a dashed Aged Cream outline and cream label. Edges are Edge Steel, thickening with score above θ; score labels sit in small navy boxes and are dropped rather than allowed to collide.

## Do's and Don'ts

### Do:
- **Do** set every surface on the navy ladder (specimen-navy ground, drawer-deep chrome, tray-navy trays) and keep reading text Frost, not white.
- **Do** colour SCA amber, SAA sky and S_final white everywhere they appear, including counts, bytes, curves and table headers.
- **Do** mark the current, pressed or selected item with a cream fill and Label Ink text.
- **Do** pair every correctness signal with its icon: cream plus check for correct, coral plus cross for wrong.
- **Do** give every specimen a cream accession label in Courier Prime 700 ("No. 001").
- **Do** build containers as raised trays: 10px radius, 1px Rule border, lit top edge and a soft offset drop.
- **Do** show thresholds as the dashed cream θ line or datum, gliding over 260ms on the expo-out curve.
- **Do** route on-stage SVG label sizes through the 14px floor helper, and keep CSS labels at 0.88rem or larger.
- **Do** fit every step in 1280×720 without page scroll and end every scroll pane on a whole line.
- **Do** self-host Atkinson Hyperlegible and Courier Prime; the demo runs offline.

### Don't:
- **Don't** use green, or any family hue, to mean correct.
- **Don't** reuse amber, sky or white for families, hover, emphasis or decoration.
- **Don't** dash an outline to show selection or focus; dashed on a specimen means unplaced only.
- **Don't** set Courier Prime on prose, headings or control labels.
- **Don't** let a scroll pane slice a line of text in half.
- **Don't** flatten a tray to a bare border box or give it a zero-blur offset shadow.
- **Don't** bring back the packet-capture look: no capture-tool chrome and no protocol colour coding.
- **Don't** load fonts or scripts from the network.

## Guided simulator (2026-10-13)

The current flow is Inputs → SCA → SAA → Combine → Output. SCA and SAA each have two local scenes: method and output. Next advances through both before leaving the page. Example selectors persist across the explanations. Optional calculations and settings use inline details rather than a global technical mode.

Output displays only one chart at a time: relationships, similarity matrix or exact t-SNE. Group colours denote connected components; dashed specimens are unplaced. The graph cutoff does not move t-SNE points. The integrated code score is explicitly labelled cosine similarity; standalone SCA search is labelled MinHash.

Preserve the existing palette and local fonts. Primary pages use one heading, one short lede, and one takeaway. Charts reserve room for captions and disclosures at 1280×720. Mobile stacks and scrolls naturally; dense matrices and signatures have local horizontal overflow. Expanded detail may scroll on desktop.

Numerical validation uses `npm run verify`. Historical captures and review records describe earlier versions and are not evidence of this walkthrough's current layout.


## Clickable framework overview

The opening view redraws Figure 3 in the existing navy, cream, amber and sky palette. Eight rectangular buttons retain the source diagram’s branching SCA/SAA paths and bottom return flow. Each opens its corresponding detailed view; a persistent Back to framework control returns focus to the source box. A shared-element transition expands the selected box into the explanation where supported, with immediate navigation for reduced motion or unsupported browsers. At narrow widths, the diagram becomes a vertical flow with SCA and SAA side by side. Input data and preprocessing remain distinct detail scenes; clustering and results interpretation have separate computed explanations.


The similarity matrix uses a pale-to-deep red sequential scale: deeper red means greater similarity, with a labelled 0–1 legend and contrasting cell values. The t-SNE projection and results interpretation share one view, with map and explanation side by side on desktop and stacked on narrow screens. Both the overview’s interpretation box and the output tab open this combined view.


Relationships and clustering share a single output view: thresholded edges beside their connected-component group membership. The overview’s clustering and visualization boxes both lead to that view. The t-SNE view explains position, inherited graph colours, cutoff effects and local-distance interpretation without repeating the graph’s membership lists.


The dataset contains 75 deterministic synthetic samples in five lineages. Dense relationship graphs arrange computed connected components in separate regions; each node retains a full-name tooltip and specimen selection. Group counts stay beside the graph. The full 75×75 matrix uses sparse axis labels and exact pair selection rather than unreadable per-cell numbers. t-SNE uses perplexity 15 and labels the selected pair.

## Short presentation flow

The main path is three worked examples: SCA, SAA, Synthesis. No framework, preprocessing, search ranking or dataset-output tour interrupts Next. Keep the selected pair across screens; each screen exposes evidence, arithmetic and threshold decision. Detailed calculations stay in native disclosures. Explore retains the detailed five-page navigation and 75-sample views; Back to demo restores the prior presentation screen. Navy, cream, local fonts and method colours are preserved.

The clickable overview is restored as the first presentation tab. Tab and framework navigation switches immediately, without entrance or zoom animation; the content scrollbar reserves its width to prevent horizontal shifting.
