/*
 * Theorem Timeline: math in card text.
 * Text may contain LaTeX between $...$ (inline) or $$...$$ (display); write \$ for a
 * literal dollar sign. In the browser, render(text) returns typeset content using
 * KaTeX (vendor/katex). In Node, split() is used by tools/check_cards.cjs.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TimelineMath = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Split text into [{ math: false, text } | { math: true, tex, display }]. Throws on an unmatched $. */
  function split(text) {
    const parts = [];
    let plain = '', i = 0;
    const source = String(text || '');
    while (i < source.length) {
      const ch = source[i];
      if (ch === '\\' && source[i + 1] === '$') { plain += '$'; i += 2; continue; }
      if (ch !== '$') { plain += ch; i++; continue; }
      const display = source[i + 1] === '$';
      const open = display ? 2 : 1;
      let j = i + open;
      while (j < source.length && !(source[j] === '$' && source[j - 1] !== '\\')) j++;
      if (j >= source.length || (display && source[j + 1] !== '$')) {
        throw new Error(`a ${display ? '$$' : '$'} is never closed`);
      }
      const tex = source.slice(i + open, j).trim();
      if (!tex) throw new Error('empty formula between dollar signs');
      if (plain) { parts.push({ math: false, text: plain }); plain = ''; }
      parts.push({ math: true, tex, display });
      i = j + open;
    }
    if (plain) parts.push({ math: false, text: plain });
    return parts;
  }

  /** Text with the dollar signs removed, for tooltips and screen-reader labels. */
  function plain(text) {
    try { return split(text).map(p => p.math ? p.tex : p.text).join(''); }
    catch (e) { return String(text || ''); }
  }

  /** Browser only: a DocumentFragment with formulas typeset (or shown as LaTeX if KaTeX is missing). */
  function render(text) {
    const fragment = document.createDocumentFragment();
    let parts;
    try { parts = split(text); } catch (e) { fragment.append(String(text || '')); return fragment; }
    for (const part of parts) {
      if (!part.math) { fragment.append(part.text); continue; }
      const span = document.createElement('span');
      span.className = part.display ? 'math display' : 'math';
      if (window.katex) {
        try { window.katex.render(part.tex, span, { displayMode: part.display, throwOnError: false, output: 'htmlAndMathml' }); }
        catch (e) { span.textContent = part.tex; }
      } else span.textContent = part.tex;
      fragment.append(span);
    }
    return fragment;
  }

  return { split, plain, render };
});
