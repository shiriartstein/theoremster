# Theoremster: guided setup and expanded decks

Prepared 3 November 2026 from repository commit
`d1dfb40dbb54d4c7539288d317c11810ededfa73`, the supplied Calc 1–3 LyX notes,
the ODE ZIP, and the two linear algebra PDFs. This includes the six-course expansion and the later
guided setup/convex geometry update. It has not been pushed to GitHub or published.

## What this package contains

- **53 actual new cards**, bringing the general collection to **284**.
  Nine are the latest convex geometry additions (T276–T284).
- **28 corrected existing statements**: the first 24 are recorded in
  `corrections.csv`; three more are in `additional-corrections.csv`, and
  the latest Minkowski clarification is in `convex-existing-edits.json`.
- A five-question setup, with friendly copy, warmer styling, Back navigation
  and a final review. The course/topic question keeps any combination of six
  courses; the gallery retains its expandable picker.
- Shared cards counted once, shareable course/topic links, live deck counts,
  and the same deck selection passed into online host settings.
- Short-game targets for small selections. Minimum deck size is now
  `players × target + 2`; the existing empty-deck winner rule is unchanged.
- One authoritative source: `data/theorems.xlsx`. The game build reads it
  directly; the JSON/CSV files in `review/` are audit snapshots, not extra
  sources that must be kept in sync during ordinary edits.

See [CONVEX-GEOMETRY.md](CONVEX-GEOMETRY.md) for the nine latest cards and
their historical date choices. All previous course counts are preserved.

## Course selections

| Selection | Cards |
|---|---:|
| Calc 1 | 29 |
| Calc 2 | 32 |
| Calc 3 | 20 |
| Calc 1 + Calc 2 | 52 |
| Calc 1 + Calc 2 + Calc 3 | 63 |
| ODE | 14 |
| Linear Algebra 1 | 6 |
| Linear Algebra 2 | 13 |
| Linear Algebra 1 + Linear Algebra 2 | 16 |

The six-course union contains 86 distinct cards. Counts do not add because
the same theorem can be discussed in several courses. The smaller Linear
Algebra 1 selection is a starter set of historically dateable results; with
two players, select a two-card target, or combine it with another course.
This is a curated game selection, not a claim to include every theorem from
every chapter.

**Calc 3 integration is included**, irrespective of the notes website’s TBA
status: Fubini, Darboux/Lebesgue criteria, change of variables, Gamma, Gaussian
integration, and the Brunn–Minkowski enrichment topic are represented. Green,
Stokes and divergence were not assumed to belong to this particular syllabus.
Lebesgue monotone convergence and Fatou were not tagged just because the
notes discuss improper integrals.

The ODE source is `BookTemplate.tex`, whose active inputs include lessons
1–8 and 11. `BookTemplate-me.tex` is a shorter variant, and the old/placeholder
lessons were not used to infer coverage. The game covers existence/uniqueness,
linear systems, stability and planar dynamics, with shared Banach,
Arzelà–Ascoli, Bolzano–Weierstrass, Euler and Jordan cards.

The Hebrew PDF headed “אלגברה לינארית 1” (Anat Amir and Lior Bary-Soroker)
is the **lin1** source; `Lin2_Master_March2023-bb.pdf`, headed “סיכומים
בלינארית 2א”, is the **lin2** source. Membership evidence uses printed page
numbers/section numbers, not the PDF filename’s apparent date. The uploaded
notes themselves are not redistributed in this package.

`COURSE-CARDS.csv` lists all 86 selected cards. For future changes, edit the
workbook’s Courses and Topics columns. A theorem may have several course
and topic tags, separated by semicolons. The filter matches any selected
course AND the chosen topic AND the level/verification settings.

## Added cards

The statements, historical source references, chosen date events, aliases,
and note locations are in the workbook. IDs are stable and start at T232.

| ID | Theorem | Courses | Date shown |
|---|---|---|---|
| T232 | Monotone convergence of real sequences | calc1 | 1872 |
| T233 | Cauchy criterion for real sequences | calc1;calc2 | 1821 |
| T234 | Nested interval theorem | calc1 | 1874 |
| T235 | Convergence of arithmetic means | calc1 | 1821 |
| T236 | Stolz–Cesàro theorem | calc1 | 1885 |
| T237 | Alternating-series test | calc1 | 1713 |
| T238 | Ratio test | calc1;calc2 | 1768 |
| T239 | Root test | calc1;calc2 | 1821 |
| T240 | Dirichlet’s test for series | calc1;calc2 | 1863 |
| T241 | Abel’s test for series | calc1;calc2 | 1826 |
| T242 | Extreme value theorem | calc1;calc2;calc3 | 1861 |
| T243 | Fermat’s stationary-point theorem | calc1;calc3 | 1679 |
| T244 | Chain rule | calc1;calc3 | 1797 |
| T245 | Darboux criterion for Riemann integrability | calc2;calc3 | 1875 |
| T246 | Uniform limits preserve continuity | calc2 | 1861 |
| T247 | Weierstrass M-test | calc2 | 1880 |
| T248 | Uniform convergence and integration | calc2 | 1865 |
| T249 | Termwise differentiation of a series | calc2 | 1861 |
| T250 | Riemann–Lebesgue lemma (Riemann case) | calc2 | 1867 |
| T251 | Arzelà–Ascoli theorem | calc2;ode | 1895 |
| T252 | Inverse function theorem | calc3 | 1877–78 |
| T253 | Implicit function theorem | calc3 | 1877–78 |
| T254 | Equality of mixed partial derivatives | calc3 | 1873 |
| T255 | Change of variables in multiple integrals | calc3 | 1841 |
| T256 | Gamma recurrence and factorial interpolation | calc3 | 1738 |
| T257 | Gaussian integral | calc3 | 1774 |
| T258 | Brunn–Minkowski inequality (convex bodies) | calc3 | 1896 |
| T259 | Picard–Lindelöf existence and uniqueness | ode | 1891 |
| T260 | Peano existence theorem | ode | 1890 |
| T261 | Grönwall’s inequality | ode | 1919 |
| T262 | Osgood uniqueness criterion | ode | 1898 |
| T263 | Liouville’s determinant formula | ode | 1838 |
| T264 | Lyapunov’s direct method | ode | 1892 |
| T265 | Stability by linearization | ode | 1892 |
| T266 | LaSalle’s invariance principle | ode | 1960 |
| T267 | Poincaré–Bendixson theorem | ode | 1901 |
| T268 | Grassmann’s dimension formula | lin1;lin2 | 1844 |
| T269 | Exchange lemma | lin1 | 1844 |
| T270 | Rank–nullity theorem | lin1;lin2 | 1884 |
| T271 | Multiplicativity of the determinant | lin1;lin2 | 1815 |
| T272 | Laplace cofactor expansion | lin1 | 1776 |
| T273 | Gram–Schmidt orthonormalization | lin2 | 1907 |
| T274 | Riesz representation (finite-dimensional case) | lin2 | 1907 |
| T275 | Spectral theorem for normal matrices | lin2 | 1909 |

## Mathematics and history

All 231 original IDs and years are preserved. New cards have sources and
explicit historical-event notes. No cards have been newly marked Verified:
that flag should require checking the mathematical statement, historical
date, credited names and accepted aliases together.

The original collection mixed first-publication claims, announcements and
traditional attributions. The revised date rule identifies the chosen event
instead of implying that every modern formulation was first proved in that
year. Some important examples:

- Dedekind/1872 dates his completeness-based treatment of monotone sequences.
- Cantor/1874 dates the published nested-interval argument, not the first use
  of the nested-interval lemma.
- Dini/1877–78 dates the continuously differentiable inverse/implicit setting.
- Jacobi/1841 dates functional determinants, not the first proof of the exact
  modern change-of-variables statement printed on the front.
- Sylvester/1884 is explicitly a **nullity-terminology** milestone, not a claim
  to have originated rank–nullity. If the game is to use only first-proof
  dates, this card should be redated after further research or dropped.
- Riesz/Fréchet 1907 dates the infinite-dimensional representation milestone;
  the playable card gives the elementary finite-dimensional real case.

For the additional existing-card corrections, Sylvester’s inertia statement
now says congruence explicitly; the fundamental theorem of algebra specifies
complex coefficients; Fubini gives a continuous-function rectangle case
appropriate for Calc 3 and explains that 1907 dates the more general theorem.

The historical sources are a documented research pass, not a complete
priority audit. Some source entries are original works, others are research
histories or original-source teaching materials. Publication versus lecture
dates, modern generalizations and ancient attributions remain review points.

## Two ODE note issues noticed while selecting cards

These are observations only; the uploaded TeX notes were not edited.

1. In `Structure/lesson5.tex`, Structural stability, the Hartman–Grobman
   statement calls the conjugating map a **diffeomorphism**. Under the stated
   hyperbolicity assumptions the standard conclusion is a **homeomorphism**;
   differentiable conjugacy needs more hypotheses. See the [theorem and proof](https://www.math.utah.edu/~treiberg/M6414HartmanGrobman.pdf). This theorem is explicitly
   marked outside the course scope there, so it was not added to the course deck.
2. In `Structure/lesson7.tex`, the opening Poincaré–Bendixson statement contains
   an unfinished “Then either” and mixes the orbit with its limit set. The game
   uses the clean standard case: a compact forward limit set in the plane
   with no equilibria is a periodic orbit.

## Remaining content review queue

This is not a completed historical audit of the broad collection. Further mathematical
scope/hypothesis checks are also needed in the broad collection, including:

| Cards | Check before marking Verified |
|---|---|
| T088, T096 | Divergence/Green: domain regularity, differentiability, orientation and the actual integral identity |
| T094, T095, T112 | Eisenstein, Galois solvability, Sylow: base field and algebraic hypotheses; fix a prime for Sylow conjugacy |
| T116 | Cauchy–Kovalevskaya: analytic data and noncharacteristic initial surface |
| T123, T125, T126 | Hairy ball: dimension; Morera: domain/triangles; Burnside: finite group/action |
| T129, T137, T138 | Recurrence: finite invariant measure; Baire: nonempty complete setting; Pick: simple lattice polygon |
| T145, T151 | Vitali: precise measure claim; Riesz–Fischer: which formulation |
| T158, T165, T166 | Ostrowski: nontrivial absolute values; Menger: adjacent-vertex exception; uniform boundedness: Banach domain |
| T168, T173, T175 | Minimax: finite games; ergodic theorem: precise setting; incompleteness: effective axiomatization and sufficient arithmetic |
| T186, T187, T207 | Stone–Weierstrass now narrowed to the real case; Gödel/Cohen consistency statements still need conditional formulations |
| T202, T212, T218, T219, T222, T227 | Topological versus smooth Poincaré; Weil conjectures setting; Faltings field/curve conditions; Bieberbach normalization; Catalan integer bounds; Mirzakhani surface type |


## Install once, then update the spreadsheet

1. Extract the new ZIP. Open `Theoremster-update/site/index.html` to try it.
2. Copy the contents of `Theoremster-update` into the existing repository,
   replacing matching files. Include `.github/workflows/build.yml`; it may be
   hidden by your file browser. Preserve your repository’s `.git` directory.
3. Commit/upload those files to the repository’s `main` branch when ready to
   publish. The existing GitHub Actions workflow rebuilds and deploys Pages.
   Upload the extracted files, not the ZIP as a single file.
4. After this one-time code installation, edit and replace only
   `data/theorems.xlsx` for ordinary content updates. GitHub Actions regenerates
   `site/cards.js`. Do not edit the generated JavaScript or audit CSV instead.

For a static server, the contents of `site/` are the playable website. The
Excel source and Python tools are for maintaining it, not for the web server.

## Validation

- All 425 LaTeX expressions on 275 cards pass KaTeX parsing.
- 20 game-rule tests, 702 name checks and seven workbook-compiler tests pass.
- Deck tests cover arbitrary course unions, no duplicate cards, topic
  intersection, empty selections, legacy links, URL round trips and actual
  short-game startup for every course.
- Workbook checks preserve original IDs/years, freeze panes and original
  values except the documented edits; filters, verification validation,
  conditional formatting and distribution formulas include the new rows.
- Browser checks cover arbitrary course combinations, Calc 3 integration,
  empty-selection blocking, Linear Algebra 1 short-game placement/reveal and
  gallery filtering/link transfer.
- Live PeerJS multiplayer has not been exercised; the online selection uses
  the same filter function and the host passes the selected course IDs.

Formula parsing checks typography, not the truth of a theorem or date.
