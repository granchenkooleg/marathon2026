# Homework #7 (Manual QA): US11 "Guest Viewing Reservation Menu"

**For submission:** `hw7-us11-test-cases-and-defects.xlsx`. It has two sheets, "Test cases" and "Defect reports", in the course template layout, with screenshots attached to each defect. Upload it to Google Drive and open it with Google Sheets.

| # | Task | Result | File |
|---|---|---|---|
| 1 | Analyse the requirements and the Figma design | **35 findings** (9 High), questions for the PO, 9 assumptions | `01-requirements-review.md` |
| 2 | Cover the story with test cases | **30 test cases**, linked to the ACs | `02-test-cases.md`, sheet "Test cases" |
| 3 | Test the story against the app screenshot | **3 Passed, 8 Failed, 19 Not run** (a static screenshot can't show clicks, other data or other states) | `02-test-cases.md`, sheet "Test cases" |
| 4 | Defect reports | **8 defects:** 1 Major, 6 Minor, 1 Trivial | `04-defect-reports.md`, sheet "Defect reports" |
| — | Leads from the code | Where the code explains a defect | `03-leads-from-code.md` |

## Defects

| ID | Summary | Severity | Priority |
|---|---|---|---|
| BUG-01 | Dish images do not match the dishes: "Margherita Pizza" and other dishes show the same salad image | Major | Medium |
| BUG-02 | Reservation strip on the Menu page does not show the reservation date | Minor | Medium |
| BUG-03 | Dish with status "On Stop" is labelled "Out Of Stock" on the guest Menu page | Minor | Medium |
| BUG-04 | Menu opens on an extra "All dishes" tab that mixes dishes of all categories | Minor | Medium |
| BUG-05 | Menu page for a Guest shows the customer header instead of the Guest header | Minor | Medium |
| BUG-06 | Available dish card shows no availability status | Minor | Low |
| BUG-07 | "Sort by" shows "Recommended" by default instead of "Popular First" | Minor | Low |
| BUG-08 | Weight format is inconsistent: "200g", "350g" and "450 g" | Trivial | Low |

## Sources

- User story US11 (course PDF). It is quoted in full in `01-requirements-review.md`.
- Figma, frame "Placing pre-order by guest | Menu": `evidence/figma-guest-menu.png`, design notes in `evidence/figma-guest-menu-notes.png`. The screenshot is low resolution, so the small text in the design was read approximately.
- App screenshot (env P_PRD): `evidence/app-menu-screenshot.png`.
- Templates: the course Google Sheet, tabs "Test cases" and "Defect reports".

## How to read the results

- **Facts:** the story text, what the screenshots show, and the code (cited with file and line).
- **Assumptions:** A-1 to A-9 in `01-requirements-review.md`. Each test case names the assumption it depends on.
- **Two defects lean on the code:** BUG-03 (the screenshot doesn't show the dishes' real status) and BUG-07 (the screenshot doesn't show the open sort list). Each report says so in its Note.
- **Requirement conflict:** BUG-06 follows AC2, but Figma agrees with the app. The PO must decide (R-31).

## Rebuild after changes

Test cases and defects live in one script. Edit it, then run:

```bash
python3 -I qa/hw7-us11-guest-menu/tools/build_docs.py
```

It rewrites `02-test-cases.md`, `04-defect-reports.md`, the `.xlsx` and `evidence/bug-*.png`.
