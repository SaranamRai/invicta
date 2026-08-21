Summary of changes made to fix admin tournament registration toggle

- backend/controllers/adminController.js
  - Added `toggleTournamentRegistration` handler to support updating `registrationOpen`.
  - Handler matches on either MongoDB `_id` or a string `id` field.
  - Removed temporary debug logging.

- backend/routes/adminRoutes.js
  - Added `PATCH /api/admin/tournaments/:id/registration` route.

- src/lib/api.ts
  - Added `toggleAdminTournamentRegistration()` helper.
  - Improved `apiFetch()` to provide clearer error messages and to fallback to `PUT` when `PATCH` returns 404.

- src/components/admin/tournament-manager.tsx
  - Switched toggle to use `toggleAdminTournamentRegistration()` and added session check.
  - Replaced `alert()` notifications with inline `errorMessage` and `successMessage` UI.
  - Ensure tournament `id` is always a string in component state.

- scripts/test-toggle.js
  - Added a Node test script that logs in, creates a tournament, and toggles registration.

- package.json
  - Added `test:toggle` script to run the test script.

Notes
- Run the backend with the updated code and then run `node scripts/test-toggle.js` or `npm run test:toggle` to verify the toggle flow.
- Consider removing `scripts/test-toggle.js` or converting it into an automated test harness later.
