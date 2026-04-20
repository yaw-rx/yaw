import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.js';

const REACT_SNIPPET = `
    // React: 140KB to call appendChild
    const [count, setCount] = useState(0);
    useEffect(() => { document.title = count; }, [count]);
`;

const YAW_SNIPPET = `
    // YAW: 4KB. Direct. Honest.
    @observable count = 0;
    // That's it. The DOM updates. No diff. No reconciliation.
`;

@Component({
    selector: 'manifesto-page',
    directives: [ScrollReveal],
    template: `
        <hero-section></hero-section>

        <div class="sections">
            <manifesto-section heading="The Crime Scene">
                We were handed a runtime that renders trees in C++, and we responded by building
                JavaScript replicas of it. Angular shipped Zone.js to monkey-patch every async API
                in the browser. React asks you to pretend the DOM doesn't exist, then builds a
                virtual one, diffs it, and finally touches the real thing. The virtual part is pure tax.
                <code-block lang="ts"><script type="text/plain">${REACT_SNIPPET}</script></code-block>
            </manifesto-section>

            <manifesto-section heading="The Lie of Sophistication">
                These are not insights. These are apologies for overhead. Angular's change detection
                is "we have no idea when your state changes so we check everything, constantly."
                React's unidirectional data flow is just "we diff two trees because we don't trust you."
                The actual solution was always there: push updates directly to the DOM when you know
                they happened.
            </manifesto-section>

            <manifesto-section heading="Our Heresy">
                We reject Zone.js — we can unsubscribe. We reject the virtual DOM — we can read.
                We write inline text bindings and attribute bindings because no one wants to write
                subscriptions inline. The template is the abstraction that earns its keep: it compiles
                to exactly those subscriptions and nothing else.
                <code-block lang="ts"><script type="text/plain">${YAW_SNIPPET}</script></code-block>
            </manifesto-section>

            <manifesto-section heading="The Platform Is Enough">
                HTML parses. Custom elements instantiate. Attributes are strings we can scan.
                connectedCallback is onInit. disconnectedCallback is onDestroy. appendChild adds nodes.
                RxJS handles asynchrony. The DI container is a Map with a parent pointer.
                Everything else is ceremony.
            </manifesto-section>
        </div>

        <page-footer></page-footer>
    `,
    styles: `
        :host { display: block; background: #000; min-height: calc(100vh / 1.75); }
        .sections { padding: 2rem 0; }
    `
})
export class ManifestoPage extends RxElement {}
