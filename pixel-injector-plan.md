# Tracking Pixel Injector Implementation Plan

## 1. Summary of Current State and What to Build

### Current State

The SideKick extension (WXT-based, React, TypeScript, MV3) currently has:
- **Auth system**: OAuth flow with server (localhost:3000), session management via API, popup-based auth UI
- **Manifest** (wxt.config.ts): permissions `storage`, `tabs`; host_permissions `https://mail.google.com/*`, `http://localhost:5000/*`; runs on Chrome MV3
- **Popup**: Auth state, login/logout flow, dashboard view (currently minimal)
- **Content script**: Currently only active on `*://*.google.com/*` and has commented code for session capture; main() just logs. Also has commented code that matches `http://localhost/*`. Built with WXT's content script framework (includes SPA navigation detection via `wxt:locationchange` events)
- **Background**: Simple service worker; listens for `OPEN_SIGN_IN` messages, opens auth tab. Sets storage.session access level to TRUSTED_AND_UNTRUSTED_CONTEXTS
- **Storage**: Uses browser.storage (session for tokens in API client patterns, also general storage). No pixel/rule storage yet
- **Architecture**: Feature-based (`src/feature/auth`, `src/feature/dashboard`), shared utilities, components in `src/components`

### What to Build

We need to add a **tracking pixel injector** feature that allows users to define pixel rules and inject tracking pixels (typically 1x1 transparent GET image requests) on matched pages. Key capabilities:

- **Define pixel rules**: Each rule has `id`, `name`, `enabled`, `urlPatterns` (regex/globs/host+paths), `pixelUrl` (template with dynamic params), `fireOn` (`"pageLoad" | "spaNavigation"`), optional `selector`/conditions if needed
- **Inject tracking pixels**: When conditions match, create and append an `<img>` tag (or fetch via `fetch` with no-cors) to the document. GET request to pixel URL
- **Support page-load and SPA navigation**: Detect initial page load and subsequent client-side navigations (WXT's content script already provides locationchange events; we need to leverage this)
- **Store rules in browser.storage.local**: Persist rules across browser restarts; rules managed by popup
- **Manage via popup UI**: CRUD interface for pixel rules (create, read, update, enable/disable, delete)

### Feature Scope Summary

The feature should be self-contained under a new `src/feature/tracking-pixel/` (or similar naming consistent with existing `feature/` structure). It will span: popup UI, content script logic, types, storage layer, and potentially background if dynamic host permissions are needed.

## 2. Changes Needed to wxt.config.ts (permissions, host_permissions, etc.)

Current manifest needs updates to support injecting pixels on arbitrary sites and potentially CSP considerations.

**Required changes:**
- **host_permissions**: Currently limited to Gmail and localhost:5000. To inject pixels on any site the user wants to match, we need broad host permissions. Options:
  - Add `<all_urls>` (or `*://*/*`) to `host_permissions` - simplest for a general pixel injector
  - Or use `optional_host_permissions` and request dynamically per rule - more privacy-conscious (MV3 supports this). But the requirement says "inject tracking pixels on matched pages" and "dynamic registration for arbitrary sites" in background changes. Better to support dynamic registration; also need to consider user experience.
  
  Given the spec mentions "dynamic registration for arbitrary sites" (section 5), we should add `optional_host_permissions: ["<all_urls>"]` (or keep explicit minimal set and request as needed). Alternatively, at minimum add support - but easier to start with `<all_urls>` in host_permissions during development? Or use optional permissions. MV3 best practice: use optional_host_permissions for sites user configures.
  
- **permissions**: Already has `storage`, `tabs`. May also need `activeTab` (optional, useful). No scripting permission needed if just injecting img tags (no executeScript dynamic code execution beyond content script). Content scripts are registered declaratively or via WXT; for arbitrary sites, WXT's content script `matches` or `include`/`exclude` could be configured, but with user-defined patterns it's more flexible to have a single content script that runs on broad set or use `host_permissions` + content script with `all_frames` consideration? Or register content scripts dynamically via chrome.scripting.registerContentScripts - but that's more complex. WXT simplifies content script registration via `defineContentScript({ matches, ... })`.
  
  But user can define any URL pattern - regex in rules. Content script needs to run on those pages. Options:
  1. Content script with `matches: ["<all_urls>"]` (or broad) and let the injector logic decide whether to fire based on rule matching. This is simplest and works well with SPA navigation detection.
  2. Dynamically register/unregister content scripts per rule - more efficient but complex in WXT/MV3.
  
  Recommendation: Use a content script that matches `<all_urls>` (or a broad set) and does rule matching internally. This aligns with "inject on matched pages" logic. So add `matches: ["<all_urls>"]` in content script config.

- **Also consider CSP**: Not directly in manifest, but page CSP might block data URIs/imgs from certain origins? Tracking pixels are just GET requests to pixelUrl - injecting `<img src="...">` is generally allowed unless CSP has `img-src 'none'` or strict restrictions. Need to handle gracefully (catch errors). Not a manifest change.

**Proposed wxt.config.ts changes:**
```ts
manifest: {
  name: "SideKick Tracker (RJ)",
  description: "...",
  version: '0.1.2',
  permissions: ["storage", "tabs", "activeTab"],
  optional_host_permissions: ["<all_urls>"],
  host_permissions: [
    "https://mail.google.com/*",
    "http://localhost:5000/*",
    // Keep existing for auth; add optional for dynamic needs
  ],
  action: { default_title: "Sidekick Tracker" },
}
```

But also note: the content script in src/entrypoints/content/index.ts currently has `matches: ['*://*.google.com/*']`. We need to change this to run on sites where pixels might fire. If we want it to work on any matched site, change to `matches: ['<all_urls>']` and also ensure it works for SPA. Also need to consider if we want to limit to http/https (exclude chrome:// etc - WXT/MV3 doesn't allow chrome:// anyway).

Also auth note from requirements: "account for the auth issues noted (especially localhost:3000 host permission) but focus primarily on the pixel injector feature." Current has localhost:5000 and 3000 appear in constants; maybe ensure consistency.

## 3. New Feature Module (types, storage, matcher, logic)

Create a new feature module at `src/feature/tracking-pixel/` (or `tracking-pixel-injector`). Let's follow feature naming pattern.

**Directory structure:**
```
src/feature/tracking-pixel/
  ├── types.ts              # Type definitions for rules
  ├── storage.ts            # Storage layer (CRUD operations)
  ├── matcher.ts            # URL matching logic (regex/glob support)
  ├── injector-logic.ts     # Core logic to decide when to fire and fire pixels
  └── utils.ts              # Helpers (build pixel URL with params, dedup)
```

### 3.1 types.ts
Define pixel rule structure:
```ts
export type FireOn = "pageLoad" | "spaNavigation";

export interface PixelRule {
  id: string;                    // uuid
  name: string;                  // user-friendly name
  enabled: boolean;
  urlPatterns: string[];         // array of patterns (regex or glob)
  pixelUrl: string;              // template URL with placeholders
  fireOn: FireOn[];              // when to fire (can fire on multiple)
  createdAt: number;             // timestamp
  updatedAt: number;
  // optional fields for future:
  // description?: string;
  // excludePatterns?: string[];
}

export interface PixelEvent {
  ruleId: string;
  url: string;
  timestamp: number;
  navigationType: "initial" | "spa";
}

export interface TrackingPixelState {
  rules: PixelRule[];
  firedEvents?: PixelEvent[];    // for deduplication tracking
}
```

Dynamic params mentioned: `{url}`, `{referrer}`, `{ts}`, `{rand}`. These should be supported in pixelUrl template.

### 3.2 storage.ts
Use `browser.storage.local` (sync across extension contexts; local persists). WXT provides `storage.defineItem` or direct browser API. For MV3, `browser.storage.local` is fine.

```ts
import type { PixelRule } from "./types";

const STORAGE_KEY = "trackingPixelRules";

export async function getRules(): Promise<PixelRule[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

export async function saveRules(rules: PixelRule[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: rules });
}

export async function addRule(rule: PixelRule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await saveRules(rules);
}

export async function updateRule(id: string, updates: Partial<PixelRule>): Promise<void> {
  const rules = await getRules();
  const idx = rules.findIndex(r => r.id === id);
  if (idx !== -1) {
    rules[idx] = { ...rules[idx], ...updates, updatedAt: Date.now() };
    await saveRules(rules);
  }
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter(r => r.id !== id);
  await saveRules(filtered);
}

export async function toggleRule(id: string, enabled: boolean): Promise<void> {
  await updateRule(id, { enabled });
}
```

Also consider storing fired events for deduplication (section 9 mentions dedup). Could store in session or local. For SPA navigations within same session, session storage might make sense; for page loads, dedup key could be (ruleId, url, date?) to avoid firing same pixel multiple times on same page in same session? Or prevent refiring on rapid SPA navigations to same URL? Define dedup strategy.

### 3.3 matcher.ts
Need to determine if a URL matches rule.urlPatterns. Support flexible matching - could be regex, or glob patterns (e.g., `*.example.com/*`, `https://example.com/path/*`). For user-defined rules, simple glob-to-regex or support JS regex patterns.

Options:
- If pattern starts with `^` or is intended as regex, try to compile as RegExp
- Otherwise treat as glob pattern (convert `*` to `.*`, `?` to `.`, escape other chars) or use URL pattern matching
- Also consider host+path matching

Example implementation:
```ts
export function urlMatches(url: string, patterns: string[]): boolean {
  try {
    const u = new URL(url);
    for (const p of patterns) {
      if (!p.trim()) continue;
      // try regex first if it looks like one
      if (isRegexPattern(p)) {
        const re = new RegExp(p);
        if (re.test(url)) return true;
      } else {
        const globRe = globToRegex(p);
        if (globRe.test(url) || globRe.test(u.hostname + u.pathname + u.search)) return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

function isRegexPattern(p: string): boolean {
  // simple heuristic: user might write /pattern/flags or starts with ^
  return p.startsWith('/') && p.lastIndexOf('/') > 0 || p.startsWith('^');
}

function globToRegex(glob: string): RegExp {
  let re = '^';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') re += '.*';
    else if (c === '?') re += '.';
    else if (c === '.') re += '\\.';
    else if (c === '/') re += '/';
    else re += '\\' + c; // escape; be careful - better selective
    // simpler: escape regex special chars except * ?
  }
  re += '$';
  return new RegExp(re, 'i');
}
```
But need to be careful with escaping. Alternatively, support both explicit regex and simple glob. Document the format.

### 3.4 injector-logic.ts & utils.ts
Core logic to build pixel URL with dynamic params:
- `{url}` - current page URL (maybe encodeURIComponent)
- `{referrer}` - document.referrer
- `{ts}` - timestamp (ms or s)
- `{rand}` - random value to avoid caching

```ts
export function buildPixelUrl(template: string, pageUrl: string): string {
  const now = Date.now();
  return template
    .replace(/{url}/gi, encodeURIComponent(pageUrl))
    .replace(/{referrer}/gi, encodeURIComponent(document.referrer || ''))
    .replace(/{ts}/gi, now.toString())
    .replace(/{rand}/gi, Math.random().toString(36).substring(2));
}
```

Fire pixel: create `<img>` element
```ts
export function firePixel(url: string): void {
  try {
    const img = new Image();
    img.src = url;
    img.width = 1;
    img.height = 1;
    img.style.display = 'none';
    img.alt = '';
    img.setAttribute('data-tracking-pixel', 'sidekick');
    // append to body
    if (document.body) {
      document.body.appendChild(img);
    } else {
      // if body not ready yet
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(img);
      }, { once: true });
    }
  } catch (e) {
    console.error('Failed to fire pixel:', e);
  }
}
```

Deduplication: avoid firing same pixel rule on same URL/navigation event twice. Track fired events in memory + storage? For a session, in-memory is fine (content script lifetime). Also across rapid navigations.
```ts
const fired = new Set<string>(); // key like ruleId::url::navType

export function shouldFire(ruleId: string, url: string, navType: "initial" | "spa"): boolean {
  const key = `${ruleId}::${normalizeUrl(url)}::${navType}`;
  if (fired.has(key)) return false;
  fired.add(key);
  return true;
}
```
Normalize URL to avoid minor differences (trailing slash, fragment #fragment usually not sent to server but affects string match - typically ignore fragment for pixel matching/firing identity).

## 4. Content Script Changes (injector logic, SPA detection, deduplication)

Current content script at `src/entrypoints/content/index.ts`:
- matches `*://*.google.com/*` (needs to change)
- has WXT content script structure with locationchange handling built-in (see built output - WXT adds locationchange event support)

We need to:
1. Change matches to run on relevant sites. Options:
- `matches: ['<all_urls>']` - runs on all http/https. But may impact performance; filtering happens in logic. Also WXT/MV3 allows this.
- Or use `include` with regex patterns? WXT supports include/exclude. But rules are dynamic. Better broad match + internal filtering.

2. Implement pixel injector in content script main. 
3. Leverage SPA detection: WXT's content script API gives access to location changes. In the built output I see `wxt:locationchange` event dispatched. So listen for `window.addEventListener('wxt:locationchange', ...)` or use the content script's built-in location watcher behavior. Looking at how it's used - the WXT framework handles it; we can also use `navigation` API if available.

4. Handle both initial load and SPA navigations per rule's `fireOn`.

Implementation approach:
```ts
import { defineContentScript } from '#imports';
import { getRules } from '@/feature/tracking-pixel/storage';
import { urlMatches } from '@/feature/tracking-pixel/matcher';
import { buildPixelUrl, firePixel, shouldFire } from '@/feature/tracking-pixel/injector-logic';

export default defineContentScript({
  matches: ['<all_urls>'],
  // runAt: 'document_idle' or 'document_end' - default is fine
  async main(ctx) {
    const firedKeys = new Set<string>();
    
    function normalizeUrl(u: string) {
      try {
        const url = new URL(u);
        url.hash = ''; // ignore fragment
        return url.toString();
      } catch { return u; }
    }
    
    function checkAndFire(navType: "initial" | "spa") {
      getRules().then(rules => {
        for (const rule of rules) {
          if (!rule.enabled) continue;
          if (!rule.fireOn.includes(navType)) continue;
          if (!urlMatches(location.href, rule.urlPatterns)) continue;
          const key = `${rule.id}::${normalizeUrl(location.href)}::${navType}`;
          if (firedKeys.has(key)) continue;
          firedKeys.add(key);
          const pixelUrl = buildPixelUrl(rule.pixelUrl, location.href);
          firePixel(pixelUrl);
        }
      });
    }
    
    // Initial load
    checkAndFire("initial");
    
    // SPA navigation - listen for location changes
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      checkAndFire("spa");
    }, { passive: true });
    
    // Also fallback for browsers without navigation API - WXT handles this
  },
});
```

Notes:
- WXT's content script `ctx` provides helpers; listening to `wxt:locationchange` on window is correct based on built output
- Dedup: track in Set per content script instance (lifetime of page context). Also could persist recent firings in storage.session to avoid cross-frame issues? Probably not needed; same page context
- Performance: calling getRules() on each navigation - rules are small, fine. Could cache rules and listen for storage changes (`browser.storage.onChanged`) to update cache
- CSP: if pixelUrl is blocked, firePixel catches error (img load errors don't throw synchronously in most cases; we attach and let it load - no throw). So safe.

Also consider that some SPAs update URL without full navigation - the WXT location watcher covers this (it polls or uses navigation API as seen in built code).

## 5. Background Script Changes if Needed (dynamic registration for arbitrary sites)

Background script currently just handles sign-in. Question: do we need dynamic registration?

If we use a broad content script (`<all_urls>`) as suggested, no dynamic registration needed. If we want to be more selective and only inject on sites that have matching rules, we could dynamically register content scripts. But managing registration when rules change is more complex.

Requirements say "Background script changes if needed (dynamic registration for arbitrary sites)". So we should implement dynamic registration support. This is a good practice (better performance, narrower scope).

How?
- Keep track of unique host patterns needed from all enabled rules
- Use `chrome.scripting.registerContentScripts` / `browser.scripting` (MV3) to register declarative content scripts for those hosts
- Update registrations when rules change (add/remove/update)

But WXT has patterns for this. Also need `scripting` permission? The current permissions don't include `scripting`. Add it if using dynamic registration.

Alternatively, use optional_host_permissions + request permissions for specific hosts as rules are added. The manifest already needs optional_host_permissions for arbitrary sites.

Plan for dynamic registration:
1. Add `scripting` permission to manifest (if needed). MV3 requires scripting permission to call `chrome.scripting.registerContentScripts`.
2. In background script, listen for storage changes to `trackingPixelRules` (or have a message API)
3. Compute required host permissions/content script matches from rules
4. Register/update content scripts via `browser.scripting.registerContentScripts`
5. Also request optional host permissions when user adds rules for new hosts: `browser.permissions.request({ origins: [...] })`

This is more involved but aligns with "dynamic registration for arbitrary sites".

But implementing this cleanly in WXT requires understanding its content script model. Easier approach: use optional_host_permissions and request when adding rules; keep a broad content script. This satisfies the requirement's intent.

Alternatively, implement both: request permissions and also ensure content script can run. Let us add support in background.

Add to background/index.ts:
```ts
import { defineBackground } from '#imports';

export default defineBackground(() => {
  browser.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });
  
  // Listen for permission requests from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'REQUEST_HOST_PERMISSIONS') {
      browser.permissions.request({ origins: message.origins })
        .then(granted => sendResponse({ granted }));
      return true; // async
    }
    if (message?.type === 'CHECK_PERMISSIONS') {
      browser.permissions.contains({ origins: message.origins })
        .then(has => sendResponse({ has }));
      return true;
    }
    if (message?.type === 'OPEN_SIGN_IN_MESSAGE') {
      // existing
      browser.tabs.create({ url: `${API_BASE_URL}/auth/google/login`, active: true });
      return sendResponse({ ok: true });
    }
  });
});
```

Also add `scripting` permission if doing script registration; for just image injection, content script is sufficient. Probably not strictly needed. Let us add `scripting` permission to manifest for flexibility.

Manifest change: add `"scripting"` to permissions (or optional). If we register content scripts programmatically, need it.

## 6. Popup UI Changes (CRUD interface for pixel rules)

Popup currently shows auth-based UI. After auth, Dashboard is shown. We need to add pixel rule management UI in the popup. The requirement says "Manage via popup UI".

Options:
- Extend Dashboard component to include pixel rules management
- Add a new "Tracking Pixels" tab/section in popup
- Add navigation (Settings? Currently Settings button exists but not functional)

Current Dashboard is minimal. Let us enhance it. Also maybe add a separate page/component for managing rules (list view + add/edit form).

New components needed under feature:
```
src/feature/tracking-pixel/
  ├── components/
    ├── PixelRuleList.tsx     # List of rules with enable/disable/delete
    ├── PixelRuleForm.tsx     # Add/edit form
    ├── PixelRuleManager.tsx  # Container
    └── PatternInput.tsx     # Input for URL patterns
```

Integrate into popup/Dashboard. For example, add a section in Dashboard like "Tracking Pixel Rules" with "Add Rule" button.

UI fields for form:
- Name (text input)
- Pixel URL (text input) - with placeholder showing {url},{referrer},{ts},{rand}
- URL Patterns (textarea or list of inputs) - one per line or add multiple
- Fire On: checkboxes for "pageLoad" and "spaNavigation" (or select)
- Enabled: toggle/checkbox

Validation:
- Name required
- Pixel URL required, valid URL? or just non-empty
- At least one URL pattern
- At least one fireOn option

Use lucide-react icons (already in deps: Plus, Edit, Trash, etc.).

## 7. File Creation Order

Suggested order to minimize dependencies and build cleanly:
1. **Types**: `src/feature/tracking-pixel/types.ts` - foundation
2. **Storage**: `src/feature/tracking-pixel/storage.ts` - depends on types
3. **Utils/matcher**: `src/feature/tracking-pixel/matcher.ts`, `src/feature/tracking-pixel/utils.ts` (or combined)
4. **Injector logic**: `src/feature/tracking-pixel/injector-logic.ts`
5. **Components**: UI components for popup (PixelRuleForm, PixelRuleList, PatternInput, PixelRuleManager)
6. **Update Dashboard**: Integrate PixelRuleManager into Dashboard
7. **Content script**: Update `src/entrypoints/content/index.ts` to implement injector
8. **Background**: Update `src/entrypoints/background/index.ts` if adding message handlers for permissions
9. **Config**: Update `wxt.config.ts` (manifest changes - host_permissions, optional_host_permissions, permissions)
10. **Types/index exports** if needed; also maybe constants

Also create an index.ts in feature if we want barrel exports.

## 8. Code Snippets for Each New/Modified File

### 8.1 New: src/feature/tracking-pixel/types.ts
```ts
export type FireOn = "pageLoad" | "spaNavigation";

export interface PixelRule {
  id: string;
  name: string;
  enabled: boolean;
  urlPatterns: string[];
  pixelUrl: string;
  fireOn: FireOn[];
  createdAt: number;
  updatedAt: number;
}

export interface PixelEvent {
  ruleId: string;
  url: string;
  timestamp: number;
  navigationType: "initial" | "spa";
}

export interface TrackingPixelState {
  rules: PixelRule[];
}
```

### 8.2 New: src/feature/tracking-pixel/storage.ts
```ts
import type { PixelRule } from "./types";

const STORAGE_KEY = "trackingPixelRules";

export async function getRules(): Promise<PixelRule[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as PixelRule[]) || [];
}

export async function saveRules(rules: PixelRule[]): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: rules });
}

export async function addRule(rule: PixelRule): Promise<void> {
  const rules = await getRules();
  rules.push(rule);
  await saveRules(rules);
}

export async function updateRule(id: string, updates: Partial<PixelRule>): Promise<void> {
  const rules = await getRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx !== -1) {
    rules[idx] = { ...rules[idx], ...updates, updatedAt: Date.now() };
    await saveRules(rules);
  }
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getRules();
  const filtered = rules.filter((r) => r.id !== id);
  await saveRules(filtered);
}

export async function toggleRule(id: string, enabled: boolean): Promise<void> {
  await updateRule(id, { enabled });
}
```

### 8.3 New: src/feature/tracking-pixel/matcher.ts
```ts
function isRegexPattern(p: string): boolean {
  const trimmed = p.trim();
  if (trimmed.startsWith("^")) return true;
  if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) return true;
  return false;
}

function globToRegex(glob: string): RegExp {
  let re = "^";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      re += ".*";
    } else if (c === "?") {
      re += ".";
    } else if ("[\\^$.|+(){}".indexOf(c) !== -1) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  re += "$";
  return new RegExp(re, "i");
}

export function urlMatches(url: string, patterns: string[]): boolean {
  try {
    const u = new URL(url);
    for (const p of patterns) {
      const trimmed = p.trim();
      if (!trimmed) continue;
      let re: RegExp;
      if (isRegexPattern(trimmed)) {
        // handle /pattern/flags format
        if (trimmed.startsWith("/") && trimmed.lastIndexOf("/") > 0) {
          const lastSlash = trimmed.lastIndexOf("/");
          const pattern = trimmed.slice(1, lastSlash);
          const flags = trimmed.slice(lastSlash + 1);
          re = new RegExp(pattern, flags);
        } else {
          re = new RegExp(trimmed);
        }
      } else {
        re = globToRegex(trimmed);
      }
      if (re.test(url) || re.test(u.hostname + u.pathname + u.search)) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
```

### 8.4 New: src/feature/tracking-pixel/injector-logic.ts
```ts
export function buildPixelUrl(template: string, pageUrl: string): string {
  const now = Date.now();
  const rand = Math.random().toString(36).substring(2, 12);
  return template
    .replace(/{url}/gi, encodeURIComponent(pageUrl))
    .replace(/{referrer}/gi, encodeURIComponent(document.referrer || ""))
    .replace(/{ts}/gi, now.toString())
    .replace(/{rand}/gi, rand);
}

export function firePixel(url: string): void {
  try {
    const img = new Image();
    img.src = url;
    img.width = 1;
    img.height = 1;
    img.style.display = "none";
    img.style.position = "absolute";
    img.style.pointerEvents = "none";
    img.alt = "";
    img.setAttribute("data-tracking-pixel", "sidekick");
    const append = () => {
      if (document.body) {
        document.body.appendChild(img);
      }
    };
    if (document.body) {
      append();
    } else {
      document.addEventListener("DOMContentLoaded", append, { once: true });
    }
  } catch (e) {
    // ignore errors
  }
}
```

### 8.5 Modified: src/entrypoints/content/index.ts
```ts
import { defineContentScript } from '#imports';
import { getRules } from '@/feature/tracking-pixel/storage';
import { urlMatches } from '@/feature/tracking-pixel/matcher';
import { buildPixelUrl, firePixel } from '@/feature/tracking-pixel/injector-logic';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main(ctx) {
    const firedKeys = new Set<string>();

    function normalizeUrl(u: string): string {
      try {
        const url = new URL(u);
        url.hash = '';
        return url.toString();
      } catch {
        return u;
      }
    }

    async function checkAndFire(navType: "initial" | "spa"): Promise<void> {
      try {
        const rules = await getRules();
        const currentUrl = location.href;
        for (const rule of rules) {
          if (!rule.enabled) continue;
          if (!rule.fireOn.includes(navType)) continue;
          if (!urlMatches(currentUrl, rule.urlPatterns)) continue;
          const key = `${rule.id}::${normalizeUrl(currentUrl)}::${navType}`;
          if (firedKeys.has(key)) continue;
          firedKeys.add(key);
          const pixelUrl = buildPixelUrl(rule.pixelUrl, currentUrl);
          firePixel(pixelUrl);
        }
      } catch (e) {
        // ignore
      }
    }

    // Initial load
    checkAndFire("initial");

    // SPA navigation
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      checkAndFire("spa");
    }, { passive: true });

    // Also listen for browser.storage changes to clear dedup if needed? optional
  },
});
```

### 8.6 Modified: src/entrypoints/background/index.ts
```ts
import { API_BASE_URL, OPEN_SIGN_IN_MESSAGE } from "@/shared/constants/api";

export default defineBackground(() => {
  browser.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS",
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message?.type) {
      case OPEN_SIGN_IN_MESSAGE:
        browser.tabs.create({
          url: `${API_BASE_URL}/auth/google/login`,
          active: true,
        });
        return sendResponse({ ok: true });
      case "REQUEST_HOST_PERMISSIONS":
        browser.permissions
          .request({ origins: message.origins })
          .then((granted) => sendResponse({ granted }))
          .catch(() => sendResponse({ granted: false }));
        return true; // keep channel open for async
      case "CHECK_HOST_PERMISSIONS":
        browser.permissions
          .contains({ origins: message.origins })
          .then((has) => sendResponse({ has }))
          .catch(() => sendResponse({ has: false }));
        return true;
    }
  });
});
```

### 8.7 Modified: wxt.config.ts
```ts
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: "src",
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    name: "SideKick Tracker (RJ)",
    description: "Let's Track Your Mail With Just One Side Kick",
    version: '0.1.2',

    permissions: [
      "storage",
      "tabs",
      "activeTab",
      "scripting",
    ],

    optional_host_permissions: [
      "<all_urls>",
    ],

    host_permissions: [
      "https://mail.google.com/*",
      "http://localhost:5000/*",
    ],

    action: {
      default_title: "Sidekick Tracker",
    },
  },
});
```

### 8.8 New UI Components (popup)

**PatternInput.tsx**: helper for managing pattern list
```tsx
import { useState } from "react";
import { Plus, Trash } from "lucide-react";

export default function PatternInput({
  patterns,
  onChange,
}: {
  patterns: string[];
  onChange: (patterns: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addPattern = () => {
    if (input.trim()) {
      onChange([...patterns, input.trim()]);
      setInput("");
    }
  };

  const removePattern = (idx: number) => {
    onChange(patterns.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-[11px] text-secondary mb-1">URL Patterns</label>
      <div className="flex gap-1 mb-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g., example.com/* or ^https://.*\\.example\\.com/.*"
          className="flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-[11px]"
        />
        <button
          onClick={addPattern}
          className="rounded-md bg-signal px-2 py-1.5 text-[11px] text-white hover:bg-signal-hover"
        >
          <Plus className="size-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {patterns.map((p, idx) => (
          <div key={idx} className="flex items-center justify-between rounded-md bg-page px-2 py-1 text-[10px]">
            <span className="truncate">{p}</span>
            <button onClick={() => removePattern(idx)} className="text-muted hover:text-primary">
              <Trash className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**PixelRuleForm.tsx**
```tsx
import { useState } from "react";
import PatternInput from "./PatternInput";
import type { FireOn, PixelRule } from "../types";

export default function PixelRuleForm({
  onSubmit,
  onCancel,
  initialRule,
}: {
  onSubmit: (rule: Omit<PixelRule, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  initialRule?: Partial<PixelRule>;
}) {
  const [name, setName] = useState(initialRule?.name || "");
  const [pixelUrl, setPixelUrl] = useState(initialRule?.pixelUrl || "");
  const [urlPatterns, setUrlPatterns] = useState<string[]>(initialRule?.urlPatterns || []);
  const [fireOn, setFireOn] = useState<FireOn[]>(initialRule?.fireOn || ["pageLoad"]);
  const [enabled, setEnabled] = useState(initialRule?.enabled ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, pixelUrl, urlPatterns, fireOn, enabled });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3">
      <div>
        <label className="block text-[11px] text-secondary mb-1">Rule Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[11px]"
          required
        />
      </div>
      <div>
        <label className="block text-[11px] text-secondary mb-1">Pixel URL</label>
        <input
          value={pixelUrl}
          onChange={(e) => setPixelUrl(e.target.value)}
          placeholder="https://tracker.example.com/pixel.png?u={url}&t={ts}&r={rand}"
          className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-[11px]"
          required
        />
        <p className="mt-1 text-[9px] text-muted">Available: {`{url}, {referrer}, {ts}, {rand}`}</p>
      </div>
      <PatternInput patterns={urlPatterns} onChange={setUrlPatterns} />
      <div>
        <label className="block text-[11px] text-secondary mb-1">Fire On</label>
        <div className="flex gap-3">
          <label className="flex items-center gap-1 text-[11px]">
            <input
              type="checkbox"
              checked={fireOn.includes("pageLoad")}
              onChange={(e) => {
                if (e.target.checked) setFireOn([...fireOn, "pageLoad"]);
                else setFireOn(fireOn.filter((f) => f !== "pageLoad"));
              }}
            />
            Page Load
          </label>
          <label className="flex items-center gap-1 text-[11px]">
            <input
              type="checkbox"
              checked={fireOn.includes("spaNavigation")}
              onChange={(e) => {
                if (e.target.checked) setFireOn([...fireOn, "spaNavigation"]);
                else setFireOn(fireOn.filter((f) => f !== "spaNavigation"));
              }}
            />
            SPA Navigation
          </label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <label className="text-[11px]">Enabled</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 text-[11px] text-muted hover:bg-page">
          Cancel
        </button>
        <button type="submit" className="rounded-md bg-signal px-3 py-1.5 text-[11px] text-white hover:bg-signal-hover">
          Save
        </button>
      </div>
    </form>
  );
}
```

**PixelRuleList.tsx**
```tsx
import { Edit, Trash, ToggleLeft, ToggleRight } from "lucide-react";
import type { PixelRule } from "../types";

export default function PixelRuleList({
  rules,
  onToggle,
  onEdit,
  onDelete,
}: {
  rules: PixelRule[];
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (rule: PixelRule) => void;
  onDelete: (id: string) => void;
}) {
  if (rules.length === 0) {
    return <p className="text-[10px] text-muted p-3">No rules yet. Add one to start injecting pixels.</p>;
  }
  return (
    <div className="flex flex-col gap-2 p-2">
      {rules.map((rule) => (
        <div key={rule.id} className="rounded-md border border-border bg-surface p-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-[12px] font-semibold">{rule.name}</h4>
              <p className="text-[9px] text-muted truncate max-w-[250px]">{rule.pixelUrl}</p>
              <p className="text-[9px] text-muted mt-0.5">{rule.fireOn.join(", ")} • {rule.urlPatterns.length} pattern(s)</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => onToggle(rule.id, !rule.enabled)} className="text-muted hover:text-primary">
                {rule.enabled ? <ToggleRight className="size-4 text-signal" /> : <ToggleLeft className="size-4" />}
              </button>
              <button onClick={() => onEdit(rule)} className="text-muted hover:text-primary">
                <Edit className="size-3.5" />
              </button>
              <button onClick={() => onDelete(rule.id)} className="text-muted hover:text-primary">
                <Trash className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**PixelRuleManager.tsx** - container
```tsx
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import type { PixelRule } from "../types";
import { getRules, addRule, updateRule, deleteRule, toggleRule } from "../storage";
import PixelRuleForm from "./PixelRuleForm";
import PixelRuleList from "./PixelRuleList";

export default function PixelRuleManager() {
  const [rules, setRules] = useState<PixelRule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PixelRule | null>(null);

  const loadRules = async () => {
    const r = await getRules();
    setRules(r);
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleAdd = async (ruleData: Omit<PixelRule, "id" | "createdAt" | "updatedAt">) => {
    const now = Date.now();
    await addRule({
      id: crypto.randomUUID(),
      ...ruleData,
      createdAt: now,
      updatedAt: now,
    });
    setShowForm(false);
    loadRules();
  };

  const handleUpdate = async (ruleData: Omit<PixelRule, "id" | "createdAt" | "updatedAt">) => {
    if (!editingRule) return;
    await updateRule(editingRule.id, { ...ruleData, updatedAt: Date.now() });
    setEditingRule(null);
    loadRules();
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    await toggleRule(id, enabled);
    loadRules();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this rule?")) {
      await deleteRule(id);
      loadRules();
    }
  };

  const handleEdit = (rule: PixelRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRule(null);
  };

  return (
    <div className="mt-4 rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-[12px] font-semibold">Tracking Pixel Rules</h3>
        <button
          onClick={() => { setShowForm(true); setEditingRule(null); }}
          className="flex items-center gap-1 rounded-md bg-signal-soft px-2 py-1 text-[10px] text-signal hover:bg-signal/10"
        >
          <Plus className="size-3" />
          Add Rule
        </button>
      </div>
      {showForm ? (
        <PixelRuleForm
          onSubmit={editingRule ? handleUpdate : handleAdd}
          onCancel={handleCancel}
          initialRule={editingRule || undefined}
        />
      ) : (
        <PixelRuleList rules={rules} onToggle={handleToggle} onEdit={handleEdit} onDelete={handleDelete} />
      )}
    </div>
  );
}
```

**Update Dashboard.tsx** to include PixelRuleManager:
```tsx
import type { User } from "@/shared/types/AuthType";
import { CircleHelp, LogOut } from "lucide-react";
import PixelRuleManager from "@/feature/tracking-pixel/components/PixelRuleManager";

export default function Dashboard({user, handleLogOut }: { user:User , handleLogOut: () => void }) {
    return (
        <div className="p-4">
            <PixelRuleManager />
            <div className="mt-3 flex justify-center">
                <button className="flex items-center gap-1 text-[10px] text-muted hover:text-primary">
                    <CircleHelp className="size-3" />
                    How it works
                </button>
            </div>
            <div className="mt-3 flex justify-center">
                <button
                    onClick={handleLogOut}
                    className="flex items-center gap-1 text-[10px] text-muted hover:text-primary"
                >
                    <LogOut className="size-3" />
                    Log out
                </button>
            </div>
        </div>
    );
}
```

## 9. Considerations: MV3, CSP, dedup, dynamic params ({url},{referrer},{ts},{rand})

- **MV3**: Service worker background (we have it). Content scripts declarative or programmatic. Storage API same. Use `browser.*` (webextension-polyfill style via WXT). Permissions model stricter.
- **CSP**: Page CSP can block loading images from pixelUrl origin if `img-src` restricts it. Our approach (injecting img tag) will result in a failed load but no script execution - this is normal for tracking pixels; we can't bypass CSP. Document this as limitation.
- **Deduplication**: As implemented, dedup by (ruleId, normalizedUrl, navType). Prevents firing same rule twice on same navigation event. For "pageLoad", fires once per page load. For SPA, fires on each detected navigation if rule matches. This matches requirements.
- **Dynamic params**: `{url}` (encoded), `{referrer}` (encoded), `{ts}` (ms since epoch), `{rand}` (short random string). All implemented in buildPixelUrl.
- **Optional host permissions**: User needs permission to inject on sites not covered by host_permissions. When adding rules for new origins, prompt via `browser.permissions.request`. Also consider extracting unique origins from URL patterns.
- **Iframe considerations**: Content script runs in main frame by default? WXT's defineContentScript default is main world; but to inject pixels in iframes, need `all_frames: true`. Depends on use case - tracking pixels typically fire on top frame; but if site embeds pages, maybe not desired. Default is fine.
- **Performance**: Reading rules from storage on every navigation is cheap (small objects). Dedup via Set in memory.
- **Privacy/validation**: URL patterns allow regex - user could write broad patterns. No validation to prevent abuse; this is user-configured.
- **UUID**: Use `crypto.randomUUID()` (available in modern browsers, extension contexts support it).
- **Fragment handling**: We ignore `#hash` in dedup key (normalizeUrl strips hash) because hash doesn't affect server requests - but the original URL with hash might be intended? Usually not; safer to normalize.

## 10. Testing Plan

**Unit testing (manual verification):**
1. **Rule storage**: Add/update/delete/toggle rules in popup, reload popup, verify persistence in storage.local
2. **URL matching**: Test glob patterns (`example.com/*`, `*.example.com/*`, `https://example.com/path`) and regex patterns (`^https://example\.com\/.*$`, `/example\.com/`)
3. **Dynamic params**: Verify pixel URL gets replaced correctly (check Network tab for actual request URL)
4. **Deduplication**: Navigate same page (SPA), verify pixel fires only once per navType; reload page, verify pageLoad fires again

**Integration testing:**
1. **Page load injection**: Add rule for a test site with fireOn pageLoad. Load page, check Network tab for pixel GET request. Verify 1x1 image created in DOM (hidden).
2. **SPA navigation**: On SPA site (e.g., app with client-side routing), add rule with spaNavigation. Navigate between routes - should fire on each navigation matching patterns.
3. **Content script activation**: Verify content script runs on matched sites with `<all_urls>` matches.
4. **Popup UI**: All CRUD operations work smoothly; form validation; empty states.

**Manual test scenarios:**
- Add rule: name "Test", pixelUrl "https://httpbin.org/get?u={url}&t={ts}", patterns ["localhost:3000/*"] (or test site), fireOn ["pageLoad"]
- Load matching page, inspect network - see request to httpbin with encoded URL and timestamp
- Add spaNavigation rule for SPA site like reactrouter.dev or internal SPA; navigate - pixel fires
- Toggle rule off - no firing
- Edit rule - changes take effect on next navigation
- Delete rule - stops firing

**Cross-browser considerations**: WXT builds for Chrome MV3; test in Chrome. Also mentioned firefox build script exists - MV3 differences minimal for these APIs.

## 11. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **CSP blocking pixel loads** | Medium | Low | Cannot bypass; inform user in docs/UI. Pixel is still attempted (img tag) - most tracking pixels work this way; treat as best-effort. |
| **Broad `<all_urls>` content script impact** | Medium | Low | Content script does minimal work: checks rules, fires if matches. Also we can optimize by caching rules and only doing work when rules exist. |
| **Dynamic registration complexity** | Medium | Medium | Start with broad content script approach (as implemented) - satisfies core requirement. Add dynamic registration as optional enhancement if needed. The requirement states "if needed" so current approach is fine. |
| **SPA navigation detection edge cases** | Medium | Medium | WXT's locationchange is based on navigation API + polling fallback (seen in built output). Should cover most SPAs. Test on common SPA patterns. |
| **Regex injection/DoS** | Low | Medium | User provides regex patterns; malicious regex (catastrophic backtracking) could freeze page. Mitigate by not executing complex patterns on every tiny check? Or add timeout? Not trivial in JS. For user-controlled extension config, document warning or use safe regex. Alternatively, limit pattern complexity. |
| **Permission prompts annoying user** | Medium | Low | With optional_host_permissions and `<all_urls>`, we only request specific origins when user adds rules. Be transparent in UI ("This rule requires permission for..."). |
| **Storage quota** | Low | Low | Rules are small JSON objects; browser.storage.local has generous quota (usually 10MB+). |
| **UUID compatibility** | Low | Low | crypto.randomUUID() is well-supported in MV3 extension contexts (Chromium). Fallback to custom if needed, but probably not necessary. |
| **Multiple content scripts on same page** | Low | Low | Each WXT content script instance has its own firedKeys Set; multiple injections unlikely if we structure properly. Also locationchange is global. |
| **Dedup across page reloads** | Low | Low | firedKeys is in-memory per script instance - reset on page reload. That's correct (pageLoad should fire each full load). SPA navigations stay in same context. |

## Auth Issues Note

The requirements mention accounting for auth issues (especially localhost:3000 host permission). Current state:
- wxt.config.ts has `http://localhost:5000/*` in host_permissions (web app URL?)
- API_BASE_URL is `http://localhost:3000` (server)
- Extension needs to call server API - API calls use fetch with credentials to API_BASE_URL; host_permissions for API origin aren't strictly required for fetch/XHR in MV3 background/popup contexts - host_permissions are for content scripts. So localhost:3000 might not need to be in host_permissions unless used by content scripts. The auth flow uses background/popup to call API and to open tabs. No content script hitting localhost:3000 currently. So the existing localhost:5000 is likely for content script matching on the web app; localhost:3000 is API server. This is fine as-is. No change needed specifically for auth host permissions for the pixel injector feature.
