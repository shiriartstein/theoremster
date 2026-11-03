# Guided setup verification — 3 November 2026

The five questions replace the old all-at-once settings screen. Answers stay
in browser storage; Back preserves them. New questions receive keyboard
focus and validation text is announced. The final review shows the chosen
mode, players, filters, card count, goal and house rules.

Verified in the browser:
- Shared-screen flow, duplicate-name error, empty-course error and Back.
- Six-card Linear Algebra 1 deck, oversized-goal error and explicit target reduction.
- Final review, game creation, placement, reveal, scoring and game completion.
- Reload and resume of an unfinished local game.
- Online host name, expected player count, geometry selection and invitation creation.
- Connection service reports Ready for players. A second tab reached the host
  discovery stage, but this environment did not establish the direct WebRTC
  connection. A complete online round was therefore not verified.
- Geometry gallery: 11 cards; rendered long Alexandrov–Fenchel formula without
  a horizontal page overflow. No KaTeX errors in that view.
- Phone-width setup and course selection in a 390px iframe (375px content
  width with scrollbar): no horizontal overflow. Temporary QA page removed.

Automated checks:
- 20 game-rule tests; 728 accepted/rejected name checks.
- Course/topic filter tests, including cumulative and arbitrary course unions.
- Guided-setup validation and feasible-target tests.
- Seven Python card-compiler tests.
- All 475 formulas across 284 cards render with KaTeX.
- JavaScript syntax checks and git diff whitespace check.
- Workbook: prior 275 IDs/years retained, nine records added, original three
  sheets and C2 freeze pane retained, table extended to A1:R285, distribution
  formulas extended and cached total 284. The existing card changes are
  limited to Minkowski's statement (C134) and topic tags (P134).

This is a local ZIP delivery. The remote GitHub repository was not changed.
