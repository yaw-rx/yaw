**The DOM is Not Your Enemy: A Manifesto for Web Development That Doesn't Hate Itself**

---

## The Crime Scene

We were handed a runtime that renders trees in C++, and we responded by building JavaScript replicas of it. Twice. Once in Google's cathedral, once in Facebook's garage.

Angular shipped a framework that downloads half the internet to render a button. `node_modules` so bloated that `rm -rf` is a performance optimization. Zone.js monkey-patches every async API in the browser—`setTimeout`, `Promise`, `addEventListener`—just to know when to check if anything changed. They built a change detection system so complex it needs its own debugging tools. And for what? So you can write `{{user.name}}` instead of `user.name$.subscribe(name => this.textContent = name)`.

React looked at this and said "hold my beer." They ask you to pretend the DOM doesn't exist. Then it builds a virtual one, diffs it, and finally—*finally*—touches the real thing. The "virtual" part is pure tax. You pay for the allocation, you pay for the diff, you pay for the reconciliation, and at the end of the day you still call `appendChild` like it's 1998. All to solve a problem they invented: "What if direct DOM manipulation was unpredictable?" It wasn't. Your code was just bad.

Three gigabytes of dependencies to avoid understanding event listeners.

---

## The Lie of "Sophistication"

They told us this was necessary. That the web was "too complex" for simple solutions. That we needed "predictable state management" and "unidirectional data flow" and "fine-grained reactivity."

These are not insights. These are **apologies for overhead**.

Angular's "change detection" is "we have no idea when your state changes so we check everything, constantly, or patch the browser to tell us." React's "unidirectional data flow" is just "we diff two trees because we don't trust you to update what changed."

The actual solution was always there: **push updates directly to the DOM when you know they happened.** That's what Observables do. That's what the browser's been doing since `MutationObserver`.

The "sophistication" was never in the runtime. It was in convincing you that you needed it.

---

## Our Heresy

We reject Zone.js. Not because we hate debugging, but because **we can unsubscribe.**

We reject the virtual DOM. Not because we're Luddites, but because **we can read.**

We reject 3GB of `node_modules`. Not because we enjoy suffering, but because **the platform already ships with a DOM**.

We write `{{count}}` and `[label]="status"` because no one wants to write `count$.subscribe(v => el.textContent = v)` inline. That's not a principle—that's jQuery with extra steps. The template is the abstraction that earns its keep: it compiles to exactly those subscriptions and nothing else. No virtual copy. No diff. No reconciliation queue. Just `data-rx-bind-label="status"` stamped into real DOM, read by the element that owns it.

`rx-for` stamps DOM nodes. The browser instantiates them. They bind themselves. The tree walks itself. We don't manage components—we register custom elements and get out of the way.

This is not minimalism for aesthetics. This is **removing solutions to problems we didn't have.**

---

## The Platform Is Enough

HTML parses. Custom elements instantiate. Attributes are strings we can scan. `connectedCallback` is `onInit`. `disconnectedCallback` is `onDestroy`. `appendChild` adds nodes. RxJS handles asynchrony. The DI container is a Map with a parent pointer.

Everything else is ceremony.

You want server-side rendering? The browser parses HTML. You want hydration? Custom elements upgrade when definitions load. You want lazy loading? Dynamic `import()` and `customElements.define`. You want dev tools? They're called the **Elements panel**.

We are not building a framework. We are building **a convention**: extend `HTMLElement`, scan your attributes in the constructor, subscribe to Observables, clean up when removed. That's the API. That's the whole API.

---

## To the Angular Dev

Your `NgModule` system was deprecated before you finished learning it. Your "standalone components" are just components. Your DI scoping rules are a graph traversal problem you solved by adding more decorators.

Our DI is a function that walks up a parent chain. Our components are classes that extend `HTMLElement`. Our templates are HTML. You already know this pattern. We just removed the 50,000 lines of abstraction between you and it.

---

## To the React Dev

Your `useEffect` dependency array is a manual memory management exercise disguised as declarative code. Your "rules of Hooks" are a runtime linter because your abstraction leaks. Your concurrent features are fixing scheduling problems created by your own scheduler.

We don't have rules. We have `subscribe` and `unsubscribe`. We don't have a scheduler. We have the browser's event loop. We don't have "server components" because our components **are** HTML—they render the same everywhere.

---

## The Measure of Success

We ship in kilobytes, not megabytes. We start instantly, not after hydration. We update precisely, not after diffing. We garbage collect automatically, not after manual effect cleanup.

Our `node_modules` fits in a tweet. Our mental model fits in a sentence: **Observables push, DOM reflects, elements clean up.**

The web was never broken. We just convinced ourselves it was, then sold each other expensive repairs.

We're done. The DOM is fine. Use it.