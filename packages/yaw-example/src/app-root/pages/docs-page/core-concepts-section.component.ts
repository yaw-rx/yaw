import { Component } from '@yaw-rx/core';
import { DocSection } from '../../components/doc-section.component.js';
import { TocAnchor } from '../../directives/toc-anchor.directive.js';

@Component({
    selector: 'core-concepts-section',
    directives: [TocAnchor],
    template: `
        <h1 toc-anchor="core-concepts">Core concepts</h1>
        <p class="lede">The pieces of a yaw application. Each has its
           own section later — this is enough to follow the examples.</p>

        <h2><a href="/docs/components">Components</a></h2>
        <p class="note">HTML has built-in elements like
           <code class="inline">&lt;button&gt;</code> and
           <code class="inline">&lt;input&gt;</code>. A component
           lets you define your own — like
           <code class="inline">&lt;shopping-cart&gt;</code> or
           <code class="inline">&lt;user-profile&gt;</code>. It is
           a TypeScript class with HTML and optional CSS inside it.
           The browser treats it exactly like a built-in element.</p>

        <h2><a href="/docs/components/state">State</a></h2>
        <p class="note">Mark a field with
           <code class="inline">@state</code> and it becomes
           reactive — other code can subscribe to it and respond
           whenever the value changes.</p>

        <h2><a href="/docs/components/paths">Binding paths</a></h2>
        <p class="note">A binding points at something on a
           component — a field, a nested property, or a method.
           No expressions, no pipes, no logic in the template.</p>

        <h2><a href="/docs/components/attributes">Attributes</a></h2>
        <p class="note">Data flows into an element the same way
           it does in plain HTML — through attributes. Static
           values are read once; reactive values stay in sync.</p>

        <h2><a href="/docs/components/bindings">Template bindings</a></h2>
        <p class="note">The HTML inside a component. Bindings
           connect <code class="inline">@state</code> fields to
           the DOM — setting text, attributes, properties, and
           event handlers.</p>

        <h2><a href="/docs/components/projection">Content projection</a></h2>
        <p class="note">Pass children into a component and they
           appear where the template says they should — just like
           putting content between opening and closing HTML tags.</p>

        <h2><a href="/docs/components/lifecycle">Lifecycle</a></h2>
        <p class="note">Hooks that fire when a component connects
           to the page, when its template is ready, and when it
           is removed.</p>

        <h2><a href="/docs/directives">Directives</a></h2>
        <p class="note">An attribute you place on an element that
           adds behaviour to it — repeating it, hiding it,
           animating it, or anything else you can express in
           code.</p>

        <h2><a href="/docs/services">Services</a></h2>
        <p class="note">A class that holds data or logic shared
           across multiple components. The framework creates the
           instance and passes it to any component that needs it.</p>

        <h2><a href="/docs/components/marshalling">Attribute codecs</a></h2>
        <p class="note">HTML attributes are always strings. When a
           field holds a richer type like a
           <code class="inline">Date</code>, a codec converts it
           to a string for the attribute and back again. Built-in
           codecs cover common types; you register your own for
           anything custom.</p>

        <h2><a href="/docs/navigation">Navigation</a></h2>
        <p class="note">A router that maps URL paths to
           components. The browser URL changes, the matching
           component renders — no full page reload.</p>

        <h2><a href="/docs/ssg">Static site generation</a></h2>
        <p class="note">Pre-render your app to static HTML so
           pages load instantly without waiting for JavaScript.</p>
    `,
    styles: `:host { display: block; }\nh2 { margin-top: 1.5rem; }`,
})
export class DocsConcepts extends DocSection {}
