# US11 — Leads from reading the code (not tested yet)

**What this is:** places where the code in this repository will probably not match US11 or the test cases.
**What this is not:** defects. None of these has been run. A lead becomes a defect report only after a test case fails on the app, or on the course screenshot.

Paths are relative to the repository root.
FE = `frontend/restaurant-frontend-app/src/app/`, BE = `backend/restaurant-backend-app/dnapp/lambdas/api-handler/`.

| ID | Req. | What the code does | Why it may fail | Test case |
|---|---|---|---|---|
| L-1 | AC4 | The guest page replaces the state of every dish that cannot be ordered with `OutOfStock` (FE `pages/guest-pre-order-page/guest-pre-order-page.component.ts:130`). The backend sends `OnStop` for these dishes (BE `Models/Dishes/GuestMenuDish.cs:31`). | An **On Stop** dish will probably show the badge **"Out Of Stock"**. AC4 names the status "On Stop". | TC-18 |
| L-2 | AC2 | The dish card shows a status badge only for unavailable dishes (FE `shared/custom-components/dish-card/dish-card.component.html:11`). | Available dishes show no status. That is a defect if the PO confirms assumption A-9 (finding R-15). | TC-08, TC-13 |
| L-3 | AC1 | The default view "All dishes" is one grid with no category headings. Categories exist only as filter buttons (FE `guest-pre-order-page.component.ts:49-50`). | Whether this counts as "structured by category" depends on finding R-09. | TC-06 |
| L-4 | AC1 | The backend groups dishes in the order they come from the database (BE `Services/GuestSessions/GuestSessionService.cs:90`). The frontend keeps that order. | The category order is not fixed. Desserts may appear before Appetizers. | TC-06 |
| L-5 | AC2 | The weight is shown exactly as stored (FE `dish-card.component.html:20`). | The unit "g" appears only if the admin typed it. | TC-10 |
| L-6 | AC3, AC4 | Adding a dish that is no longer available returns `400` with the text `Dish '<id>' is currently unavailable. State: 'OnStop'.` (BE `GuestSessionService.cs:110`). The guest error handler shows the server text in a toast (FE `auth/token.interceptor.ts:23-40`). | The guest may see an internal dish ID and an enum name instead of a clear message. | TC-22 |

## Checked: probably fine

| Area | What the code does | Test case |
|---|---|---|
| Cancelled reservation | When a reservation leaves `Reserved`, the backend closes its group (BE `Services/Reservations/ReservationService.cs:125`). The menu and add-dish endpoints then reject the request (BE `GuestSessionService.cs:253-257`). **The text the guest sees still needs checking.** | TC-02, TC-03 |
| Price format | `currency: '$'` gives `$12.50` (FE `dish-card.component.html:19`). | TC-09 |
| Missing image | An empty image URL is replaced with `assets/img/dish.png`, and the alt text is the dish name (FE `guest-pre-order-page.component.ts:128`, `dish-card.component.html:14`). A **broken** image URL has no fallback. | TC-11 |
