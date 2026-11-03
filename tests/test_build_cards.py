"""Exercise workbook-to-card validation using rows, without rewriting an XLSX."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('build_cards', Path(__file__).parents[1] / 'tools/build_cards.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Sheet:
    def __init__(self, rows): self.rows = rows
    def iter_rows(self, values_only=True): return iter(self.rows)


class BuildCardsTests(unittest.TestCase):
    def compile(self, year=1700, courses=None, include_new=True):
        headers = ['ID', 'Theorem', 'Card front (statement)', 'Proved by', 'Year (for sorting)', 'Year on card']
        row = ['TEST', 'Test theorem', 'A statement.', 'One / Two', year, '1700']
        if include_new:
            headers += ['Courses', 'What the year means', 'Course evidence', 'Topics']
            row += [courses, 'Publication', 'Editorial evidence stays private to the workbook', 'Limits; Series; Limits']
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / 'cards.js'
            with patch.object(build, 'load_workbook', return_value={'Theorems': Sheet([headers, row])}), patch.object(build, 'TARGET', target):
                build.main()
            return json.loads(target.read_text().split('window.THEOREM_CARDS = ', 1)[1].removesuffix(';\n'))[0]

    def test_course_metadata_and_date_basis(self):
        card = self.compile(courses=' Calc2; calc3, CALC2 ')
        self.assertEqual(card['courses'], ['calc2', 'calc3'])
        self.assertEqual(card['yearKind'], 'Publication')
        self.assertEqual(card['provers'], ['One', 'Two'])
        self.assertNotIn('Course evidence', card)
        self.assertEqual(card['topics'], ['Limits', 'Series'])

    def test_additional_courses(self):
        self.assertEqual(self.compile(courses='ode;lin1;lin2')['courses'], ['ode', 'lin1', 'lin2'])

    def test_blank_courses_means_general_collection(self):
        self.assertEqual(self.compile()['courses'], [])

    def test_older_spreadsheet_still_builds(self):
        card = self.compile(include_new=False)
        self.assertEqual(card['courses'], [])
        self.assertEqual(card['yearKind'], '')

    def test_unknown_course_is_rejected(self):
        with self.assertRaisesRegex(SystemExit, 'Row 2: unknown Courses'):
            self.compile(courses='calcl')

    def test_invalid_years_are_rejected(self):
        for year in [1700.5, 'NaN', 'Infinity', 'not a year']:
            with self.subTest(year=year), self.assertRaisesRegex(SystemExit, 'not a whole year'):
                self.compile(year=year)

    def test_negative_whole_year_is_allowed(self):
        self.assertEqual(self.compile(year=-450)['year'], -450)


if __name__ == '__main__': unittest.main()
