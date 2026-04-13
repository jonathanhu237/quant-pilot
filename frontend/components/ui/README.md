# UI Primitives

- Rule: text color belongs on the `<Text>` node itself, never on a wrapper `View`.
- `Badge`: semantic pill variants for positive / negative / neutral / accent statuses.
- `Button`: shared tappable chrome for filled, secondary, ghost, and destructive actions.
- `Card`: shared surface container with semantic radius and optional padding.
- `Divider`: one-line hairline separator.
- `ListRow`: shared leading/trailing row primitive with optional press behavior.
- `Typography`: `Display`, `Title`, `Heading`, `Body`, `Label`, `Caption` text presets.
- `Input`: shared field chrome for text entry.

## Adding Variants

- Extend the primitive's variant map in the component file.
- Keep call sites on semantic props such as `variant="neutral"` rather than inlining Tailwind classes.

## When To Extract

- If the same visual pattern appears in two or more places, extract it into a primitive or a new primitive variant.
