"""Rebuild the two offline workbench UI fonts and their complementary CSS faces.

Only asset maintainers need Python, fonttools==4.69.1, brotli==1.2.1 and
uharfbuzz==0.57.0. Run this file from any directory. Production builds use
the checked-in outputs. Add new common characters to ui-font-characters.txt.
"""

from itertools import groupby
from pathlib import Path
from tempfile import TemporaryDirectory

from fontTools import subset
from fontTools.ttLib import TTFont


WORKBENCH = Path(__file__).resolve().parents[1]
FONTS = WORKBENCH / "public" / "fonts"
CHARACTERS = Path(__file__).with_name("ui-font-characters.txt")
MAX_CODEPOINT = 0x10FFFF
STYLES = ("Sans", "Serif")


def intervals(points):
    """Return sorted inclusive intervals for a set of Unicode codepoints."""
    for _, group in groupby(enumerate(sorted(points)), lambda item: item[1] - item[0]):
        codes = [value for _, value in group]
        yield codes[0], codes[-1]


def remaining_ranges(common):
    cursor = 0
    for first, last in common:
        if cursor < first:
            yield cursor, first - 1
        cursor = last + 1
    if cursor <= MAX_CODEPOINT:
        yield cursor, MAX_CODEPOINT


def face(style, filename, coverage):
    ranges = [
        f"U+{a:04X}" if a == b else f"U+{a:04X}-{b:04X}"
        for a, b in coverage
    ]
    # Keep each generated source line short enough to inspect a range change.
    lines = [", ".join(ranges[i:i + 8]) for i in range(0, len(ranges), 8)]
    unicode_range = ",\n    ".join(lines)
    return f'''@font-face {{
  font-family: "Noto {style} SC";
  src: url("/fonts/{filename}") format("woff2");
  font-weight: 400 700;
  font-style: normal;
  font-display: swap;
  unicode-range:
    {unicode_range};
}}'''


def build_font(style, points, destination):
    with TTFont(FONTS / f"Noto{style}SC-VF.woff2", recalcTimestamp=False) as font:
        missing = points.difference(font.getBestCmap())
        if missing:
            raise ValueError(f"{style} source lacks selected codepoints: {sorted(missing)}")
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.name_languages = ["*"]
        options.notdef_outline = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(unicodes=points)
        subsetter.subset(font)
        # Rename derivative families and instances while preserving copyright,
        # license, and style records from the full source font.
        names = font["name"]
        for record in list(names.names):
            if record.nameID in {1, 3, 4, 6, 16, 21, 25} or record.nameID >= 256:
                original = record.toUnicode()
                renamed = original.replace(f"Noto {style} SC", f"YunQi UI {style}").replace(
                    f"Noto{style}SC", f"YunQiUI{style}"
                )
                if original != renamed:
                    names.setName(renamed, record.nameID, record.platformID, record.platEncID, record.langID)
        font.save(destination)


def write_stylesheet(path, points):
    common = list(intervals(points))
    rest = list(remaining_ranges(common))
    blocks = ["/* Generated from scripts/ui-font-characters.txt by scripts/build-ui-fonts.py. */"]
    for style in STYLES:
        blocks.append(face(style, f"Noto{style}SC-VF.woff2", rest))
        blocks.append(face(style, f"YunQiUI{style}-VF.woff2", common))
    path.write_text("\n\n".join(blocks) + "\n", encoding="utf-8", newline="\n")


def main():
    text = "".join(CHARACTERS.read_text(encoding="utf-8").splitlines())
    points = set(range(0x20, 0x7F)) | set(map(ord, text))
    with TemporaryDirectory(dir=WORKBENCH) as temporary:
        stage = Path(temporary)
        for style in STYLES:
            build_font(style, points, stage / f"YunQiUI{style}-VF.woff2")
        write_stylesheet(stage / "fonts.css", points)
        for style in STYLES:
            name = f"YunQiUI{style}-VF.woff2"
            (stage / name).replace(FONTS / name)
        (stage / "fonts.css").replace(WORKBENCH / "src" / "styles" / "fonts.css")
    print(f"Generated both UI fonts for {len(points)} codepoints.")


if __name__ == "__main__":
    main()
