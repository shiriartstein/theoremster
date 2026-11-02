#!/usr/bin/env python3
"""Add a content fingerprint to every local script and stylesheet link in site/*.html.

  <script src="ui.js">  becomes  <script src="ui.js?v=3f2a91c0d4">

GitHub Pages lets browsers reuse old copies of files for up to 10 minutes. With a
fingerprint, a changed file gets a new address, so players see a new version as
soon as it is published, while unchanged files stay cached. Run by the workflow
after building the cards; running it again just refreshes the fingerprints.
"""
import hashlib
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / 'site'
LINK = re.compile(r'(?P<attr>\b(?:src|href))="(?P<path>[^"#?:]+\.(?:js|css))(?:\?v=[0-9a-f]+)?"')


def fingerprint(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamp(page):
    text = page.read_text(encoding='utf-8')

    def replace(match):
        target = (page.parent / match['path']).resolve()
        if not target.is_file() or SITE not in target.parents:
            return match[0]
        return f'{match["attr"]}="{match["path"]}?v={fingerprint(target)}"'

    stamped, count = LINK.subn(replace, text)
    page.write_text(stamped, encoding='utf-8')
    return count


if __name__ == '__main__':
    for page in sorted(SITE.glob('*.html')):
        print(f'{page.name}: {stamp(page)} links fingerprinted')
