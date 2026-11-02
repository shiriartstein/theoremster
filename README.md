# Theorem Timeline

A card game about the history of mathematics, played on one shared screen.
Each card is a theorem. Place it in your timeline by the year it was proved,
and name the person who proved it to earn a ∎. Inspired by the music game Hitster.

## Playing

- **Online:** once GitHub Pages is switched on (see below), the game is at
  `https://<your-username>.github.io/<repository-name>/`.
- **On a laptop, no internet needed:** download the repository and double-click
  `site/index.html`.

## Playing online

On the start page, type your name under **Play online** and choose
**Create a game link**. Send the link to the other players (up to 6 in total);
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
```

## Project layout

```
data/theorems.xlsx          the card list (the only file to edit for content)
tools/build_cards.py        spreadsheet → site/cards.js, with checks
tools/check_cards.cjs       checks every LaTeX formula with KaTeX
site/index.html, style.css  the page
site/game.js                the rules (pure logic, tested)
site/ui.js                  the interface (shared screen and online)
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
2. Polish: sounds, more deck filters (by area), statistics at the end of a game.
3. Online play that survives the host closing the page (a small server or a
   cloud database).
