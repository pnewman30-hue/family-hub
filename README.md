# Newman Family Hub App

Installable wall-display app for the Newman Family Hub. It loads every card live from the
Family Hub Google Sheet through an Apps Script web app and refreshes every 2 minutes and
whenever the screen wakes. No family data is stored in these files.

- `school/` is the Newman School Tracker for Ella and Olivia.
- `ella/` only forwards to the School Tracker; Ella's separate dashboard is retired.
- `tools/learncrawl.js` is the CTLS Learn crawl run by the scheduled refresh.

The Apps Script web app link is private and is never written into these files, because this
repository is public. Each device saves it once, from the family setup link or the app's
Connect box, and the crawl receives it from the scheduled refresh (`window.__FEED`).
