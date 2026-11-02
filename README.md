# Theorem Timeline

A card game about the history of mathematics, played on one shared screen.
Each card is a theorem. Place it in your timeline by the year it was proved,
and name the person who proved it to earn a ∎. Inspired by the music game Hitster.

## Playing

- **Online:** once GitHub Pages is switched on (see below), the game is at
  `https://<your-username>.github.io/<repository-name>/`.
- **On a laptop, no internet needed:** download the repository and double-click
  `site/index.html`.

The full rules are under **Rules** in the game. A game in progress is saved in
the browser, so closing the tab doesn’t lose it.

## Changing the cards

All cards come from `data/theorems.xlsx` (sheet *Theorems*). To change them,
edit the spreadsheet and upload it to `data/` in place of the old one. GitHub
Actions rebuilds the cards and republishes the game automatically.

- Rows marked **Drop** in the *Verified?* column are left out.
- Rows marked **Yes** count as verified, and the setup screen can limit the deck
  to verified cards.
- The *Notes / twist* column is shown to players when a card is revealed. Notes
  starting with “Twist card:” get a Twist label.
- Several provers go in *Proved by* separated by ` / `; naming any one counts.
- Years are whole numbers, negative for BC. *Year on card* is what players see
  (for example `c. 250 BC`).

To build the cards on your own computer instead:

```
pip install openpyxl
python3 tools/build_cards.py
```

## Tests

```
node tests/game.test.cjs
```

## Project layout

```
data/theorems.xlsx          the card list (the only file to edit for content)
tools/build_cards.py        spreadsheet → site/cards.js, with checks
site/index.html, style.css  the page
site/game.js                the rules (pure logic, tested)
site/ui.js                  the shared-screen interface
site/cards.js               generated card data
tests/game.test.cjs         rule tests
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
3. Possibly online play, with each player on their own phone.
