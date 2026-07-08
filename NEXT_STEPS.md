# Next Steps & Critical Fixes

This document is a checklist of all the critical bugs found and the steps required to fix them. Use this as a guide for the next development session.

---

### 1. Critical Bug: `messageModel.js` is missing the `channel` field.

- **Problem:** The `channel` field ('whatsapp', 'instagram_dm', etc.) is being set in the webhook controllers, but it does not exist in the `messageModel.js` schema. Because of this, Mongoose is silently dropping this field, and the data retention policy cannot work correctly.
- **Solution:** Add the `channel` field to `messageSchema`.

---

### 2. Critical Bug: Crash risk in `instagram.webhook.controller.js`.

- **Problem:** After replacing the local `getExpiry()` function with the new `getMessageExpiry()` utility, one call to the old, undefined `getExpiry('junk')` function was left behind in the button-click automation block. This will cause a `ReferenceError` and crash the server when triggered.
- **Solution:** Replace the remaining `getExpiry('junk')` call with `getMessageExpiry(user, 'instagram_dm')`.

---

### 3. Inconsistency: Incomplete retention policy in `whatsapp.webhook.controller.js`.

- **Problem:** Several `Message.create()` calls within the WhatsApp webhook are still missing the `channel` and `expiresAt` fields. This makes the data retention inconsistent, and these messages will never be auto-deleted.
- **Solution:** Manually audit all `Message.create()` calls in the file and add the required fields (`channel: 'whatsapp'` and `expiresAt: getMessageExpiry(...)`).

---

### 4. File Path Fix: `TESTING_GUIDE.md` is in the wrong folder.

- **Problem:** The testing guide is inside `backend/src/controllers`, but it should be in the `backend` root folder for better project structure.
- **Solution:** Move the file using the command prompt.
  ```cmd
  move backend\src\controllers\TESTING_GUIDE.md backend\TESTING_GUIDE.md
  ```

---

### 5. File Path Fix: `trashCleanup.js` has incorrect `require` paths.

- **Problem:** After moving `trashCleanup.js` to the root `jobs/` folder, the `require` paths inside it (for `leadModel`) and in `server.js` (which calls the job) are now incorrect.
- **Solution:** Update the relative paths in both `server.js` and `jobs/trashCleanup.js`.

---