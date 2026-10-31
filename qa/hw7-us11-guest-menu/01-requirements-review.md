# US11 — Requirements review

**Story:** `[Draft] US11_Guest Viewing Reservation Menu` (Epic: Order Management, Role: Guest). Source: course PDF, 1 page.
**Design:** the Figma file has not arrived yet, so the design checks are still open (see the end of this file).
**Method:** each line of the story was checked for clear meaning, testability, consistency, completeness and scope. Status names were checked against the backend code in this repository.

## The story as written

> **Description:** As a Guest, I want to see the full restaurant menu, so that I know what options are available and can decide what to choose.
>
> **Pre-conditions:**
> - Guest has successfully joined the session (US_G10).
> - The parent reservation or group session status is in Created/"Reserved".
>
> **Acceptance Criteria:**
> 1. The Guest can view the full restaurant menu structured logically by category (e.g., Appetizers, Main Course, Desserts).
> 2. Each menu item must clearly display name, price, serving size in grams, image and current availability status.
> 3. The Guest can add an available dish directly to their personal subcart by interacting with a clear action button (e.g., "Pre-order").
> 4. Items currently marked "On Stop" are clearly indicated as unavailable and cannot be selected or added to the cart.
> 5. The menu reflects the current data at the time the Guest opens or refreshes the screen.

## Summary

**29 findings: 9 High, 14 Medium, 6 Low.**

| Severity | Meaning |
|---|---|
| High | A core flow has no single correct expected result. A tester cannot say pass or fail without a decision from the PO. |
| Medium | A test can be written, but only on an assumption that the PO must confirm. |
| Low | Wording, format or a minor edge case. |

**The five questions to resolve first:**
1. **R-06, R-07:** which statuses allow the menu? "Created" doesn't exist in the system, and "reservation **or** group" doesn't say which one decides.
2. **R-04:** is adding to the subcart part of this story? The description covers only viewing.
3. **R-16:** the system has three dish states (Available, On Stop, Out of Stock), but the story describes only On Stop.
4. **R-09:** what "structured logically by category" means in the UI: sections or filter tabs, and in what order.
5. **R-20, R-22:** the quantity rules and the errors when adding a dish.

## Findings

Type: **Ambiguity** = more than one reading. **Not testable** = no objective pass/fail. **Missing** = a case is not covered. **Inconsistency** = two parts contradict each other or the system. **Scope** = the story mixes features. **Process** = readiness of the story.

### General

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-01 | Title | Process | Medium | The story is marked **[Draft]**. If the wording changes, test cases need rework. | Confirm that this version is final for testing (Definition of Ready). |
| R-02 | Title, US name, pre-condition 1 | Inconsistency | Low | Three naming styles: "US11_Guest Viewing Reservation Menu", "Guest Reservation and Menu View", and the link "US_G10". Both names mention the reservation, but no AC covers reservation details. | Use one ID format (e.g., US_G11). Either add an AC for the reservation details on the screen (address, date, time, table) or remove "Reservation" from the name. |
| R-03 | Whole story | Missing | Medium | No design link, no priority, no out-of-scope list, no non-functional requirements. | Add a Figma link for each AC, a priority, and an out-of-scope list. |

### Scope and description

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-04 | Description vs AC3 | Scope | High | The description is about **viewing** ("so that I know what options are available"). AC3 adds **adding to the cart**, a separate action with its own rules: quantity, errors, feedback. | Split it into "view menu" (this story) and "add dish to subcart" (a new story), or extend the description and add the missing ACs (R-20 to R-22). |
| R-05 | Description, AC1 | Ambiguity | High | "Full restaurant menu": the restaurant has several locations, and each location has its own dishes. Is this the menu of the **reservation's location** or of the whole chain? Does "full" include unavailable dishes? AC4 suggests yes. | "The Guest sees all dishes of the location where the reservation is made, including unavailable ones." |

### Pre-conditions

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-06 | Pre-condition 2 | Inconsistency | High | **"Created" is not a status in the system.** Reservation statuses are `Reserved / Cancelled / InProgress / Completed`. Group statuses are `Open / Submitted / Closed`. Both lists were checked in the backend code. | Name the exact statuses, e.g., "reservation = Reserved **and** group = Open". |
| R-07 | Pre-condition 2 | Ambiguity | High | "Reservation **or** group session" doesn't say which one decides. Example: the reservation is `Reserved`, but the Owner has already submitted the group pre-order (group = `Submitted`). Can the Guest still add dishes? | Define the rule for both entities with **and**. |
| R-08 | Pre-conditions | Missing | High | No expected behaviour when a pre-condition fails: reservation cancelled or finished, group submitted or closed, guest not joined, link expired. | Add an AC for each case: what the Guest sees (message, read-only menu or redirect) and whether adding is blocked. |

### AC1: categories

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-09 | AC1 | Not testable | High | "Structured logically" is subjective. Open points: sections with headings or filter tabs? Order of categories? Default view? Is an empty category shown? How are dishes ordered inside a category? | "Dishes are grouped into sections in this order: Appetizers, Main Courses, Desserts. Empty sections are hidden. Inside a section, dishes are sorted by …" |
| R-10 | AC1 | Ambiguity | Low | The category list is given only as an example ("e.g."). The labels mix singular and plural: "Main Course" vs "Appetizers", "Desserts". | Fix the final list and the exact labels. |

### AC2: dish card

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-11 | AC2 | Not testable | Medium | "Clearly display" is subjective. | Point to the Figma frame for layout. Keep the AC for content only. |
| R-12 | AC2 | Missing | Medium | No price format: currency, decimals, rounding. | e.g., "$12.50": currency sign and 2 decimals. |
| R-13 | AC2 | Ambiguity | Medium | "Serving size in grams": display format (`350 g`?), what to show when the weight is missing, and what to do with drinks (ml). | Define the format and a fallback. |
| R-14 | AC2 | Missing | Low | No fallback when a dish has no photo or the photo fails to load. No rule for alt text. | Placeholder image; alt text = dish name. |
| R-15 | AC2 vs AC4 | Ambiguity | Medium | "Current availability status": must **Available** be shown as a label, or are only unavailable dishes marked? AC2 says "each menu item", while AC4 talks only about unavailable ones. | State it explicitly: a label on every dish, or only on unavailable dishes. |
| R-16 | AC2, AC4 | Missing | High | The dish states are not listed. AC4 covers only **On Stop**, but the system also has **Out of Stock** (backend `DishState`: `OnStop`, `Available`, `OutOfStock`). Out of Stock behaviour is undefined. | List every state with its label and behaviour. |
| R-17 | AC2 | Missing | Low | The dish also has a description, calories and macros. Should they be shown? Does clicking a dish open its details? | Clarify, or mark as out of scope. |

### AC3: adding to the subcart

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-18 | AC3 vs AC4 | Inconsistency | Medium | AC3 says "personal subcart", AC4 says "cart". "Subcart" is not defined. | Add a glossary entry: subcart = the Guest's own part of the group pre-order. Use one term. |
| R-19 | AC3 | Not testable | Medium | The button label is only an example: "e.g., 'Pre-order'". | Fix the label from Figma. |
| R-20 | AC3 | Missing | High | No quantity rules. Does one click add +1? Does adding the same dish twice give quantity 2 or two lines? Is there a maximum? | Define them. |
| R-21 | AC3 | Missing | Medium | No feedback after adding: toast, cart counter, or button state. | Define the confirmation. |
| R-22 | AC3 | Missing | High | Errors are not covered: network error, dish went On Stop after the menu loaded, group was submitted in the meantime. | Define the message for each, and confirm the dish is not added. |

### AC4: unavailable dishes

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-23 | AC4 | Not testable | Medium | "Clearly indicated": how? Badge text, greyed card, disabled button? "Cannot be selected": what is "select"? Opening details, clicking the card, keyboard focus? | Define it from Figma, e.g., badge "On Stop", greyed card, disabled button, no click action. |
| R-24 | AC4 | Missing | Medium | A dish already in the Guest's subcart becomes On Stop. What happens to it? | Define: remove it with a notice, or keep it and block submit, or another rule. |
| R-25 | AC4 | Missing | Low | Where do unavailable dishes appear: in their normal place or at the end of the category? | Define. |

### AC5: data freshness

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-26 | AC5 | Ambiguity | Medium | "Current data at the time the Guest opens or refreshes the screen" means there are no live updates. Is that intended? Does "refreshes" mean a browser reload or a refresh control in the app? | Confirm: "no automatic updates; data updates only on page reload". Or define an auto-refresh interval. |

### Missing states and non-functional requirements

| ID | Where | Type | Sev. | Problem | Question for the PO / suggested fix |
|---|---|---|---|---|---|
| R-27 | Whole story | Missing | Medium | No AC for loading, an empty menu, or a menu that fails to load. | Add an AC for each state, with the message and a retry action. |
| R-28 | Whole story | Missing | Medium | No non-functional requirements: mobile layout (guests open the invite link on a phone), load time, supported browsers, accessibility (keyboard use; status shown not only by colour). | Add them, or link to the project-wide non-functional requirements. |
| R-29 | Whole story | Missing | Low | Search, filtering and sorting are not mentioned. | If the design has them, add them to the story. If not, mark them out of scope. |

## Assumptions used in the test cases

Until the PO answers, the test cases use these assumptions. Every test that relies on one says so in its "Assumption" field.

| ID | Assumption | Linked findings |
|---|---|---|
| A-1 | The menu contains all dishes of the reservation's location, including unavailable ones. Dishes of other locations are not shown. | R-05 |
| A-2 | The menu is usable only when the reservation is `Reserved` **and** the group is `Open`. Otherwise the Guest sees a message and cannot add dishes. | R-06, R-07, R-08 |
| A-3 | Categories appear in this order: Appetizers, Main Courses, Desserts. An empty category is hidden. | R-09, R-10 |
| A-4 | **Out of Stock** behaves like On Stop: the dish is visible, marked with its own label, and cannot be added. | R-16 |
| A-5 | One click on Pre-Order adds 1. Adding the same dish again increases the quantity on the same line. | R-20 |
| A-6 | Price format `$12.50`; weight format `250 g`. | R-12, R-13 |
| A-7 | No live updates: changes appear after a page reload. | R-26 |
| A-8 | After a successful add, the Guest sees a confirmation. After a failed add, the Guest sees an error, and the dish is not added. | R-21, R-22 |
| A-9 | AC2 is read literally: every dish shows its availability status, including "Available". | R-15 |

## Design checks still open (waiting for the Figma file)

- Compare each AC with the Figma screens: card fields, labels, badge text, button text, category layout.
- Note anything in the design that the story doesn't mention (sorting, filters, cart icon, dish details), and anything in the story that the design doesn't show.
