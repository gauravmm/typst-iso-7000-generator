#import "src/lib.typ": iso-7000

= ISO 7000 Symbols for Typst

This package provides access to ISO 7000 graphical symbols for use in Typst documents. All symbols are sourced from Wikimedia Commons and made available under their respective open licenses.

== Installation

Install this package using Typst's package manager or by including it locally in your project.

== Usage

The package exports a single function `iso-7000()` that displays an ISO 7000 symbol by its reference number:

```typst
#import "@local/typst-iso-7000:0.1.0": iso-7000

// Basic usage
#iso-7000("0222")

// With size options
#iso-7000("0222", width: 2cm)
#iso-7000("3884", height: 1em)

// In a sentence
Click #iso-7000("0222", height: 1em) to continue.
```

== Examples

Here are some example symbols:

#grid(
  columns: 4,
  gutter: 1em,
  iso-7000("0222", width: 2cm),
  iso-7000("0230", width: 2cm),
  iso-7000("0235", width: 2cm),
  iso-7000("0247", width: 2cm),
)

== Available Symbols

#let icons = json("sources/icons.json")

#table(
  columns: (auto, auto, 2fr, 1.5fr, 1fr, auto),
  align: (center, center, left, left, left, left, center),
  stroke: 0.5pt,
  inset: 6pt,

  // Header
  table.header([*Icon*], [*Ref*], [*Title*], [*User*], [*License*], [*Link*]),

  // Data rows
  ..icons
    .map(icon => (
      [#iso-7000(icon.reference, height: 1.5em)],
      [#icon.reference],
      [#icon.title],
      [#icon.user],
      if icon.license_url != "" [
        #link(icon.license_url)[#icon.license]
      ] else [
        #icon.license
      ],
      [#link(icon.description_url)[View]],
    ))
    .flatten(),
)

== License

All symbols are sourced from Wikimedia Commons and retain their original licenses as indicated in the table above.

== Credits

- ISO 7000 symbols are created and maintained by various contributors on Wikimedia Commons
- This package was created to make these symbols easily accessible in Typst documents
