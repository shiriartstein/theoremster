# Theorem Timeline

A card game about the history of mathematics, played together on one screen or online.
Each card is a theorem. Place it in your timeline by its historical date,
and name a credited mathematician to earn a ∎. Dates may refer to publication,
announcement or approximate attribution, as shown on the card back.
Inspired by the music game Hitster.

## A friendly, guided start

The host answers five questions, one screen at a time: how to play, who is
joining, what to explore, game length, and a final review. **Back** keeps all
answers. Names and filters are saved for next time. Optional deck filters and
**House rules** stay tucked away until needed. Keyboard users can navigate
native labelled controls; each new question receives focus, and validation
messages are announced.

## Course and topic decks

At **What shall we explore?**, choose your material. In the gallery, use
**Choose topics and courses**. Select
any combination of **Calc 1, Calc 2, Calc 3, ODE, Linear Algebra 1, and Linear
Algebra 2**, or the general collection. The selected courses form a union:
a shared theorem appears only once. The topic, level and verification filters
then narrow that collection. Shared cards are never duplicated.

**Take a look at the cards** opens the selection in another tab, keeping your
answers in place. The final review offers a reusable link for a course page. The online host uses the same filters, and guests see the
course/topic description in the lobby. Existing cumulative links still work.

The expanded collection has **284 cards**, including **53 new cards** and
**28 corrections to existing statements**. Calc 3 includes integration and
improper integrals. Individual deck counts: Calc 1 **29**, Calc 2 **32**,
Calc 3 **20**, ODE **14**, Linear Algebra 1 **6**, Linear Algebra 2 **13**.
Calc 1+2 has **52** cards; Calc 1+2+3 has **63**; Linear Algebra 1+2 has **16**.

Small decks support short games. Linear Algebra 1 alone supports two players
with a two-card target. Setup shows the minimum required and suggests a lower
target if necessary. When the selected goal is too large, the length question
sets a feasible goal and explains the change before you confirm it. The existing empty-deck rule decides games that run out
of cards: most timeline cards wins, then most tokens. No unrelated cards are
silently added to a course selection.

Course membership is a curated selection based on the supplied notes, not a
complete syllabus inventory. Historical sources and the chosen date events
are recorded for new cards; the broad collection still needs historical
review. No cards have been newly marked verified. See [the review](review/REVIEW.md)
and the [course-card inventory](review/COURSE-CARDS.csv).

The **Convex geometry** topic contains **11 cards**: nine new cards plus the
existing Minkowski and Brunn–Minkowski cards. Choose **The whole collection**
and then **Convex geometry** to use the complete topic deck. It supports two
players with a goal of up to four cards (or four players with a two-card goal).
The [geometry review](review/CONVEX-GEOMETRY.md) explains the precise versions,
date choices and recent preprint status.

## Playing

- **Online:** once GitHub Pages is switched on (see below), the game is at
  `https://<your-username>.github.io/<repository-name>/`.
- **On a laptop, no internet needed:** download the repository and double-click
  `site/index.html`.

## Playing online

Choose **Everyone on their own device**, answer the questions and select
**Create invitation link** on the review screen. The expected player count
helps size the deck; the lobby validates the actual group before starting.
Send the link to the other players (up to 6 in total);
they open it, type their name and join, and you start the game. Each player
then plays from their own device, and types their guess of the prover before
placing a card. Spelling mistakes, missing accents and given names or initials
are all fine; naming a different person is not.

How it works: the browsers connect directly to each other. Your browser runs
the game, so keep your page open while you play. If you reload it, everyone
reconnects automatically within a few seconds. A free public PeerJS server is
used only to introduce the browsers to each other. On some strict networks
(certain university or office Wi-Fi) direct connections are blocked; a home
connection or a phone hotspot usually works. Online play needs the game to be
opened from a web address (GitHub Pages), not from a file on disk.

The full rules are under **Rules** in the game. A game in progress is saved in
the browser, so closing the tab doesn’t lose it.

## Changing the cards

All cards come from `data/theorems.xlsx` (sheet *Theorems*). To change them,
edit the spreadsheet and upload it to `data/` in place of the old one. GitHub
Actions rebuilds the cards and republishes the game automatically.

- Rows marked **Drop** in the *Verified?* column are left out.
- Rows marked **Yes** or **approved** count as verified, and the setup screen
  can limit the deck to verified cards.
- Math is written in LaTeX between dollar signs, as in lecture notes:
  `If $p$ is prime, then $a^p - a$ is divisible by $p$.` For a card that is
  only a formula, `$\displaystyle ...$` gives full-size fractions. Write `\$`
  for a real dollar sign. Formulas work in the statement, theorem name and notes.
- Every formula is checked when the cards are built. A LaTeX mistake stops the
  build with the row number (in the Actions tab), and the published game stays
  as it was until the cell is fixed.
- To see how cards look, open **Browse all cards** on the start page
  (`gallery.html`): every card, front and back, with search and filters, and
  the spreadsheet row of each card.
- The *Notes / twist* column is shown to players when a card is revealed. Notes
  starting with “Twist card:” get a Twist label.
- Several provers go in *Proved by* separated by ` / `; naming any one counts.
- An optional *Also accept* column lists extra names that count when guessing
  online, separated by commas (for example `Qin` for Qin Jiushao, whose
  family name comes first).
- Years are whole numbers, negative for BC. *Year on card* is what players see
  (for example `c. 250 BC`).
- *What the year means* is displayed on the card back. Check that it agrees
  with the year, credited mathematician and precise theorem formulation.
- *Courses* uses `calc1`, `calc2`, `calc3`, `ode`, `lin1`, `lin2`, separated by
  semicolons. A card can have several tags. Blank means general collection only.
- *Course evidence* records the supporting note chapter, section or page.
  It is editorial and is not displayed during play.
- *Topics* contains finer tags separated by semicolons, such as `Power series`
  or `Stability and phase portraits`. These and *Area* supply the topic menu;
  new tags appear automatically.
- *Historical source* records the source and chosen event for the timeline
  date. Publication, lecture, correspondence and terminology dates must be
  labelled accurately. A modern formulation is not automatically a claim
  about the first proof of that exact statement.
- Keep IDs stable when correcting existing cards. Give a new theorem a new ID;
  deleting cards may make a saved game impossible to resume.

To build the cards on your own computer instead:

```
pip install openpyxl
python3 tools/build_cards.py
node tools/check_cards.cjs
```

## Tests

```
node tests/game.test.cjs
node tests/names.test.cjs
node tests/decks.test.cjs
node tests/setup.test.cjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

## Project layout

```
data/theorems.xlsx          the card list (the only file to edit for content)
tools/build_cards.py        spreadsheet → site/cards.js, with checks
tools/check_cards.cjs       checks every LaTeX formula with KaTeX
site/index.html, style.css  the page
site/game.js                the rules (pure logic, tested)
site/ui.js                  the interface (guided setup, shared screen and online)
site/setup-flow.js          setup validation and feasible game-length suggestions
site/online.js              online connections between browsers
site/gallery.html, gallery.js  the card gallery
site/math.js                LaTeX in card text, rendered with KaTeX
site/vendor/katex/          KaTeX 0.16.22 (MIT licence) with its fonts
site/vendor/peerjs.min.js   PeerJS 1.5.4 (MIT licence), for online play
site/cards.js               generated card data
tests/game.test.cjs         rule tests
tests/names.test.cjs        tests for checking typed prover names
.github/workflows/build.yml build, test and publish on every push to main
```

## Publishing with GitHub Pages

In the repository, open **Settings → Pages** and set **Source** to
**GitHub Actions**. Note that Pages for a private repository needs a paid
GitHub plan; on a free plan the repository must be public. The game can also be
hosted anywhere else by copying the `site/` folder.

## Plans

1. Printable deck: a PDF with card fronts and backs for double-sided printing.
2. Polish: sounds and statistics at the end of a game.
3. Online play that survives the host closing the page (a small server or a
   cloud database).
