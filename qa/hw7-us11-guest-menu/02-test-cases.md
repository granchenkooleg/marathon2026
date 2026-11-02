# US11 — Test cases and test results

**Story:** `[Draft] US11_Guest Viewing Reservation Menu`. **Tested on:** the course screenshot of the app (`evidence/app-menu-screenshot.png`, env P_PRD) against the story and Figma, frame "Placing pre-order by guest | Menu" (`evidence/figma-guest-menu.png`).

**Layout:** the course template: ID, Title, Pre-conditions, Steps, Expected result (one per step), Status. The same cases are in `hw7-us11-qa.xlsx`, sheet "Test cases".

**30 test cases: 3 Passed, 8 Failed, 19 Not run.**

A screenshot is one static picture. A case is **Passed** or **Failed** only when the screenshot shows every expected result it needs. Cases that need clicks, other data or other states are **Not run**.

**Based on** names the assumption (A-x) or finding (R-xx) in `01-requirements-review.md` that the expected result depends on.

## Coverage

| Requirement | Test cases |
|---|---|
| Pre-conditions | TC-01, TC-02, TC-03, TC-04 |
| Description: full menu | TC-08 |
| AC1: categories | TC-01, TC-07, TC-08, TC-09 |
| AC2: dish card | TC-11, TC-12, TC-13, TC-14, TC-15, TC-16, TC-17, TC-21, TC-23 |
| AC3: add to subcart | TC-18, TC-19, TC-20, TC-25 |
| AC4: unavailable dishes | TC-21, TC-22, TC-23, TC-25, TC-30 |
| AC5: current data | TC-24, TC-25 |
| Figma only (not in the story) | TC-05, TC-06, TC-07, TC-10, TC-11, TC-14 |
| Missing ACs: loading / empty / error (R-27) | TC-26, TC-27, TC-28 |
| Missing NFRs (R-28) | TC-29, TC-30 |

## Results

| ID | Title | Status | Defects |
|---|---|---|---|
| TC-01 | Verify that the Menu page is shown to a Guest who joined the group session | Passed | — |
| TC-02 | Verify that the menu cannot be used before the Guest enters a name | Not run | — |
| TC-03 | Verify that the Guest cannot add dishes after the Owner submitted the group pre-order | Not run | — |
| TC-04 | Verify that the Guest sees a message when the reservation was cancelled | Not run | — |
| TC-05 | Verify that the Guest variant of the header is shown on the Menu page | Failed | BUG-05 |
| TC-06 | Verify that the reservation strip shows the address, table, date and time | Failed | BUG-02 |
| TC-07 | Verify that dishes are grouped into category tabs | Failed | BUG-04 |
| TC-08 | Verify that the menu shows all dishes of the reservation's location and only them | Not run | — |
| TC-09 | Verify that a category with no dishes is not shown | Not run | — |
| TC-10 | Verify that "Sort by" has the default value and options from Figma | Failed | BUG-07 |
| TC-11 | Verify that each dish card shows the image, name, price and weight as in Figma | Passed | — |
| TC-12 | Verify that each dish shows its own image | Failed | BUG-01 |
| TC-13 | Verify that prices are shown with the currency sign and two decimals | Passed | — |
| TC-14 | Verify that the serving size is shown in grams in the format "<number> g" | Failed | BUG-08 |
| TC-15 | Verify that an available dish shows its availability status | Failed | BUG-06 |
| TC-16 | Verify that a dish without an image shows a placeholder | Not run | — |
| TC-17 | Verify that a long dish name does not break the card | Not run | — |
| TC-18 | Verify that the Guest can add an available dish to the personal subcart | Not run | — |
| TC-19 | Verify that adding the same dish twice increases the quantity | Not run | — |
| TC-20 | Verify that each Guest's subcart is personal | Not run | — |
| TC-21 | Verify that a dish with status "On Stop" is clearly marked as unavailable | Failed | BUG-03 |
| TC-22 | Verify that a dish with status "On Stop" cannot be added to the cart | Not run | — |
| TC-23 | Verify that a dish with status "Out of Stock" is marked and cannot be added | Not run | — |
| TC-24 | Verify that a dish status change is shown after the page is reloaded | Not run | — |
| TC-25 | Verify that a dish that went On Stop after the menu loaded cannot be added | Not run | — |
| TC-26 | Verify that a loading state is shown while the menu loads | Not run | — |
| TC-27 | Verify that an empty menu shows a message | Not run | — |
| TC-28 | Verify that a menu loading error shows a message and a way to retry | Not run | — |
| TC-29 | Verify that the Menu page works on a 375 px wide screen | Not run | — |
| TC-30 | Verify that the menu can be used with the keyboard only | Not run | — |

## Test cases

### TC-01: Verify that the Menu page is shown to a Guest who joined the group session

**Status:** Passed  
**Based on:** —

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened: reservation strip, category tabs and dish cards are shown. |

### TC-02: Verify that the menu cannot be used before the Guest enters a name

**Status:** Not run  
**Based on:** Pre-condition 1

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest opens the invite link for the first time.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | "You're Invited!" pop-up window is opened over the menu. |
| 2 | Press Esc. | The pop-up window stays open. |
| 3 | Press Tab several times. | Focus stays inside the pop-up window. No [Pre-Order] button can be reached. |

### TC-03: Verify that the Guest cannot add dishes after the Owner submitted the group pre-order

**Status:** Not run  
**Based on:** A-2; R-06, R-07, R-08

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Owner has submitted the group pre-order (group status = "Submitted").

| # | Step | Expected result |
|---|---|---|
| 1 | Reload the Menu page. | A message says that the group pre-order is already submitted. |
| 2 | Click [Pre-Order] on an available dish. | The dish is not added to the cart. |

### TC-04: Verify that the Guest sees a message when the reservation was cancelled

**Status:** Not run  
**Based on:** A-2; R-06, R-07, R-08; message from the course template

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Owner has cancelled the reservation (status = "Cancelled").

| # | Step | Expected result |
|---|---|---|
| 1 | Reload the Menu page. | Static page with the message "This pre-order session has expired or is no longer active." is opened. |

### TC-05: Verify that the Guest variant of the header is shown on the Menu page

**Status:** Failed (BUG-05)  
**Based on:** R-33

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Check the header. | Header matches the Guest variant header (Figma, frame "Placing pre-order by guest | Menu"): logo on the left, cart icon on the right. No "Main page", "Book a Table", "Reservations" links, no profile icon, no [Sign In] button. |

### TC-06: Verify that the reservation strip shows the address, table, date and time

**Status:** Failed (BUG-02)  
**Based on:** R-02, R-33

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Read the green reservation strip. | Text: "You are making a pre-order for the reservation: <address>, Table <number>, <date>, <start time> - <end time>" (Figma, frame "Placing pre-order by guest | Menu"). All values match the reservation. |

### TC-07: Verify that dishes are grouped into category tabs

**Status:** Failed (BUG-04)  
**Based on:** A-3; R-09, R-10

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The location has dishes in all three categories.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. The "Appetizers" tab is selected (Figma, frame "Placing pre-order by guest | Menu"). |
| 2 | Check the tabs. | Tabs "Appetizers", "Main Courses", "Desserts" are shown in this order. |
| 3 | Click each tab. | Each tab shows only the dishes of its category. |

### TC-08: Verify that the menu shows all dishes of the reservation's location and only them

**Status:** Not run  
**Based on:** A-1; R-05

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- Admin panel or API access to the location's dish list.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link and go through all tabs. | All dishes of the location are shown, including unavailable ones. |
| 2 | Compare the dishes with the location's dish list. | The lists match. No dishes of other locations are shown. |

### TC-09: Verify that a category with no dishes is not shown

**Status:** Not run  
**Based on:** A-3; R-09

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The location has no desserts.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. There is no "Desserts" tab. |

### TC-10: Verify that "Sort by" has the default value and options from Figma

**Status:** Failed (BUG-07)  
**Based on:** R-29, R-32

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | "Sort by" shows "Popular First" (Figma, frame "Placing pre-order by guest | Menu"). |
| 2 | Open the "Sort by" dropdown. | Options: "Popular First", "Newest First", "Price Low to High", "Price High to Low". |

### TC-11: Verify that each dish card shows the image, name, price and weight as in Figma

**Status:** Passed  
**Based on:** —

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Check every dish card. | Image at the top; dish name on the left; price (green) on the right; weight under the price (Figma, frame "Placing pre-order by guest | Menu"). |

### TC-12: Verify that each dish shows its own image

**Status:** Failed (BUG-01)  
**Based on:** —

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Compare each dish image with the dish name. | Each image shows its dish (e.g., "Margherita Pizza" shows a pizza). Different dishes have different images. |

### TC-13: Verify that prices are shown with the currency sign and two decimals

**Status:** Passed  
**Based on:** A-6; R-12, R-35

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Check the price on every card. | Each price has the "$" sign and two decimals, e.g. "$12.00". |

### TC-14: Verify that the serving size is shown in grams in the format "<number> g"

**Status:** Failed (BUG-08)  
**Based on:** A-6; R-13

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Check the weight on every card. | Weight is a number, a space and "g", e.g. "450 g" (Figma, frame "Placing pre-order by guest | Menu"). |

### TC-15: Verify that an available dish shows its availability status

**Status:** Failed (BUG-06)  
**Based on:** A-9; R-15, R-31

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- At least one dish is available.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | Menu page is opened. |
| 2 | Check the card of an available dish. | The card shows the status "Available" (AC2: each menu item displays its current availability status). |

### TC-16: Verify that a dish without an image shows a placeholder

**Status:** Not run  
**Based on:** R-14

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- A dish has no image in the admin panel.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link and find the dish. | A placeholder image is shown, not a broken-image icon. The card layout is the same as other cards. |

### TC-17: Verify that a long dish name does not break the card

**Status:** Not run  
**Based on:** —

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- A dish name is longer than 60 characters.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link at 1440 px width and find the dish. | The name wraps or ends with "…". Price, weight and [Pre-Order] stay visible and aligned. |
| 2 | Repeat at 375 px width. | Same as step 1. |

### TC-18: Verify that the Guest can add an available dish to the personal subcart

**Status:** Not run  
**Based on:** A-5, A-8; R-20, R-21

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Guest's cart is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Click [Pre-Order] on an available dish. | Confirmation is shown, e.g. "<dish> added to your pre-order". |
| 2 | Click the cart icon. | The cart has the dish: quantity 1, its price, total = the price. |

### TC-19: Verify that adding the same dish twice increases the quantity

**Status:** Not run  
**Based on:** A-5; R-20

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Guest's cart is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Click [Pre-Order] on the same available dish two times. | Confirmation is shown each time. |
| 2 | Click the cart icon. | The cart has one line for the dish with quantity 2. Total = 2 × price. |

### TC-20: Verify that each Guest's subcart is personal

**Status:** Not run  
**Based on:** R-18

**Pre-conditions:**

- Two Guests joined the same group session in two browsers. Both carts are empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Guest 1: click [Pre-Order] on an available dish. | The dish is added to Guest 1's cart. |
| 2 | Guest 2: click the cart icon. | Guest 2's cart is empty. |
| 3 | Guest 1: click the cart icon. | Guest 1's cart has the dish. |

### TC-21: Verify that a dish with status "On Stop" is clearly marked as unavailable

**Status:** Failed (BUG-03)  
**Based on:** R-16, R-23, R-30

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- Admin has set a dish status to "On Stop".

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link and find the dish. | The card is greyed out, has the label "On Stop" (text, not only colour), [Pre-Order] is disabled. |

### TC-22: Verify that a dish with status "On Stop" cannot be added to the cart

**Status:** Not run  
**Based on:** R-23

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- Admin has set a dish status to "On Stop". The Guest's cart is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Click [Pre-Order] on the On Stop dish. | Nothing happens. No confirmation. |
| 2 | Click the card of the On Stop dish. | Nothing happens. |
| 3 | Click the cart icon. | The cart is empty. |

### TC-23: Verify that a dish with status "Out of Stock" is marked and cannot be added

**Status:** Not run  
**Based on:** A-4; R-16

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- Admin has set a dish status to "Out of Stock". The Guest's cart is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link and find the dish. | The card is greyed out, has the label "Out of Stock", [Pre-Order] is disabled. |
| 2 | Click [Pre-Order] on the dish, then open the cart. | The cart is empty. |

### TC-24: Verify that a dish status change is shown after the page is reloaded

**Status:** Not run  
**Based on:** A-7; R-26

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Menu page is open. A dish is available.

| # | Step | Expected result |
|---|---|---|
| 1 | Admin sets the dish to "On Stop". The Guest reloads the page. | The dish is shown as On Stop and cannot be added. |
| 2 | Admin sets the dish back to "Available". The Guest reloads the page. | The dish is available and can be added. |

### TC-25: Verify that a dish that went On Stop after the menu loaded cannot be added

**Status:** Not run  
**Based on:** A-8; R-22

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The Menu page is open. A dish is available. The Guest's cart is empty.

| # | Step | Expected result |
|---|---|---|
| 1 | Admin sets the dish to "On Stop". Without reloading, the Guest clicks [Pre-Order] on it. | An error message says the dish is no longer available. The message has no internal IDs. |
| 2 | Click the cart icon. | The cart is empty. |

### TC-26: Verify that a loading state is shown while the menu loads

**Status:** Not run  
**Based on:** R-27

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- DevTools network throttling is "Slow 3G".

| # | Step | Expected result |
|---|---|---|
| 1 | Reload the Menu page. | A loading indicator is shown until the dishes appear. No error or "empty menu" message flashes. |

### TC-27: Verify that an empty menu shows a message

**Status:** Not run  
**Based on:** R-27

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The location has no dishes.

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link. | A message says the menu is empty. The page layout is not broken. |

### TC-28: Verify that a menu loading error shows a message and a way to retry

**Status:** Not run  
**Based on:** R-27

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- The menu request is blocked in DevTools (or the network is offline).

| # | Step | Expected result |
|---|---|---|
| 1 | Reload the Menu page. | An error message is shown. The page does not crash. |
| 2 | Unblock the request and retry. | The menu loads. |

### TC-29: Verify that the Menu page works on a 375 px wide screen

**Status:** Not run  
**Based on:** R-28

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- Browser width is 375 px (DevTools device mode).

| # | Step | Expected result |
|---|---|---|
| 1 | Open the invite link and scroll through all tabs. | No horizontal scrolling. Cards, prices and statuses are readable. |
| 2 | Click [Pre-Order] on an available dish. | The dish is added. |

### TC-30: Verify that the menu can be used with the keyboard only

**Status:** Not run  
**Based on:** R-23, R-28

**Pre-conditions:**

- Reservation status is "Reserved", group pre-order status is "Open".
- Guest has joined the group session via the invite link (US_G10).
- At least one dish is available and one is On Stop.

| # | Step | Expected result |
|---|---|---|
| 1 | Press Tab to move through the page. | Focus is visible and moves in a logical order. |
| 2 | Press Enter on [Pre-Order] of an available dish. | The dish is added. |
| 3 | Move focus to the On Stop dish and press Enter, then Space. | The dish is not added. |
