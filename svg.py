import logging
from pathlib import Path
from lxml import etree


def cleanup_svg(path: Path, output: Path):
    tree = etree.parse(str(path))
    # Strip out all comments
    etree.strip_elements(tree, etree.Comment, with_tail=False)

    root = tree.getroot()

    # Remove all elements and attributes with non-svg namespaces
    for elem in root.xpath(".|.//*"):  # type: ignore
        # QName(elem).namespace returns the URI
        if etree.QName(elem).namespace != "http://www.w3.org/2000/svg" or etree.QName(
            elem
        ).localname in ("defs",):
            parent = elem.getparent()
            if parent is not None:
                parent.remove(elem)
            continue

        for attr_name in list(elem.attrib.keys()):
            # Remove namespaced attributes or -inkscape prefixed attributes
            if "}" in attr_name or attr_name.startswith("-inkscape"):
                del elem.attrib[attr_name]

        # Clean up -inkscape CSS properties from style attribute
        if "style" in elem.attrib:
            style = elem.attrib["style"]
            # Remove -inkscape-* properties from CSS
            style_parts = [
                part.strip()
                for part in style.split(";")
                if part.strip() and not part.strip().startswith("-inkscape")
            ]
            if style_parts:
                elem.attrib["style"] = "; ".join(style_parts)
            else:
                del elem.attrib["style"]

    # Clean up unused namespace declarations
    etree.cleanup_namespaces(tree)

    # Remove gray stroke elements using XPath
    # Remove <defs> elements
    for elem in root.xpath(".//defs"):  # type: ignore
        elem.getparent().remove(elem)

    # Remove <g> and <path> elements with gray strokes (#999 or #999999)
    for elem_type in ("g", "path"):
        for elem in root.xpath(
            f".//*[local-name()='{elem_type}'][contains(@stroke, '#999')]"
        ):  # type: ignore
            elem.getparent().remove(elem)

        # Remove <g> and <path> elements with #999 in style attribute
        for elem in root.xpath(
            f".//*[local-name()='{elem_type}'][contains(@style, '#999')]"
        ):  # type: ignore
            elem.getparent().remove(elem)

    # Handle viewBox and root size (width/height)
    width = root.get("width")
    height = root.get("height")
    viewBox = root.get("viewBox")

    if not (width and height):
        if not viewBox:
            # Case 4: neither is set → report error and set defaults
            logging.error(
                f"{path}: Neither viewBox nor size attributes found, skipping..."
            )
            return
        else:
            # Case 1: viewBox set, but not root size → do nothing
            pass
    else:
        if not viewBox:
            # Case 2: root size set, but not viewBox → set viewBox, clear root size
            try:
                # Parse numeric values from width/height (strip units like px, mm, etc.)
                root.set("viewBox", f"0 0 {float(width)} {float(height)}")
            except ValueError:
                logging.error(
                    f"{path}: Could not parse width/height ({width}, {height}), skipping..."
                )
                return
        else:
            # Case 3: both are set → keep viewBox, clear root size
            pass

        del root.attrib["width"]
        del root.attrib["height"]

    # Convert tree to string for scour processing
    svg_data = etree.tostring(
        tree, xml_declaration=True, encoding="UTF-8", pretty_print=False
    ).decode("utf-8")
    output.write_text(svg_data)
