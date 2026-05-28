# Free tier: active vault items (“choose 8”) — product and security design

This document describes the **intended** behavior when a **Free** plan imposes a **small cap on how many vault items can be actively used at once** (for example **8 items**), while users may still have **many more** ciphertext rows on the server after a **downgrade from Pro** (or similar). It is written for **product**, **support**, and **engineering** so implementation can stay aligned with security and UX goals.

**Scope here:** credentials and other **non-file** vault item types that the Free tier is allowed to support. **File-type vault items** are out of scope for this policy on Free: they are **not offered** (or are blocked) on Free so users are not asked to “spend” active slots on file blobs in this model.

**Companion constraints:** [architecture-security-and-threats.md](./architecture-security-and-threats.md) (trust boundaries), [security-program-and-hardening-roadmap.md](./security-program-and-hardening-roadmap.md) (server-side enforcement and abuse limits), [vault-crypto-and-data-lifecycle.md](./vault-crypto-and-data-lifecycle.md) (per-item encryption, no server plaintext).

---

## 1. Problem statement

- A user may have **hundreds of encrypted items** while on a paid tier.
- After **downgrade to Free**, the product may only allow **N active items** (e.g. **8**) for normal day-to-day use.
- The business requires:
  - **No silent deletion** of the user’s ciphertext.
  - **No “free account that still behaves like Pro”** for unlimited items.
  - A **clear, fair, and easy** way to stay within the limit **without** trapping the user (they must be able to **export** or **upgrade**).

---

## 2. Core idea: “active set” vs “retained set”

| Concept | Meaning |
|--------|--------|
| **Retained items** | All encrypted vault item rows the server still holds for the account. **Not deleted** because of downgrade. |
| **Active items** | Up to **N** item IDs the user (or a one-time defaulting rule) marks as **active** for the **Free** plan. Only these receive **normal in-app use** (list + open/decrypt in the app under current policy). |
| **Inactive (retained) items** | Still **saved**, but **not available for normal decrypt-in-app** until the user **frees a slot** (moves an active item out) or **upgrades**, subject to the enforcement rules in **Section 4**. |

The user should see copy similar to: **“On Free you can work with 8 items at a time. Choose which 8 stay active. The rest stay in your vault but are paused until you upgrade or change your selection.”**

---

## 3. User experience (keep it very easy)

### 3.1 First time they hit the limit (e.g. after downgrade)

1. **Explain in one screen** what changed: *You have X items; Free includes 8 active items.*
2. Offer **two clear actions**:
   - **“Choose my 8”** — opens a simple picker (search + checklist, with “select recent” / “clear” helpers).
   - **“Remind me later”** (optional) — only if product allows a short grace window; otherwise require selection before full use. Prefer **blocking** until a valid set of ≤ N is saved so the rule cannot be bypassed from day one.

### 3.2 Ongoing use

- A dedicated **“Active items”** (or **“Free plan slots”**) entry under **Settings** or **Vault** shows:
  - **Slots used: k / N**
  - **Manage selection** (same picker)
  - Link to **Export** and **Upgrade**

### 3.3 Changing the active set

- User **deselects** one item and **selects** another, keeping **≤ N** total.
- Provide **short hints**: “Tip: mark items you use weekly as active; keep long-tail secrets inactive until needed.”
- If an item is **inactive**, the list row should show **“Paused (Free tier)”** with actions: **Make active** (if slot free), **Delete**, and **View after upgrade** (or straight **Upgrade** CTA).

### 3.4 Export and recovery path

- **Full vault export** (or account-level “download my blobs”) should remain a **separate, explicit** action so a user is **never** locked out of their own data for refusing to pay. Exact UX belongs with export; this document only requires the **policy** that export is not blocked as punishment for over-limit state.

### 3.5 Files on Free

- **File vault items** are **not in scope** for the “8 slots” mechanic on Free: the product should **not** count or manage file items against these slots. If file items exist on the account, they should be **hidden or blocked** on Free with a single clear message, so users are not forced to juggle file blobs inside the 8-credential model.

---

## 4. Security and enforcement (why the client is not enough)

**UI-only checks are insufficient.** A user could keep an old client, cached data, or a script. The **authoritative** rule must be enforced where ciphertext is released:

- The **API** (or edge in front of it) should enforce: for **Free + over cap**, **only active item IDs** (and any explicitly allowed read models such as a minimal index row if you keep one) return **ciphertext** for **normal** item fetch paths used by the app to decrypt in session.
- **Inactive** items: server responds with **enough information** to show **presence** (e.g. id, type, label metadata policy permitting) and a **stable reason** (`inactive_on_free_tier` / `not_in_active_set`) **without** returning the **full ciphertext** needed for day-to-day decrypt, **or** returns ciphertext only for **export** endpoints with **stronger rate limits and attestation** (product decision).

**Zero-knowledge posture:** the server should continue to **not** hold **plaintext** secrets or the vault master key. Enforcement is about **which opaque blobs the server will serve** to this session, not about the server “opening” the vault.

**Upgrade restores normal operation:** as soon as the **billing state** is **paid and entitled**, the **active-set restriction is lifted**; all retained items are treated like today’s Pro behavior for fetch/decrypt (subject to existing rate limits and auth). **No** manual “reactivate 500 one by one” after upgrade.

**Audit and abuse:** log **authorization denials** (item id, account id, reason) for support; do **not** log secrets or payload bytes.

---

## 5. Data model and API (engineering sketch)

This section is a **sketch** for a future implementation, not a commitment to field names.

- **Persist** a list (or set) of **active item ids** for the account while on Free, **max N**, validated server-side.
- **Endpoints (conceptual):**
  - `GET` active set (and limit N)
  - `PUT` active set (atomic replace; reject if &gt; N or invalid ids)
  - Existing **get item ciphertext** route checks: **if** plan is Free **and** item not in active set **and** request is not a designated export path **→** `403` with a machine-readable code.

- **Migrations and defaults:** on first downgrade, an optional **default active set** (e.g. **8 most recently updated**) may pre-fill, but the user should **confirm** in UI so there is no surprise about which items stay active.

---

## 6. Acceptance criteria (for when this is built)

- Free user with **&gt; N** items **cannot** decrypt arbitrary items in the main app without either **being within active set** or using an **export** path that is still allowed by policy.
- **Nothing** is deleted on downgrade solely for exceeding N.
- **Upgrade** to an entitled tier **re-enables** full access **without** re-picking 8.
- **File-type** items are **excluded** from the Free “8 active items” model as specified in **Section 3.5**.
- **Copy** in app matches this policy; support can link to this document.

---

## 7. Revision

When the cap **N** or the exact item types for Free change, update this file and [system-reference.md](./system-reference.md) in the billing section in the same change.
