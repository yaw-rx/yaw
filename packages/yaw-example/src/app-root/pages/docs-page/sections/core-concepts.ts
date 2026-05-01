import { Component, RxElement } from 'yaw';
import { TocAnchor } from '../directives/toc-anchor.js';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

@Component({
    selector: 'docs-core-concepts',
    directives: [TocAnchor],
    template: `
        <h1 toc-anchor="core-concepts">Core concepts</h1>
        <p class="lede">The pieces of a yaw application. Each has its
           own section later — this is enough to follow the examples.</p>

        <h2>Components</h2>
        <p class="note">HTML has built-in elements like
           <code class="inline">&lt;button&gt;</code> and
           <code class="inline">&lt;input&gt;</code>. A component
           lets you define your own — like
           <code class="inline">&lt;shopping-cart&gt;</code> or
           <code class="inline">&lt;user-profile&gt;</code>. It is
           a TypeScript class with HTML and optional CSS inside it.
           The browser treats it exactly like a built-in element.</p>

        <h2>State</h2>
        <p class="note">Mark a field with
           <code class="inline">@state</code> and it becomes
           reactive — other code can subscribe to it and respond
           whenever the value changes.</p>

        <h2>Templates</h2>
        <p class="note">The HTML inside a component. Bindings
           connect <code class="inline">@state</code> fields to
           the DOM — setting text, attributes, properties, and
           event handlers.</p>

        <h2>Directives</h2>
        <p class="note">An attribute you place on an element that
           adds behaviour to it — repeating it, hiding it,
           animating it, or anything else you can express in
           code.</p>

        <h2>Services</h2>
        <p class="note">A class that holds data or logic shared
           across multiple components. The framework creates the
           instance and passes it to any component that needs it.</p>

        <h2>Attribute codecs</h2>
        <p class="note">HTML attributes are always strings. When a
           field holds a richer type like a
           <code class="inline">Date</code>, a codec converts it
           to a string for the attribute and back again. Built-in
           codecs cover common types; you register your own for
           anything custom.</p>
    `,
    styles: `:host { display: block; }\n${DOC_STYLES}\nh2 { margin-top: 1.5rem; }`,
})
export class DocsConcepts extends RxElement {}
