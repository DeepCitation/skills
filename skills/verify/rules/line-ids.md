# Line IDs and Page Numbers

## pageNumber is needed for accurate verification

Every document citation should include `pageNumber`. Extract it from the `<page_number_N_index_I>` tag enclosing your cited text — use N (the page number), not I (the index).

**Always take the page number from the tag name itself — never from any page number text visible inside the document.** Printed page numbers in the content (e.g. "Page 3", roman numerals in a TOC) can differ from the tag's N value when documents are concatenated or start at a non-zero offset. The tag is the authoritative source.

Without `pageNumber`, the API cannot pinpoint the citation precisely — verification becomes imprecise and cannot be scored as `verified`. (Round 2 QA: 39/39 citations were unscoreable because pageNumber was missing.)

---

`lineIds` and `pageNumber` come from the `deepTextPromptPortion` returned by the prepare step.

## How line IDs work

The `deepTextPromptPortion` uses `<line id="N">` tags to mark lines. These IDs are sequential. Not every line has an explicit tag — untagged lines fall between the tagged IDs on either side, and you can derive their ID by counting. Always use sequential IDs derived from the surrounding `<line id="N">` values — do not invent arbitrary IDs.

## Example

```
<page_number_1_index_0>
<line id="1">Company Overview</line>
Founded in 2015 as a healthcare technology startup   ← untagged
Headquarters: San Francisco, CA                      ← untagged
<line id="4">Total employees: 1,200</line>
...
<page_number_2_index_1>
<line id="20">Revenue grew 45% year-over-year to $2.3B</line>
Operating margin improved to 18.5%                   ← untagged
<line id="22">Net income: $415M, up from $290M</line>
```

For "Founded in 2015": it is the second line on the page, so `lineIds: [2]` (one after `<line id="1">`).

For "Operating margin improved to 18.5%": it is the line after `<line id="20">`, so `lineIds: [21]`.

## How to find the right lineId

1. Read the `deepTextPromptPortion` from `.deepcitation/prepare-*.json`
2. Search for your citation text
3. Derive the line's ID by counting from the nearest `<line id="N">` tag. If the text spans multiple lines, include all of their IDs.
4. For `pageNumber`, use N from the enclosing `<page_number_N_index_I>` tag (use N, not I)

## Why this matters

The line IDs encode spatial position (columns, tables). Providing an incorrect ID causes the API to fall back to page-level search, resulting in an imprecise match that cannot be scored as `verified`.
