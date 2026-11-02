#!/usr/bin/env python3
"""Build the HW7 (US11) test cases and defect reports.

Single source of truth for test cases and defects. Writes:
  02-test-cases.md, 04-defect-reports.md          readable copies
  hw7-us11-qa.xlsx            tabs: Requirements review (from 01-requirements-review.md),
                                                  Test cases, Defect reports (course template layout)
  evidence/bug-XX.png                             annotated screenshot crops

Run:  python3 -I qa/hw7-us11-guest-menu/tools/build_docs.py
"""
from collections import Counter
from pathlib import Path

from openpyxl import Workbook
from openpyxl.cell.rich_text import CellRichText, TextBlock
from openpyxl.cell.text import InlineFont
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "evidence"
APP_SHOT = EVIDENCE / "app-menu-screenshot.png"
XLSX = ROOT / "hw7-us11-qa.xlsx"

FIGMA_FRAME = 'Figma, frame "Placing pre-order by guest | Menu"'
ENV = "P_PRD\n(d28jftogiwtein.cloudfront.net, Microsoft Edge)"

JOINED = [
    'Reservation status is "Reserved", group pre-order status is "Open".',
    "Guest has joined the group session via the invite link (US_G10).",
]

COVERAGE_LABELS = {
    "pre": "Pre-conditions",
    "desc": "Description: full menu",
    "ac1": "AC1: categories",
    "ac2": "AC2: dish card",
    "ac3": "AC3: add to subcart",
    "ac4": "AC4: unavailable dishes",
    "ac5": "AC5: current data",
    "figma": "Figma only (not in the story)",
    "states": "Missing ACs: loading / empty / error (R-27)",
    "nfr": "Missing NFRs (R-28)",
}

# ---------------------------------------------------------------------------
# Test cases. steps = [(step, expected result)]; status from the app screenshot.
# ---------------------------------------------------------------------------
TEST_CASES = [
    # --- Pre-conditions ---
    dict(key="menu_opens", covers=["pre", "ac1"],
         title="Verify that the Menu page is shown to a Guest who joined the group session",
         pre=JOINED,
         steps=[("Open the invite link.",
                 "Menu page is opened: reservation strip, category tabs and dish cards are shown.")],
         status="Passed", basis="—"),
    dict(key="name_required", covers=["pre"],
         title="Verify that the menu cannot be used before the Guest enters a name",
         pre=['Reservation status is "Reserved", group pre-order status is "Open".',
              "Guest opens the invite link for the first time."],
         steps=[("Open the invite link.", '"You\'re Invited!" pop-up window is opened over the menu.'),
                ("Press Esc.", "The pop-up window stays open."),
                ("Press Tab several times.", "Focus stays inside the pop-up window. No [Pre-Order] button can be reached.")],
         status="Not run", basis="Pre-condition 1"),
    dict(key="group_submitted", covers=["pre"],
         title="Verify that the Guest cannot add dishes after the Owner submitted the group pre-order",
         pre=JOINED + ['The Owner has submitted the group pre-order (group status = "Submitted").'],
         steps=[("Reload the Menu page.", "A message says that the group pre-order is already submitted."),
                ("Click [Pre-Order] on an available dish.", "The dish is not added to the cart.")],
         status="Not run", basis="A-2; R-06, R-07, R-08"),
    dict(key="reservation_cancelled", covers=["pre"],
         title="Verify that the Guest sees a message when the reservation was cancelled",
         pre=JOINED + ['The Owner has cancelled the reservation (status = "Cancelled").'],
         steps=[("Reload the Menu page.",
                 'Static page with the message "This pre-order session has expired or is no longer active." is opened.')],
         status="Not run", basis="A-2; R-06, R-07, R-08; message from the course template"),
    # --- Page and design ---
    dict(key="header", covers=["figma"],
         title="Verify that the Guest variant of the header is shown on the Menu page",
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Check the header.",
                 f'Header matches the Guest variant header ({FIGMA_FRAME}): logo on the left, cart icon on the right. '
                 'No "Main page", "Book a Table", "Reservations" links, no profile icon, no [Sign In] button.')],
         status="Failed", bugs=["header"], basis="R-33"),
    dict(key="strip", covers=["figma"],
         title="Verify that the reservation strip shows the address, table, date and time",
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Read the green reservation strip.",
                 'Text: "You are making a pre-order for the reservation: <address>, Table <number>, <date>, '
                 f'<start time> - <end time>" ({FIGMA_FRAME}). All values match the reservation.')],
         status="Failed", bugs=["strip_date"], basis="R-02, R-33"),
    # --- AC1 ---
    dict(key="tabs", covers=["ac1", "figma"],
         title="Verify that dishes are grouped into category tabs",
         pre=JOINED + ["The location has dishes in all three categories."],
         steps=[("Open the invite link.", f'Menu page is opened. The "Appetizers" tab is selected ({FIGMA_FRAME}).'),
                ("Check the tabs.", 'Tabs "Appetizers", "Main Courses", "Desserts" are shown in this order.'),
                ("Click each tab.", "Each tab shows only the dishes of its category.")],
         status="Failed", bugs=["all_dishes"], basis="A-3; R-09, R-10"),
    dict(key="full_menu", covers=["desc", "ac1"],
         title="Verify that the menu shows all dishes of the reservation's location and only them",
         pre=JOINED + ["Admin panel or API access to the location's dish list."],
         steps=[("Open the invite link and go through all tabs.",
                 "All dishes of the location are shown, including unavailable ones."),
                ("Compare the dishes with the location's dish list.",
                 "The lists match. No dishes of other locations are shown.")],
         status="Not run", basis="A-1; R-05"),
    dict(key="empty_category", covers=["ac1"],
         title="Verify that a category with no dishes is not shown",
         pre=JOINED + ["The location has no desserts."],
         steps=[("Open the invite link.", 'Menu page is opened. There is no "Desserts" tab.')],
         status="Not run", basis="A-3; R-09"),
    dict(key="sort", covers=["figma"],
         title='Verify that "Sort by" has the default value and options from Figma',
         pre=JOINED,
         steps=[("Open the invite link.", f'"Sort by" shows "Popular First" ({FIGMA_FRAME}).'),
                ('Open the "Sort by" dropdown.',
                 'Options: "Popular First", "Newest First", "Price Low to High", "Price High to Low".')],
         status="Failed", bugs=["sort"], basis="R-29, R-32"),
    # --- AC2 ---
    dict(key="card_layout", covers=["ac2", "figma"],
         title="Verify that each dish card shows the image, name, price and weight as in Figma",
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Check every dish card.",
                 f"Image at the top; dish name on the left; price (green) on the right; weight under the price ({FIGMA_FRAME}).")],
         status="Passed", basis="—"),
    dict(key="images", covers=["ac2"],
         title="Verify that each dish shows its own image",
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Compare each dish image with the dish name.",
                 'Each image shows its dish (e.g., "Margherita Pizza" shows a pizza). Different dishes have different images.')],
         status="Failed", bugs=["images"], basis="—"),
    dict(key="price", covers=["ac2"],
         title="Verify that prices are shown with the currency sign and two decimals",
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Check the price on every card.", 'Each price has the "$" sign and two decimals, e.g. "$12.00".')],
         status="Passed", basis="A-6; R-12, R-35"),
    dict(key="weight", covers=["ac2", "figma"],
         title='Verify that the serving size is shown in grams in the format "<number> g"',
         pre=JOINED,
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Check the weight on every card.", f'Weight is a number, a space and "g", e.g. "450 g" ({FIGMA_FRAME}).')],
         status="Failed", bugs=["weight"], basis="A-6; R-13"),
    dict(key="available_status", covers=["ac2"],
         title="Verify that an available dish shows its availability status",
         pre=JOINED + ["At least one dish is available."],
         steps=[("Open the invite link.", "Menu page is opened."),
                ("Check the card of an available dish.",
                 'The card shows the status "Available" (AC2: each menu item displays its current availability status).')],
         status="Failed", bugs=["no_status"], basis="A-9; R-15, R-31"),
    dict(key="no_image", covers=["ac2"],
         title="Verify that a dish without an image shows a placeholder",
         pre=JOINED + ["A dish has no image in the admin panel."],
         steps=[("Open the invite link and find the dish.",
                 "A placeholder image is shown, not a broken-image icon. The card layout is the same as other cards.")],
         status="Not run", basis="R-14"),
    dict(key="long_name", covers=["ac2"],
         title="Verify that a long dish name does not break the card",
         pre=JOINED + ["A dish name is longer than 60 characters."],
         steps=[("Open the invite link at 1440 px width and find the dish.",
                 "The name wraps or ends with \"…\". Price, weight and [Pre-Order] stay visible and aligned."),
                ("Repeat at 375 px width.", "Same as step 1.")],
         status="Not run", basis="—"),
    # --- AC3 ---
    dict(key="add", covers=["ac3"],
         title="Verify that the Guest can add an available dish to the personal subcart",
         pre=JOINED + ["The Guest's cart is empty."],
         steps=[("Click [Pre-Order] on an available dish.", 'Confirmation is shown, e.g. "<dish> added to your pre-order".'),
                ("Click the cart icon.", "The cart has the dish: quantity 1, its price, total = the price.")],
         status="Not run", basis="A-5, A-8; R-20, R-21"),
    dict(key="add_twice", covers=["ac3"],
         title="Verify that adding the same dish twice increases the quantity",
         pre=JOINED + ["The Guest's cart is empty."],
         steps=[("Click [Pre-Order] on the same available dish two times.", "Confirmation is shown each time."),
                ("Click the cart icon.", "The cart has one line for the dish with quantity 2. Total = 2 × price.")],
         status="Not run", basis="A-5; R-20"),
    dict(key="personal", covers=["ac3"],
         title="Verify that each Guest's subcart is personal",
         pre=["Two Guests joined the same group session in two browsers. Both carts are empty."],
         steps=[("Guest 1: click [Pre-Order] on an available dish.", "The dish is added to Guest 1's cart."),
                ("Guest 2: click the cart icon.", "Guest 2's cart is empty."),
                ("Guest 1: click the cart icon.", "Guest 1's cart has the dish.")],
         status="Not run", basis="R-18"),
    # --- AC4 ---
    dict(key="on_stop_label", covers=["ac2", "ac4"],
         title='Verify that a dish with status "On Stop" is clearly marked as unavailable',
         pre=JOINED + ['Admin has set a dish status to "On Stop".'],
         steps=[("Open the invite link and find the dish.",
                 'The card is greyed out, has the label "On Stop" (text, not only colour), [Pre-Order] is disabled.')],
         status="Failed", bugs=["on_stop"], basis="R-16, R-23, R-30"),
    dict(key="on_stop_add", covers=["ac4"],
         title='Verify that a dish with status "On Stop" cannot be added to the cart',
         pre=JOINED + ['Admin has set a dish status to "On Stop". The Guest\'s cart is empty.'],
         steps=[("Click [Pre-Order] on the On Stop dish.", "Nothing happens. No confirmation."),
                ("Click the card of the On Stop dish.", "Nothing happens."),
                ("Click the cart icon.", "The cart is empty.")],
         status="Not run", basis="R-23"),
    dict(key="out_of_stock", covers=["ac2", "ac4"],
         title='Verify that a dish with status "Out of Stock" is marked and cannot be added',
         pre=JOINED + ['Admin has set a dish status to "Out of Stock". The Guest\'s cart is empty.'],
         steps=[("Open the invite link and find the dish.",
                 'The card is greyed out, has the label "Out of Stock", [Pre-Order] is disabled.'),
                ("Click [Pre-Order] on the dish, then open the cart.", "The cart is empty.")],
         status="Not run", basis="A-4; R-16"),
    # --- AC5 ---
    dict(key="reload", covers=["ac5"],
         title="Verify that a dish status change is shown after the page is reloaded",
         pre=JOINED + ["The Menu page is open. A dish is available."],
         steps=[('Admin sets the dish to "On Stop". The Guest reloads the page.',
                 "The dish is shown as On Stop and cannot be added."),
                ('Admin sets the dish back to "Available". The Guest reloads the page.',
                 "The dish is available and can be added.")],
         status="Not run", basis="A-7; R-26"),
    dict(key="stale_add", covers=["ac3", "ac4", "ac5"],
         title="Verify that a dish that went On Stop after the menu loaded cannot be added",
         pre=JOINED + ["The Menu page is open. A dish is available. The Guest's cart is empty."],
         steps=[('Admin sets the dish to "On Stop". Without reloading, the Guest clicks [Pre-Order] on it.',
                 "An error message says the dish is no longer available. The message has no internal IDs."),
                ("Click the cart icon.", "The cart is empty.")],
         status="Not run", basis="A-8; R-22"),
    # --- States and non-functional ---
    dict(key="loading", covers=["states"],
         title="Verify that a loading state is shown while the menu loads",
         pre=JOINED + ['DevTools network throttling is "Slow 3G".'],
         steps=[("Reload the Menu page.",
                 'A loading indicator is shown until the dishes appear. No error or "empty menu" message flashes.')],
         status="Not run", basis="R-27"),
    dict(key="empty_menu", covers=["states"],
         title="Verify that an empty menu shows a message",
         pre=JOINED + ["The location has no dishes."],
         steps=[("Open the invite link.", "A message says the menu is empty. The page layout is not broken.")],
         status="Not run", basis="R-27"),
    dict(key="load_error", covers=["states"],
         title="Verify that a menu loading error shows a message and a way to retry",
         pre=JOINED + ["The menu request is blocked in DevTools (or the network is offline)."],
         steps=[("Reload the Menu page.", "An error message is shown. The page does not crash."),
                ("Unblock the request and retry.", "The menu loads.")],
         status="Not run", basis="R-27"),
    dict(key="mobile", covers=["nfr"],
         title="Verify that the Menu page works on a 375 px wide screen",
         pre=JOINED + ["Browser width is 375 px (DevTools device mode)."],
         steps=[("Open the invite link and scroll through all tabs.",
                 "No horizontal scrolling. Cards, prices and statuses are readable."),
                ("Click [Pre-Order] on an available dish.", "The dish is added.")],
         status="Not run", basis="R-28"),
    dict(key="keyboard", covers=["nfr", "ac4"],
         title="Verify that the menu can be used with the keyboard only",
         pre=JOINED + ["At least one dish is available and one is On Stop."],
         steps=[("Press Tab to move through the page.", "Focus is visible and moves in a logical order."),
                ("Press Enter on [Pre-Order] of an available dish.", "The dish is added."),
                ("Move focus to the On Stop dish and press Enter, then Space.", "The dish is not added.")],
         status="Not run", basis="R-23, R-28"),
]

# ---------------------------------------------------------------------------
# Defects. crop / boxes are in app-menu-screenshot.png pixel coordinates.
# ---------------------------------------------------------------------------
BUGS = [
    dict(key="images", tc="images", severity="Major", priority="Medium",
         summary='Dish images do not match the dishes: "Margherita Pizza" and other dishes show the same salad image',
         pre=JOINED,
         steps=["Open the invite link.",
                'Look at the images of "Fresh Avocado Toast", "Truffle Mushroom Risotto" and "Margherita Pizza".'],
         actual='All three dishes show the same salad image. "Margherita Pizza" shows a salad.',
         expected="Each dish shows its own image that matches the dish (US11 AC2).",
         note="Check the image URL in the menu API response to see whether the cause is the data or the UI.",
         crop=(20, 330, 710, 625), boxes=[(75, 438, 192, 534), (305, 438, 422, 534), (535, 438, 652, 534)]),
    dict(key="strip_date", tc="strip", severity="Minor", priority="Medium",
         summary="Reservation strip on the Menu page does not show the reservation date",
         pre=JOINED,
         steps=["Open the invite link.", "Read the green strip under the header."],
         actual='"You are making a pre-order for the reservation 48 Rustaveli Avenue, Table 1, 15:30 - 17:00". There is no date.',
         expected=f'The strip shows the address, table, date and time ({FIGMA_FRAME}), '
                  'e.g. "… 48 Rustaveli Avenue, Table 1, <date>, 15:30 - 17:00".',
         note="In the code the strip uses only the address, table and time "
              "(frontend guest-pre-order-page.component.html). The date is already available: the \"You're Invited!\" "
              "pop-up shows it, but the strip doesn't use it.",
         crop=(0, 80, 1208, 135), boxes=[(375, 92, 815, 122)]),
    dict(key="on_stop", tc="on_stop_label", severity="Minor", priority="Medium",
         summary='Dish with status "On Stop" is labelled "Out Of Stock" on the guest Menu page',
         pre=JOINED + ['Admin has set a dish status to "On Stop".'],
         steps=["Open the invite link.", 'Find the dish with status "On Stop".'],
         actual='The card has the label "Out Of Stock". The guest menu never shows an "On Stop" label: '
                'on the screenshot both unavailable dishes are labelled "Out Of Stock".',
         expected='The card shows the dish\'s current status "On Stop" (US11 AC2, AC4).',
         note="The screenshot alone does not show which status these two dishes have in the data. "
              "The code shows the cause: the guest page replaces the status of every dish that cannot be ordered "
              "with \"OutOfStock\" (frontend guest-pre-order-page.component.ts:130). The backend sends \"OnStop\" "
              "for On Stop dishes. The Figma badge text also differs (see R-30).",
         crop=(20, 395, 710, 625), boxes=[(160, 408, 230, 434), (390, 408, 460, 434)]),
    dict(key="all_dishes", tc="tabs", severity="Minor", priority="Medium",
         summary='Menu opens on an extra "All dishes" tab that mixes dishes of all categories',
         pre=JOINED,
         steps=["Open the invite link.", "Look at the category tabs and the dish list."],
         actual='Tabs: "All dishes", "Appetizers", "Main Courses". "All dishes" is selected and shows dishes of '
                "different categories in one list, without category headings.",
         expected="Dishes are structured by category (US11 AC1). "
                  f'Tabs "Appetizers", "Main Courses", "Desserts"; "Appetizers" is selected; no "All dishes" tab ({FIGMA_FRAME}).',
         note='The "Desserts" tab is also missing. The tabs are built from the menu data, so this location may '
              "simply have no desserts. Not reported separately until the data is checked.",
         crop=(0, 330, 720, 625), boxes=[(25, 348, 310, 386)]),
    dict(key="header", tc="header", severity="Minor", priority="Medium",
         summary="Menu page for a Guest shows the customer header instead of the Guest header",
         pre=JOINED + ["The invite link is opened in a browser where a Customer is logged in (as on the screenshot)."],
         steps=["Open the invite link.", "Look at the header and the reservation strip."],
         actual='The header shows "Main page", "Book a Table", "Reservations" links and a profile icon. '
                "The cart icon is in the green reservation strip, not in the header.",
         expected=f"Guest variant header: logo on the left, cart icon on the right; no navigation links and no profile icon ({FIGMA_FRAME}).",
         note="In the code, a Guest who is not logged in gets \"Main page\", \"Book a Table\" and [Sign In] "
              "(frontend header.component.html). That is also not the Guest header.",
         crop=(0, 36, 1208, 135), boxes=[(465, 45, 805, 82), (1145, 45, 1180, 80), (1150, 92, 1180, 122)]),
    dict(key="no_status", tc="available_status", severity="Minor", priority="Low",
         summary="Available dish card shows no availability status",
         pre=JOINED,
         steps=["Open the invite link.", 'Look at the card of the available dish "Margherita Pizza".'],
         actual="The card has no status label. Only unavailable dishes have a label.",
         expected='Every dish shows its current availability status, including "Available" (US11 AC2).',
         note="Figma also shows no label on available dishes, so the story and the design disagree (R-31). "
              "Confirm with the PO before fixing.",
         crop=(480, 395, 710, 625), boxes=[(600, 408, 700, 436)]),
    dict(key="sort", tc="sort", severity="Minor", priority="Low",
         summary='"Sort by" shows "Recommended" by default instead of "Popular First"',
         pre=JOINED,
         steps=["Open the invite link.", 'Look at the "Sort by" dropdown.'],
         actual='"Recommended" is selected.',
         expected='"Popular First" is selected. Options: "Popular First", "Newest First", "Price Low to High", '
                  f'"Price High to Low" ({FIGMA_FRAME}).',
         note='The screenshot does not show the open list. In the code the options are "Recommended", '
              '"Price: Low to high" and "Price: High to low" (frontend guest-pre-order-page.component.html), '
              'so "Popular First" and "Newest First" are missing too.',
         crop=(700, 330, 1208, 400), boxes=[(925, 343, 1165, 388)]),
    dict(key="weight", tc="weight", severity="Trivial", priority="Low",
         summary='Weight format is inconsistent: "200g", "350g" and "450 g"',
         pre=JOINED,
         steps=["Open the invite link.", "Compare the weight on all dish cards."],
         actual='"200g" and "350g" have no space; "450 g" has a space.',
         expected=f'One format for all dishes: a number, a space and "g", e.g. "450 g" ({FIGMA_FRAME}).',
         note="The card shows the weight text exactly as stored (frontend dish-card.component.html:20), "
              "so the fix is either in the data or in formatting.",
         crop=(20, 500, 710, 600), boxes=[(196, 552, 230, 571), (426, 552, 460, 571), (654, 552, 692, 571)]),
]

# ---------------------------------------------------------------------------
# Derived IDs and checks
# ---------------------------------------------------------------------------
TC_ID = {tc["key"]: f"TC-{i:02d}" for i, tc in enumerate(TEST_CASES, 1)}
BUG_ID = {bug["key"]: f"BUG-{i:02d}" for i, bug in enumerate(BUGS, 1)}
BUGS_BY_TC = {}
for _bug in BUGS:
    BUGS_BY_TC.setdefault(_bug["tc"], []).append(BUG_ID[_bug["key"]])


def check() -> None:
    assert len(TC_ID) == len(TEST_CASES), "duplicate test case key"
    assert len(BUG_ID) == len(BUGS), "duplicate bug key"
    for tc in TEST_CASES:
        assert tc["status"] in {"Passed", "Failed", "Not run"}, tc["key"]
        assert set(tc["covers"]) <= set(COVERAGE_LABELS), tc["key"]
        linked = set(tc.get("bugs", []))
        assert (tc["status"] == "Failed") == bool(linked), f"{tc['key']}: Failed <=> has bugs"
        assert linked == {b["key"] for b in BUGS if b["tc"] == tc["key"]}, f"{tc['key']}: bug links differ"
    for bug in BUGS:
        assert bug["tc"] in TC_ID, bug["key"]


# ---------------------------------------------------------------------------
# Evidence images
# ---------------------------------------------------------------------------
def bug_image(bug: dict) -> Path:
    shot = Image.open(APP_SHOT).convert("RGB")
    draw = ImageDraw.Draw(shot)
    for box in bug["boxes"]:
        draw.rectangle(box, outline=(220, 30, 30), width=3)
    path = EVIDENCE / f"{BUG_ID[bug['key']].lower()}.png"
    shot.crop(bug["crop"]).save(path, optimize=True)
    return path


# ---------------------------------------------------------------------------
# Markdown
# ---------------------------------------------------------------------------
def numbered(items) -> str:
    return "\n".join(f"{i}. {text}" for i, text in enumerate(items, 1))


def write_test_cases_md() -> None:
    counts = Counter(tc["status"] for tc in TEST_CASES)
    out = ["# US11 — Test cases and test results\n",
           "**Story:** `[Draft] US11_Guest Viewing Reservation Menu`. "
           "**Tested on:** the course screenshot of the app (`evidence/app-menu-screenshot.png`, env P_PRD) "
           f"against the story and {FIGMA_FRAME} (`evidence/figma-guest-menu.png`).\n",
           "**Layout:** the course template: ID, Title, Pre-conditions, Steps, Expected result (one per step), Status. "
           "The same cases are in `hw7-us11-qa.xlsx`, sheet \"Test cases\".\n",
           f"**{len(TEST_CASES)} test cases: {counts['Passed']} Passed, {counts['Failed']} Failed, "
           f"{counts['Not run']} Not run.**\n",
           "A screenshot is one static picture. A case is **Passed** or **Failed** only when the screenshot shows every "
           "expected result it needs. Cases that need clicks, other data or other states are **Not run**.\n",
           "**Based on** names the assumption (A-x) or finding (R-xx) in `01-requirements-review.md` "
           "that the expected result depends on.\n",
           "## Coverage\n",
           "| Requirement | Test cases |", "|---|---|"]
    for key, label in COVERAGE_LABELS.items():
        ids = [TC_ID[tc["key"]] for tc in TEST_CASES if key in tc["covers"]]
        out.append(f"| {label} | {', '.join(ids)} |")
    out += ["", "## Results\n", "| ID | Title | Status | Defects |", "|---|---|---|---|"]
    for tc in TEST_CASES:
        bugs = ", ".join(BUGS_BY_TC.get(tc["key"], [])) or "—"
        out.append(f"| {TC_ID[tc['key']]} | {tc['title']} | {tc['status']} | {bugs} |")
    out += ["", "## Test cases\n"]
    for tc in TEST_CASES:
        bugs = ", ".join(BUGS_BY_TC.get(tc["key"], []))
        out.append(f"### {TC_ID[tc['key']]}: {tc['title']}\n")
        out.append(f"**Status:** {tc['status']}" + (f" ({bugs})" if bugs else "") + "  ")
        out.append(f"**Based on:** {tc['basis']}\n")
        out.append("**Pre-conditions:**\n")
        out += [f"- {line}" for line in tc["pre"]]
        out += ["", "| # | Step | Expected result |", "|---|---|---|"]
        for i, (step, expected) in enumerate(tc["steps"], 1):
            out.append(f"| {i} | {step} | {expected} |")
        out.append("")
    (ROOT / "02-test-cases.md").write_text("\n".join(out), encoding="utf-8")


def write_defects_md() -> None:
    out = ["# US11 — Defect reports\n",
           "**Found on:** the course screenshot of the app (env P_PRD, Microsoft Edge), checked against US11 and "
           f"{FIGMA_FRAME}. The same reports are in `hw7-us11-qa.xlsx`, sheet \"Defect reports\".\n",
           "**Severity:** Blocker > Critical > Major > Minor > Trivial (impact). "
           "**Priority:** High > Medium > Low (how soon to fix).\n",
           "| ID | Summary | Severity | Priority | Test case |", "|---|---|---|---|---|"]
    for bug in BUGS:
        out.append(f"| {BUG_ID[bug['key']]} | {bug['summary']} | {bug['severity']} | {bug['priority']} | {TC_ID[bug['tc']]} |")
    out.append("")
    for bug in BUGS:
        bid = BUG_ID[bug["key"]]
        out += [f"## {bid}: {bug['summary']}\n",
                f"**Env:** {ENV.replace(chr(10), ' ')}  ",
                f"**Severity:** {bug['severity']}  ",
                f"**Priority:** {bug['priority']}  ",
                f"**Test case:** {TC_ID[bug['tc']]}\n",
                "**Pre-conditions:**\n"]
        out += [f"- {line}" for line in bug["pre"]]
        out += ["", "**Steps:**\n", numbered(bug["steps"]), "",
                f"**Actual result:** {bug['actual']}\n",
                f"**Expected result:** {bug['expected']}\n",
                f"**Note:** {bug['note']}\n",
                f"**Attachment:**\n\n![{bid}](evidence/{bid.lower()}.png)\n"]
    (ROOT / "04-defect-reports.md").write_text("\n".join(out), encoding="utf-8")


# ---------------------------------------------------------------------------
# XLSX in the course template layout
# ---------------------------------------------------------------------------
FONT = "Arial"
THIN = Side(style="thin", color="000000")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
TOP_LEFT = Alignment(horizontal="left", vertical="top", wrap_text=True)
COL_CHARS = {"A": 13, "B": 55, "C": 75, "D": 26}


def rich(*parts) -> CellRichText:
    """parts: (text, bold) pairs."""
    return CellRichText(*[TextBlock(InlineFont(rFont=FONT, sz=10, b=bold), text) for text, bold in parts])


def put(ws, ref: str, value, bold: bool = False) -> None:
    cell = ws[ref]
    cell.value = value
    cell.font = Font(name=FONT, size=10, bold=bold)
    cell.alignment = TOP_LEFT


def box(ws, cells: str) -> None:
    for row in ws[cells]:
        for cell in row:
            cell.border = BORDER


def lines_needed(text: str, chars: int) -> int:
    return sum(max(1, -(-len(line) // chars)) for line in str(text).split("\n"))


def setup_sheet(ws, widths: dict = COL_CHARS) -> None:
    for col, width in widths.items():
        ws.column_dimensions[col].width = width
    ws.sheet_view.showGridLines = True
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def write_tc_sheet(ws) -> None:
    setup_sheet(ws)
    row = 1
    for tc in TEST_CASES:
        r1, r2, r3 = row, row + 1, row + 2
        ws.merge_cells(f"A{r1}:A{r3}")
        ws.merge_cells(f"B{r1}:C{r1}")
        ws.merge_cells(f"B{r2}:C{r2}")
        ws.merge_cells(f"D{r1}:D{r3}")
        put(ws, f"A{r1}", f"ID: {TC_ID[tc['key']]}", bold=True)
        put(ws, f"B{r1}", f"Title: {tc['title']}", bold=True)
        bugs = ", ".join(BUGS_BY_TC.get(tc["key"], []))
        status_extra = f"\n\nDefects: {bugs}" if bugs else ("\n\nNot visible on the screenshot" if tc["status"] == "Not run" else "")
        put(ws, f"D{r1}", rich((f"Status: {tc['status']}", True), (status_extra, False)) if status_extra
            else f"Status: {tc['status']}", bold=not status_extra)
        pre_text = "Pre-conditions:\n" + "\n".join(tc["pre"])
        put(ws, f"B{r2}", pre_text, bold=True)
        steps_text = numbered(step for step, _ in tc["steps"])
        exp_text = numbered(exp for _, exp in tc["steps"])
        put(ws, f"B{r3}", rich(("Steps:", True), ("\n" + steps_text, False)))
        put(ws, f"C{r3}", rich(("Expected result:", True), ("\n" + exp_text, False)))
        box(ws, f"A{r1}:D{r3}")
        ws.row_dimensions[r1].height = 14 * lines_needed(f"Title: {tc['title']}", 120) + 4
        ws.row_dimensions[r2].height = 14 * lines_needed(pre_text, 120) + 4
        ws.row_dimensions[r3].height = 14 * max(lines_needed("Steps:\n" + steps_text, 50),
                                                lines_needed("Expected result:\n" + exp_text, 70), 4) + 4
        row += 4


def write_bug_sheet(ws, images: dict) -> None:
    setup_sheet(ws)
    row = 1
    for bug in BUGS:
        bid = BUG_ID[bug["key"]]
        r1, r2, r3, r4, r5 = row, row + 1, row + 2, row + 3, row + 4
        ws.merge_cells(f"A{r1}:A{r3}")
        for r in (r1, r2, r3):
            ws.merge_cells(f"B{r}:C{r}")
        ws.merge_cells(f"A{r4}:D{r4}")
        put(ws, f"A{r1}", f"ID: {bid}", bold=True)
        put(ws, f"B{r1}", f"Summary: {bug['summary']}", bold=True)
        put(ws, f"D{r1}", f"Env: {ENV}", bold=True)
        pre_text = "Pre-conditions:\n" + "\n".join(bug["pre"])
        put(ws, f"B{r2}", pre_text, bold=True)
        put(ws, f"D{r2}", f"Priority: {bug['priority']}", bold=True)
        body = rich(("Steps:", True), ("\n" + numbered(bug["steps"]) + "\n\n", False),
                    ("Actual result: ", True), (bug["actual"] + "\n\n", False),
                    ("Expected result: ", True), (bug["expected"] + "\n\n", False),
                    ("Note: ", True), (bug["note"] + "\n\n", False),
                    ("Test case: ", True), (TC_ID[bug["tc"]], False))
        put(ws, f"B{r3}", body)
        put(ws, f"D{r3}", f"Severity: {bug['severity']}", bold=True)
        put(ws, f"A{r4}", "Attachments:", bold=True)
        box(ws, f"A{r1}:D{r4}")
        body_plain = "Steps:\n" + numbered(bug["steps"]) + "\n\nActual result: " + bug["actual"] + \
                     "\n\nExpected result: " + bug["expected"] + "\n\nNote: " + bug["note"] + "\n\nTest case: x"
        ws.row_dimensions[r1].height = 14 * max(lines_needed(f"Summary: {bug['summary']}", 120),
                                                lines_needed(f"Env: {ENV}", 24)) + 4
        ws.row_dimensions[r2].height = 14 * lines_needed(pre_text, 120) + 4
        ws.row_dimensions[r3].height = 14 * lines_needed(body_plain, 120) + 4
        img = XLImage(str(images[bug["key"]]))
        scale = min(1.0, 900 / img.width)
        img.width, img.height = int(img.width * scale), int(img.height * scale)
        ws.add_image(img, f"A{r5}")
        ws.row_dimensions[r5].height = img.height * 0.75 + 8
        row += 6


# ---------------------------------------------------------------------------
# Requirements review tab: parsed from 01-requirements-review.md (its single source)
# ---------------------------------------------------------------------------
REVIEW_MD = ROOT / "01-requirements-review.md"
REVIEW_COLS = {"A": 8, "B": 18, "C": 14, "D": 10, "E": 62, "F": 56}
HEADER_FILL = PatternFill("solid", fgColor="E7E6E6")
SECTION_FILL = PatternFill("solid", fgColor="F2F2F2")


def plain(text: str) -> str:
    """Drop Markdown emphasis and code marks."""
    return text.replace("**", "").replace("`", "").strip()


def table_cells(line: str) -> list:
    return [plain(cell) for cell in line.strip().strip("|").split("|")]


def parse_review() -> dict:
    lines = REVIEW_MD.read_text(encoding="utf-8").splitlines()
    review = {"story": [], "questions": [], "sections": [], "assumptions": [], "notes": []}
    part = None
    for line in lines:
        if line.startswith("## "):
            part = line[3:].strip()
            continue
        if part == "The story as written" and line.startswith(">"):
            review["story"].append(plain(line.lstrip("> ")))
        elif part == "Summary" and line[:3] in {f"{n}. " for n in range(1, 10)}:
            review["questions"].append(plain(line[3:]))
        elif part == "Findings":
            if line.startswith("### "):
                review["sections"].append((line[4:].strip(), []))
            elif line.startswith("| R-"):
                cells = table_cells(line)
                assert len(cells) == 6, f"finding row has {len(cells)} cells: {line[:40]}"
                review["sections"][-1][1].append(cells)
            elif line.startswith("**Partly answered"):
                review["notes"].append(plain(line))
        elif part == "Assumptions used in the test cases" and line.startswith("| A-"):
            cells = table_cells(line)
            assert len(cells) == 3, f"assumption row has {len(cells)} cells: {line[:40]}"
            review["assumptions"].append(cells)
    findings = [row for _, rows in review["sections"] for row in rows]
    assert findings and review["assumptions"] and review["story"] and review["questions"], "review parse failed"
    assert [row[0] for row in findings] == [f"R-{i:02d}" for i in range(1, len(findings) + 1)], "finding IDs not sequential"
    return review


def write_review_sheet(ws, review: dict) -> None:
    setup_sheet(ws, REVIEW_COLS)
    findings = [row for _, rows in review["sections"] for row in rows]
    sev = Counter(row[3] for row in findings)
    widths = list(REVIEW_COLS.values())

    def full_row(row: int, value, bold: bool = False, fill=None, height_chars: int = 160) -> None:
        ws.merge_cells(f"A{row}:F{row}")
        put(ws, f"A{row}", value, bold=bold)
        if fill:
            ws[f"A{row}"].fill = fill
        text = value if isinstance(value, str) else "".join(block.text for block in value)
        ws.row_dimensions[row].height = 14 * lines_needed(text, height_chars) + 4

    row = 1
    full_row(row, "US11 — Requirements review", bold=True)
    ws[f"A{row}"].font = Font(name=FONT, size=13, bold=True)
    row += 1
    full_row(row, "Story: [Draft] US11_Guest Viewing Reservation Menu (course PDF). "
                  'Design: Figma, frame "Placing pre-order by guest | Menu". '
                  "Status names were checked against the backend code.")
    row += 2

    full_row(row, "The story as written", bold=True, fill=SECTION_FILL)
    row += 1
    story = "\n".join(line for line in review["story"])
    full_row(row, story)
    box(ws, f"A{row}:F{row}")
    row += 2

    full_row(row, "Summary", bold=True, fill=SECTION_FILL)
    row += 1
    summary = rich((f"{len(findings)} findings: {sev['High']} High, {sev['Medium']} Medium, {sev['Low']} Low.", True),
                   ("\nHigh = a core flow has no single correct expected result. "
                    "Medium = a test needs an assumption the PO must confirm. Low = wording, format or minor edge case.", False),
                   ("\n\nThe five questions to resolve first:", True),
                   ("\n" + numbered(review["questions"]), False))
    full_row(row, summary)
    box(ws, f"A{row}:F{row}")
    row += 2

    headers = ["ID", "Where", "Type", "Severity", "Problem", "Question for the PO / suggested fix"]
    for col, title in zip("ABCDEF", headers):
        put(ws, f"{col}{row}", title, bold=True)
        ws[f"{col}{row}"].fill = HEADER_FILL
    box(ws, f"A{row}:F{row}")
    row += 1
    for section, rows in review["sections"]:
        full_row(row, section, bold=True, fill=SECTION_FILL)
        box(ws, f"A{row}:F{row}")
        row += 1
        for cells in rows:
            for col, value in zip("ABCDEF", cells):
                put(ws, f"{col}{row}", value, bold=(col == "A" or (col == "D" and value == "High")))
            box(ws, f"A{row}:F{row}")
            ws.row_dimensions[row].height = 14 * max(lines_needed(v, int(w * 1.1)) for v, w in zip(cells, widths)) + 4
            row += 1
    for note in review["notes"]:
        full_row(row, note)
        row += 1
    row += 1

    full_row(row, "Assumptions used in the test cases (until the PO answers)", bold=True, fill=SECTION_FILL)
    row += 1
    for col, title in (("A", "ID"), ("B", "Assumption"), ("F", "Linked findings")):
        put(ws, f"{col}{row}", title, bold=True)
    ws.merge_cells(f"B{row}:E{row}")
    for col in "ABCDEF":
        ws[f"{col}{row}"].fill = HEADER_FILL
    box(ws, f"A{row}:F{row}")
    row += 1
    for aid, text, links in review["assumptions"]:
        ws.merge_cells(f"B{row}:E{row}")
        put(ws, f"A{row}", aid, bold=True)
        put(ws, f"B{row}", text)
        put(ws, f"F{row}", links)
        box(ws, f"A{row}:F{row}")
        ws.row_dimensions[row].height = 14 * lines_needed(text, 110) + 4
        row += 1


def write_xlsx(images: dict, review: dict) -> None:
    wb = Workbook()
    write_review_sheet(wb.active, review)
    wb.active.title = "Requirements review"
    write_tc_sheet(wb.create_sheet("Test cases"))
    write_bug_sheet(wb.create_sheet("Defect reports"), images)
    wb.save(XLSX)


def main() -> None:
    check()
    review = parse_review()
    images = {bug["key"]: bug_image(bug) for bug in BUGS}
    write_test_cases_md()
    write_defects_md()
    write_xlsx(images, review)
    counts = Counter(tc["status"] for tc in TEST_CASES)
    findings = sum(len(rows) for _, rows in review["sections"])
    print(f"{findings} findings, {len(TEST_CASES)} test cases ({dict(counts)}), {len(BUGS)} defects -> {ROOT.name}")


if __name__ == "__main__":
    main()
