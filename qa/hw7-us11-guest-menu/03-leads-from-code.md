# US11 — Leads from reading the code

Before the screenshot arrived, I read the guest menu code in this repository to find where the app would probably fail US11. This file records each lead and what the course screenshot later showed.

Paths are relative to the repository root.
FE = `frontend/restaurant-frontend-app/src/app/`, BE = `backend/restaurant-backend-app/dnapp/lambdas/api-handler/`.

| ID | Req. | What the code does | Result |
|---|---|---|---|
| L-1 | AC2, AC4 | The guest page replaces the status of every dish that cannot be ordered with `OutOfStock` (FE `pages/guest-pre-order-page/guest-pre-order-page.component.ts:130`). The backend sends `OnStop` for these dishes (BE `Models/Dishes/GuestMenuDish.cs:31`). | **Matches the screenshot:** both unavailable dishes say "Out Of Stock", and the page never shows "On Stop". BUG-03. |
| L-2 | AC2 | The dish card shows a status badge only for unavailable dishes (FE `shared/custom-components/dish-card/dish-card.component.html:11`). | **Confirmed:** "Margherita Pizza" has no status. BUG-06. |
| L-3 | AC1 | The default view "All dishes" is one grid with no category headings. Categories exist only as filter buttons (FE `guest-pre-order-page.component.ts:49-50`). | **Confirmed.** BUG-04. |
| L-4 | AC1 | The backend groups dishes in the order they come from the database (BE `Services/GuestSessions/GuestSessionService.cs:90`). The frontend keeps that order. | Not visible: the screenshot shows only 2 categories. Covered by TC-07. |
| L-5 | AC2 | The weight is shown exactly as stored (FE `dish-card.component.html:20`). | **Confirmed:** "200g" and "350g" next to "450 g". BUG-08. |
| L-6 | AC3, AC4 | Adding a dish that is no longer available returns `400` with the text `Dish '<id>' is currently unavailable. State: 'OnStop'.` (BE `GuestSessionService.cs:110`). The guest error handler shows the server text in a toast (FE `auth/token.interceptor.ts:23-40`). | Not visible on a static screenshot. Covered by TC-25. |

## Found in the code while writing the defect reports

| Defect | What the code shows |
|---|---|
| BUG-02 | The strip shows only the address, table and time (FE `pages/guest-pre-order-page/guest-pre-order-page.component.html`). The date is already available (`dateText` in `state/guest-preorder.store.ts`), and the "You're Invited!" pop-up shows it, but the strip doesn't use it. |
| BUG-05 | "Reservations" and the profile icon appear only for a logged-in Customer. A logged-out Guest gets "Main page", "Book a Table" and [Sign In] (FE `shared/custom-components/header/header.component.html`). Neither is the Figma Guest header. |
| BUG-07 | The sort options are "Recommended", "Price: Low to high" and "Price: High to low" (FE `guest-pre-order-page.component.html`). "Popular First" and "Newest First" are missing. |

## Checked: probably fine

| Area | What the code does | Test case |
|---|---|---|
| Cancelled reservation | When a reservation leaves `Reserved`, the backend closes its group (BE `Services/Reservations/ReservationService.cs:125`). The menu and add-dish endpoints then reject the request (BE `GuestSessionService.cs:253-257`). **The message the Guest sees still needs checking.** | TC-03, TC-04 |
| Price format | `currency: '$'` gives `$12.00`, which matches the screenshot (FE `dish-card.component.html:19`). | TC-13 |
| Missing image | An empty image URL is replaced with `assets/img/dish.png`, and the alt text is the dish name (FE `guest-pre-order-page.component.ts:128`, `dish-card.component.html:14`). A **broken** image URL has no fallback. | TC-16 |
