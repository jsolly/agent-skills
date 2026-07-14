# TypeScript smells & idiomatic fixes (reference)

Grep this file for the transform you need. Every fix assumes the safe procedure in `SKILL.md` — none of these is a license to skip the contract or the evidence gates.

## Long method/function → extract focused, individually-typed functions

```diff
- async function processOrder(orderId: string): Promise<OrderResult> {
-   // fetch / validate / price / update inventory / ship / notify — all inline
- }
+ async function processOrder(orderId: OrderId): Promise<OrderResult> {
+   const order = await fetchOrder(orderId);
+   validateOrder(order);
+   const pricing = calculatePricing(order);
+   await updateInventory(order);
+   const shipment = await createShipment(order);
+   await sendNotifications(order, pricing, shipment);
+   return { order, pricing, shipment };
+ }
```

## Duplicated logic → extract, typed against the union so it stays total

```diff
- function discountRate(m: Membership): number {
-   if (m === 'gold') return 0.2;
-   if (m === 'silver') return 0.1;
-   return 0; // bronze / default — the behavior the Record must reproduce exactly
- }
+ // constants.ts — bronze: 0 reproduces the old default; a forced key is NOT license
+ // to invent a value the old code never returned (if old bronze was undefined, that's
+ // a behavior change → separate commit, not this one).
+ export const DISCOUNT_RATES: Record<Membership, number> = { gold: 0.2, silver: 0.1, bronze: 0 };
+ // usage
+ user.total * DISCOUNT_RATES[m];
```

`Record<Membership, number>` makes adding a membership tier a **compile error** until you supply its rate — the mapping can't silently go stale. But note the indexed access is typed `number`, **not** `number | undefined` (`noUncheckedIndexedAccess` doesn't apply to finite-key Records) — so the Record *cannot* reproduce an old `undefined`. Pin each key to the value the old code actually produced; making a previously-implicit case explicit is only safe when you've confirmed the old output for that key.

## Long parameter list → introduce a parameter object

```diff
- function createUser(email: string, password: string, name: string, age: number, /* ...5 more */) {}
+ interface UserData {          // types.ts
+   email: Email;               // branded — closes the "transposed two strings" gap
+   password: string;
+   name: string;
+   age?: number;
+ }
+ function createUser(data: UserData): Promise<User> { /* ... */ }
```

## Primitive obsession → branded type + parse-at-boundary (zero runtime cost)

```diff
- function sendEmail(to: string, subject: string, body: string) {}
+ // types.ts
+ export type Email = string & { readonly __brand: 'Email' };
+ export function parseEmail(value: string): Email {
+   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new Error(`Invalid email: ${value}`);
+   return value as Email;
+ }
+ function sendEmail(to: Email, subject: string, body: string) {}
+ sendEmail(parseEmail('user@example.com'), 'Hello', '...'); // cast lives only inside parseEmail
```

Prefer branded types for identifiers/scalars (`UserId`, `Cents`, `IsoDateTimeString`); reach for a value class only when the concept owns real behavior. Follow whatever the repo already uses.

## Magic numbers/strings → named constants in `constants.ts`

```diff
- if (user.status === 2) {}
- setTimeout(cb, 86400000);
+ // constants.ts
+ export const UserStatus = { ACTIVE: 1, INACTIVE: 2, SUSPENDED: 3 } as const;
+ export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
+ export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
+ // usage
+ if (user.status === UserStatus.INACTIVE) {}
+ setTimeout(cb, ONE_DAY_MS);
```

## Nested conditionals → guard clauses that *narrow* the type

```diff
- function process(order: Order | null): Result {
-   if (order) { if (order.user) { if (order.user.isActive) { /* arrow code */ } } }
- }
+ function process(order: Order | null): Result {
+   if (!order) return { error: 'No order' };
+   if (!order.user) return { error: 'No user' };
+   if (!order.user.isActive) return { error: 'User inactive' };
+   return processOrder(order); // order, order.user typed non-null here — no `!` needed
+ }
```

## Optional-field bag → discriminated union (make invalid states unrepresentable)

The highest-leverage TS refactor. Turn a struct where only some field combinations are valid into a union keyed by a discriminant, then let exhaustiveness checking guarantee every case is handled.

```diff
- interface Payment { method: string; cardNumber?: string; paypalEmail?: string; iban?: string; }
+ // types.ts
+ export type Payment =
+   | { method: 'card'; cardNumber: string }
+   | { method: 'paypal'; paypalEmail: Email }
+   | { method: 'bank'; iban: string };
+
+ function describe(payment: Payment): string {
+   switch (payment.method) {
+     case 'card':   return `Card ****${payment.cardNumber.slice(-4)}`;
+     case 'paypal': return `PayPal ${payment.paypalEmail}`;
+     case 'bank':   return `Bank ${payment.iban}`;
+     default:       return assertNever(payment); // compile error if a variant is added unhandled
+   }
+ }
+ function assertNever(x: never): never { throw new Error(`Unhandled: ${JSON.stringify(x)}`); }
```

Add a fourth method and every non-exhaustive `switch` becomes a compile error — the type system hands you the worklist.

## Conditional dispatch → strategy map keyed by a union

```diff
- function calculateShipping(order: Order, method: string): number {
-   if (method === 'standard') return order.total > 50 ? 0 : 5.99;
-   if (method === 'express')  return order.total > 100 ? 9.99 : 14.99;
-   throw new Error(`Unknown method: ${method}`); // reachable today: method: string admits any string
- }
+ // constants.ts (or a local map): the union makes the switch exhaustive at compile time
+ type ShippingMethod = 'standard' | 'express' | 'overnight';
+ const SHIPPING: Record<ShippingMethod, (o: Order) => number> = {
+   standard:  (o) => (o.total > 50 ? 0 : 5.99),
+   express:   (o) => (o.total > 100 ? 9.99 : 14.99),
+   overnight: () => 29.99,
+ };
+ const calculateShipping = (o: Order, m: ShippingMethod) => SHIPPING[m](o);
```

**Not a free win — this is a boundary change.** Narrowing `method: string` → `ShippingMethod` *and* dropping the `throw` removes the runtime guard for invalid input: an unknown method now hits `SHIPPING[m]` → `undefined(o)` → `TypeError`, not your clear error. Only safe when you've proven at every call site that no arbitrary string reaches this function — otherwise validate the string into `ShippingMethod` at the boundary and keep a guard. Treat it as the `string → brand` narrowing from `SKILL.md` Gate 2, not a pure refactor.

Use a class-per-strategy `interface` only when a strategy carries state or dependencies a plain function can't.

## Dead code → delete it (after a biopsy)

Before deleting code you *think* is unused: grep for all references **and** run the typecheck with the symbol removed. Delete on a clean "no callers," never on assumption. Then remove it outright — git history is the archive. `noUnusedLocals` and a `knip` pass surface most of it mechanically.
