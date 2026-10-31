# US11 — Test cases

**Story:** `[Draft] US11_Guest Viewing Reservation Menu`. **Status of all cases:** Not run (waiting for the app screenshot).

**Template:** the course template has not arrived yet, so these cases use standard columns: ID, Title, Priority, Requirement, Preconditions, Test data, Steps, Expected result. The same cases are in `test-cases.csv`, ready to import into Google Sheets and to move into the course template.

**29 test cases:** 12 High, 12 Medium, 5 Low.

Where the story is unclear, the expected result follows an assumption (A-x) or a finding (R-xx) from `01-requirements-review.md`. If the PO answers differently, update those expected results.

## Test data

| Key | Description |
|---|---|
| L1 | Location of the test reservation. Menu: D1–D7. |
| D1 | Appetizer, Available, has image, price 12.5, weight 250. |
| D2 | Main course, Available. |
| D3 | Dessert, Available. |
| D4 | Main course, On Stop. |
| D5 | Dessert, Out of Stock. |
| D6 | Appetizer, Available, no image. |
| D7 | Main course, Available, name longer than 60 characters. |
| L2 | Another location. Its dish D8 is not on the L1 menu. |
| L3 | Location with no dishes (for the empty-menu test). |
| R1 | Reservation at L1: status Reserved, group pre-order Open, invite link available. |
| G1 | Guest "Anna", joined R1 in browser A (per US_G10). |
| G2 | Guest "Ben", joined R1 in browser B (per US_G10). |

## Coverage

| Requirement | Test cases |
|---|---|
| Pre-conditions | TC-01, TC-02, TC-03, TC-04 |
| Description: full menu | TC-05 |
| AC1: categories | TC-05, TC-06, TC-07 |
| AC2: dish card | TC-08, TC-09, TC-10, TC-11, TC-12, TC-13, TC-21 |
| AC3: add to subcart | TC-14, TC-15, TC-16, TC-17, TC-22 |
| AC4: unavailable dishes | TC-18, TC-19, TC-20, TC-21, TC-22 |
| AC5: current data | TC-22, TC-23, TC-24 |
| Missing ACs: states (R-27) | TC-25, TC-26, TC-27 |
| Missing NFRs (R-28) | TC-28, TC-29 |

## Index

| ID | Title | Priority | Requirement |
|---|---|---|---|
| [TC-01](#tc-01) | Guest who joined an open group pre-order sees the menu | High | Pre-condition 1, 2; AC1 |
| [TC-02](#tc-02) | Guest cannot add dishes after the Owner submitted the group pre-order | High | Pre-condition 2 |
| [TC-03](#tc-03) | Guest cannot add dishes when the reservation is cancelled | High | Pre-condition 2 |
| [TC-04](#tc-04) | Menu is not usable before the guest enters a name | Medium | Pre-condition 1 |
| [TC-05](#tc-05) | Menu shows all dishes of the reservation's location and only them | High | Description; AC1 |
| [TC-06](#tc-06) | Dishes are grouped by category in a fixed order | High | AC1 |
| [TC-07](#tc-07) | Empty category is hidden | Low | AC1 |
| [TC-08](#tc-08) | Dish card shows name, price, weight, image and status | High | AC2 |
| [TC-09](#tc-09) | Price is shown with currency and two decimals | Medium | AC2 |
| [TC-10](#tc-10) | Serving size is shown in grams | Medium | AC2 |
| [TC-11](#tc-11) | Dish without an image shows a placeholder | Low | AC2 |
| [TC-12](#tc-12) | Long dish name does not break the card | Low | AC2 |
| [TC-13](#tc-13) | Available dish shows its availability status | Medium | AC2 |
| [TC-14](#tc-14) | Guest adds an available dish to the subcart | High | AC3 |
| [TC-15](#tc-15) | Adding the same dish twice increases the quantity | Medium | AC3 |
| [TC-16](#tc-16) | Guest adds dishes from different categories | Medium | AC3 |
| [TC-17](#tc-17) | Subcart is personal to each guest | High | AC3 |
| [TC-18](#tc-18) | On Stop dish is clearly marked as unavailable | High | AC4 |
| [TC-19](#tc-19) | On Stop dish cannot be added with the mouse | High | AC4 |
| [TC-20](#tc-20) | On Stop dish cannot be added with the keyboard | Medium | AC4 |
| [TC-21](#tc-21) | Out of Stock dish is marked and cannot be added | Medium | AC2, AC4 |
| [TC-22](#tc-22) | Dish that went On Stop after the menu loaded cannot be added | High | AC3, AC4, AC5 |
| [TC-23](#tc-23) | Status change is shown after a page reload | High | AC5 |
| [TC-24](#tc-24) | Price change and new dish are shown after a page reload | Medium | AC5 |
| [TC-25](#tc-25) | Loading state is shown while the menu loads | Low | R-27 (missing AC) |
| [TC-26](#tc-26) | Empty menu shows a message | Medium | R-27 (missing AC) |
| [TC-27](#tc-27) | Menu load error shows a message and a way to retry | Medium | R-27 (missing AC) |
| [TC-28](#tc-28) | Menu works on a 375 px mobile screen | Medium | R-28 (missing NFR) |
| [TC-29](#tc-29) | Menu can be used with the keyboard only | Low | R-28 (missing NFR) |

## Test cases

### TC-01

**Guest who joined an open group pre-order sees the menu**

- **Priority:** High
- **Requirement:** Pre-condition 1, 2; AC1
- **Preconditions:** R1 is Reserved, group is Open. Guest has the invite link and has not joined yet.
- **Test data:** R1, L1
- **Assumption / finding:** A-2

| # | Step |
|---|---|
| 1 | Open the R1 invite link in a new browser. |
| 2 | Enter the name "Anna" and confirm. |

**Expected result:**

- The menu screen opens.
- Dishes of L1 are shown.

### TC-02

**Guest cannot add dishes after the Owner submitted the group pre-order**

- **Priority:** High
- **Requirement:** Pre-condition 2
- **Preconditions:** G1 joined R1. The Owner submitted the group pre-order (group = Submitted).
- **Test data:** R1, G1, D1
- **Assumption / finding:** A-2 (R-06, R-07, R-08)

| # | Step |
|---|---|
| 1 | As G1, reload the menu page. |
| 2 | Click Pre-Order on D1. |

**Expected result:**

- G1 sees a message that the group pre-order is closed.
- D1 is not added to the subcart.

### TC-03

**Guest cannot add dishes when the reservation is cancelled**

- **Priority:** High
- **Requirement:** Pre-condition 2
- **Preconditions:** G1 joined R1. The Owner cancelled R1 (reservation = Cancelled). The group was not submitted.
- **Test data:** R1, G1, D1
- **Assumption / finding:** A-2 (R-06, R-07, R-08)

| # | Step |
|---|---|
| 1 | As G1, reload the menu page. |
| 2 | Click Pre-Order on D1. |

**Expected result:**

- G1 sees a message that the reservation is cancelled.
- D1 is not added to the subcart.

### TC-04

**Menu is not usable before the guest enters a name**

- **Priority:** Medium
- **Requirement:** Pre-condition 1
- **Preconditions:** Guest opens the R1 invite link for the first time.
- **Test data:** R1
- **Assumption / finding:** —

| # | Step |
|---|---|
| 1 | Open the R1 invite link. |
| 2 | Try to close the name dialog with Esc and with the close (X) button. |
| 3 | Press Tab several times to reach a Pre-Order button. |

**Expected result:**

- The name dialog stays open.
- No Pre-Order button can be reached or clicked until the guest joins.

### TC-05

**Menu shows all dishes of the reservation's location and only them**

- **Priority:** High
- **Requirement:** Description; AC1
- **Preconditions:** G1 joined R1.
- **Test data:** L1 (D1–D7), L2 (D8)
- **Assumption / finding:** A-1 (R-05)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Compare the dishes shown with the L1 dish list in the admin panel or API. |

**Expected result:**

- All 7 dishes of L1 are shown, including unavailable D4 and D5.
- D8 (from L2) is not shown.

### TC-06

**Dishes are grouped by category in a fixed order**

- **Priority:** High
- **Requirement:** AC1
- **Preconditions:** G1 joined R1.
- **Test data:** D1–D7
- **Assumption / finding:** A-3 (R-09, R-10)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Check the category groups and their order. |

**Expected result:**

- Groups appear in this order: Appetizers (D1, D6), Main Courses (D2, D4, D7), Desserts (D3, D5).
- Each dish appears in exactly one group, and it is the correct one.

### TC-07

**Empty category is hidden**

- **Priority:** Low
- **Requirement:** AC1
- **Preconditions:** Admin removed all desserts (D3, D5) from L1. G1 joined R1.
- **Test data:** L1 without desserts
- **Assumption / finding:** A-3 (R-09)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |

**Expected result:**

- No Desserts group or tab is shown.
- No empty section is left on the page.

### TC-08

**Dish card shows name, price, weight, image and status**

- **Priority:** High
- **Requirement:** AC2
- **Preconditions:** G1 joined R1.
- **Test data:** D1
- **Assumption / finding:** A-9 (R-15)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Find the D1 card and compare it with the D1 data in the admin panel or API. |

**Expected result:**

- The card shows: name, price, weight in grams, image and availability status.
- Every value matches the source data.

### TC-09

**Price is shown with currency and two decimals**

- **Priority:** Medium
- **Requirement:** AC2
- **Preconditions:** G1 joined R1. Admin set D2 price = 9.
- **Test data:** D1 = 12.5, D2 = 9
- **Assumption / finding:** A-6 (R-12)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Read the D1 and D2 prices. |

**Expected result:**

- D1 shows "$12.50".
- D2 shows "$9.00".

### TC-10

**Serving size is shown in grams**

- **Priority:** Medium
- **Requirement:** AC2
- **Preconditions:** G1 joined R1.
- **Test data:** D1 weight = 250
- **Assumption / finding:** A-6 (R-13)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Read the weight on the D1 card. |

**Expected result:**

- The weight is shown as "250 g".

### TC-11

**Dish without an image shows a placeholder**

- **Priority:** Low
- **Requirement:** AC2
- **Preconditions:** G1 joined R1.
- **Test data:** D6 (no image)
- **Assumption / finding:** R-14

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Find the D6 card. |

**Expected result:**

- A placeholder image is shown, with no broken-image icon.
- The card layout matches the other cards.
- The image alt text is the dish name.

### TC-12

**Long dish name does not break the card**

- **Priority:** Low
- **Requirement:** AC2
- **Preconditions:** G1 joined R1.
- **Test data:** D7 (name > 60 chars)
- **Assumption / finding:** —

| # | Step |
|---|---|
| 1 | Open the menu as G1 at 1440 px and at 375 px width. |
| 2 | Find the D7 card. |

**Expected result:**

- The name wraps or is shortened with "…", and the full name can still be read.
- Price, weight and the Pre-Order button stay visible and aligned.

### TC-13

**Available dish shows its availability status**

- **Priority:** Medium
- **Requirement:** AC2
- **Preconditions:** G1 joined R1.
- **Test data:** D1 (Available)
- **Assumption / finding:** A-9 (R-15)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Check the D1 card for an availability status. |

**Expected result:**

- D1 shows the status "Available" (or the label the design defines).

### TC-14

**Guest adds an available dish to the subcart**

- **Priority:** High
- **Requirement:** AC3
- **Preconditions:** G1 joined R1. G1's subcart is empty.
- **Test data:** D1
- **Assumption / finding:** A-5, A-8 (R-20, R-21)

| # | Step |
|---|---|
| 1 | Click Pre-Order on D1. |
| 2 | Open the subcart. |

**Expected result:**

- A confirmation is shown after step 1.
- The subcart has D1 with quantity 1, price $12.50 and total $12.50.

### TC-15

**Adding the same dish twice increases the quantity**

- **Priority:** Medium
- **Requirement:** AC3
- **Preconditions:** G1 joined R1. G1's subcart is empty.
- **Test data:** D1
- **Assumption / finding:** A-5 (R-20)

| # | Step |
|---|---|
| 1 | Click Pre-Order on D1 two times. |
| 2 | Open the subcart. |

**Expected result:**

- The subcart has one D1 line with quantity 2.
- The total is $25.00.

### TC-16

**Guest adds dishes from different categories**

- **Priority:** Medium
- **Requirement:** AC3
- **Preconditions:** G1 joined R1. G1's subcart is empty.
- **Test data:** D1, D2, D3
- **Assumption / finding:** A-5

| # | Step |
|---|---|
| 1 | Click Pre-Order on D1, D2 and D3. |
| 2 | Open the subcart. |

**Expected result:**

- The subcart has 3 lines with quantity 1 each.
- The total equals the sum of the 3 prices.

### TC-17

**Subcart is personal to each guest**

- **Priority:** High
- **Requirement:** AC3
- **Preconditions:** G1 (browser A) and G2 (browser B) joined R1. Both subcarts are empty.
- **Test data:** G1, G2, D1
- **Assumption / finding:** R-18

| # | Step |
|---|---|
| 1 | In browser A, as G1, click Pre-Order on D1. |
| 2 | In browser B, as G2, open the subcart. |
| 3 | In browser A, as G1, open the subcart. |

**Expected result:**

- G2's subcart is empty.
- G1's subcart has D1.

### TC-18

**On Stop dish is clearly marked as unavailable**

- **Priority:** High
- **Requirement:** AC4
- **Preconditions:** G1 joined R1.
- **Test data:** D4 (On Stop)
- **Assumption / finding:** R-23

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Find the D4 card. |

**Expected result:**

- D4 has the text label "On Stop" (not only a colour).
- The card looks different from available dishes (e.g., greyed out).

### TC-19

**On Stop dish cannot be added with the mouse**

- **Priority:** High
- **Requirement:** AC4
- **Preconditions:** G1 joined R1. G1's subcart is empty. DevTools Network tab is open.
- **Test data:** D4 (On Stop)
- **Assumption / finding:** R-23

| # | Step |
|---|---|
| 1 | Click Pre-Order on D4. |
| 2 | Click on the D4 card itself. |
| 3 | Open the subcart. |

**Expected result:**

- The Pre-Order button is disabled.
- No confirmation is shown and no add-dish request is sent.
- The subcart is empty.

### TC-20

**On Stop dish cannot be added with the keyboard**

- **Priority:** Medium
- **Requirement:** AC4
- **Preconditions:** G1 joined R1. G1's subcart is empty.
- **Test data:** D4 (On Stop)
- **Assumption / finding:** R-23

| # | Step |
|---|---|
| 1 | Use Tab to move focus to the D4 card. |
| 2 | Press Enter, then Space. |
| 3 | Open the subcart. |

**Expected result:**

- D4's Pre-Order button cannot be activated from the keyboard.
- The subcart is empty.

### TC-21

**Out of Stock dish is marked and cannot be added**

- **Priority:** Medium
- **Requirement:** AC2, AC4
- **Preconditions:** G1 joined R1. G1's subcart is empty.
- **Test data:** D5 (Out of Stock)
- **Assumption / finding:** A-4 (R-16)

| # | Step |
|---|---|
| 1 | Open the menu as G1. |
| 2 | Check the D5 card. |
| 3 | Click Pre-Order on D5. |

**Expected result:**

- D5 has the label "Out of Stock".
- The button is disabled, and D5 is not added.

### TC-22

**Dish that went On Stop after the menu loaded cannot be added**

- **Priority:** High
- **Requirement:** AC3, AC4, AC5
- **Preconditions:** G1 joined R1 and has the menu open. D2 is Available.
- **Test data:** D2
- **Assumption / finding:** A-8 (R-22)

| # | Step |
|---|---|
| 1 | Admin sets D2 to On Stop. |
| 2 | Without reloading, G1 clicks Pre-Order on D2. |
| 3 | Open the subcart. |

**Expected result:**

- G1 sees an error saying D2 is no longer available.
- D2 is not added to the subcart.

### TC-23

**Status change is shown after a page reload**

- **Priority:** High
- **Requirement:** AC5
- **Preconditions:** G1 joined R1 and has the menu open. D2 is Available.
- **Test data:** D2
- **Assumption / finding:** A-7 (R-26)

| # | Step |
|---|---|
| 1 | Admin sets D2 to On Stop. |
| 2 | G1 reloads the page. |
| 3 | Admin sets D2 back to Available. |
| 4 | G1 reloads the page. |

**Expected result:**

- After step 2, D2 is shown as On Stop and cannot be added.
- After step 4, D2 is Available and can be added.

### TC-24

**Price change and new dish are shown after a page reload**

- **Priority:** Medium
- **Requirement:** AC5
- **Preconditions:** G1 joined R1 and has the menu open.
- **Test data:** D1 new price 14; new dish D9 (Dessert, Available)
- **Assumption / finding:** A-6, A-7

| # | Step |
|---|---|
| 1 | Admin changes the D1 price to 14 and adds D9 to L1. |
| 2 | G1 reloads the page. |

**Expected result:**

- D1 shows "$14.00".
- D9 appears under Desserts.

### TC-25

**Loading state is shown while the menu loads**

- **Priority:** Low
- **Requirement:** R-27 (missing AC)
- **Preconditions:** G1 joined R1. DevTools network throttling = Slow 3G.
- **Test data:** —
- **Assumption / finding:** R-27

| # | Step |
|---|---|
| 1 | Reload the menu page. |

**Expected result:**

- A loading indicator is shown until the dishes appear.
- No error or "empty menu" message flashes during loading.

### TC-26

**Empty menu shows a message**

- **Priority:** Medium
- **Requirement:** R-27 (missing AC)
- **Preconditions:** Reservation at L3 (no dishes), group Open, guest joined.
- **Test data:** L3
- **Assumption / finding:** R-27

| # | Step |
|---|---|
| 1 | Open the menu. |

**Expected result:**

- A clear message says the menu is empty.
- The page layout is not broken.

### TC-27

**Menu load error shows a message and a way to retry**

- **Priority:** Medium
- **Requirement:** R-27 (missing AC)
- **Preconditions:** G1 joined R1. In DevTools, block the menu request (or go offline).
- **Test data:** —
- **Assumption / finding:** R-27

| # | Step |
|---|---|
| 1 | Reload the menu page. |
| 2 | Unblock the request (or go online) and retry. |

**Expected result:**

- An error message is shown, and the page does not crash.
- After the retry, the menu loads.

### TC-28

**Menu works on a 375 px mobile screen**

- **Priority:** Medium
- **Requirement:** R-28 (missing NFR)
- **Preconditions:** G1 joined R1. Browser width = 375 px (DevTools device mode).
- **Test data:** D1–D7
- **Assumption / finding:** R-28

| # | Step |
|---|---|
| 1 | Open the menu. |
| 2 | Scroll through all categories. |
| 3 | Click Pre-Order on D1. |

**Expected result:**

- No horizontal scrolling.
- Cards, prices and statuses are readable.
- D1 is added.

### TC-29

**Menu can be used with the keyboard only**

- **Priority:** Low
- **Requirement:** R-28 (missing NFR)
- **Preconditions:** G1 joined R1.
- **Test data:** D1, D4
- **Assumption / finding:** R-28

| # | Step |
|---|---|
| 1 | Use Tab to go through the menu. |
| 2 | Press Enter on D1's Pre-Order button. |

**Expected result:**

- Focus is visible and moves in a logical order.
- D1 is added.
- The status of D4 is shown as text, not only by colour.
