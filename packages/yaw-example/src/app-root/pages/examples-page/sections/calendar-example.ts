import 'reflect-metadata';
import { Component, RxElement } from 'yaw';
import { escape } from '../../../components/code-block/code-highlight.js';
import { DOC_STYLES } from '../../../utils/doc-styles.js';

const GRID_SOURCE = `@Component({
    selector: 'calendar-grid',
    template: \`
        <header class="toolbar">
            <button class="nav" onclick="prevMonth">‹</button>
            <div class="title">{{monthLabel}}</div>
            <button class="nav" onclick="nextMonth">›</button>
            <div class="slot-wrap"><slot name="actions"></slot></div>
        </header>
        <div class="dow">
            <div>Mo</div><div>Tu</div><div>We</div>
            <div>Th</div><div>Fr</div><div>Sa</div><div>Su</div>
        </div>
        <div class="weeks" rx-for="weeks by key">
            <calendar-week></calendar-week>
        </div>
    \`,
})
export class CalendarGrid extends RxElement<{
    currentYear: number;
    currentMonth: number;
    selectedDate: string | null;
}> {
    @observable currentYear = new Date().getFullYear();
    @observable currentMonth = new Date().getMonth();
    @observable selectedDate: string | null = null;

    get weeks$(): Observable<readonly WeekSeed[]> {
        return combineLatest([this.currentYear$, this.currentMonth$, this.selectedDate$])
            .pipe(map(([y, m, sel]) => buildWeeks(y, m, sel)));
    }

    get monthLabel$(): Observable<string> {
        return combineLatest([this.currentYear$, this.currentMonth$])
            .pipe(map(([y, m]) => \`\${MONTH_NAMES[m]} \${y}\`));
    }

    prevMonth(): void { /* decrement month, wrap year */ }
    nextMonth(): void { /* increment month, wrap year */ }
    today(): void     { /* jump to today, select it */ }
    selectDate(date: string): void { this.selectedDate = date; }
}`;

const WEEK_SOURCE = `@Component({
    selector: 'calendar-week',
    template: \`
        <div class="days" rx-for="days by key">
            <calendar-day></calendar-day>
        </div>
    \`,
})
export class CalendarWeek extends RxElement<{
    weekIdx: number;
    days: readonly DayCell[];
}> {
    @observable weekIdx = 0;
    @observable days: readonly DayCell[] = [];
}`;

const DAY_SOURCE = `@Component({
    selector: 'calendar-day',
    template: \`<button onclick="^^.selectDate(date)"
                       [class.selected]="selected"
                       [class.in-month]="inMonth">{{day}}</button>\`,
})
export class CalendarDay extends RxElement<{
    date: string;
    day: number;
    inMonth: boolean;
    selected: boolean;
}> {
    @observable date = '';
    @observable day = 0;
    @observable inMonth = false;
    @observable selected = false;
}`;

const USAGE = `<calendar-grid>
    <button slot="actions" onclick="today">Today</button>
</calendar-grid>`;

const LOOKUP_SOURCE = `const nextHost = (el) =>
    el.parentElement?.closest('[data-rx-host]');

const walkScope = (host, carets) => {
    let scope = nextHost(host);
    for (let i = 0; i < carets; i++) scope = nextHost(scope);
    return scope;
};`;

@Component({
    selector: 'calendar-example',
    template: `
        <h1>Calendar</h1>
        <p class="lede">Three components stacked —
           <code class="inline">calendar-grid</code> owns the state and renders a list of
           <code class="inline">calendar-week</code>, each week renders a list of
           <code class="inline">calendar-day</code>. Click any day and the event crosses two
           component boundaries to mutate one <code class="inline">selectedDate</code> on the
           grid. The bindings are authored flat; the compiler injects carets based on how
           many custom-element layers each call sits inside. Resolution at runtime is a
           literal <code class="inline">closest('[data-rx-host]')</code> walk.</p>

        <section class="host">
            <h2>calendar-grid — owns the state</h2>
            <p class="note">The root of the tree. Holds
               <code class="inline">currentYear</code>,
               <code class="inline">currentMonth</code>, and
               <code class="inline">selectedDate</code>. Derives the grid via
               <code class="inline">combineLatest</code> + <code class="inline">rx-for</code>.
               The toolbar's prev/next are authored at depth 0 — no carets needed, same scope
               as the host.</p>
            <code-block lang="ts">${escape`${GRID_SOURCE}`}</code-block>
        </section>

        <section class="host">
            <h2>calendar-week — thin row</h2>
            <p class="note">Nothing but an <code class="inline">rx-for</code> over its
               <code class="inline">days</code>. No state of its own, no methods — it exists
               to give the day cells a structural parent so the caret story has a middle
               layer to walk through.</p>
            <code-block lang="ts">${escape`${WEEK_SOURCE}`}</code-block>
        </section>

        <section class="host">
            <h2>calendar-day — the leaf</h2>
            <p class="note">One button, two class bindings, one method call reaching up two
               custom-element layers — <code class="inline">^^.selectDate(date)</code> walks
               day → week → grid. Authored as-is; nothing is synthesised at runtime.</p>
            <code-block lang="ts">${escape`${DAY_SOURCE}`}</code-block>
        </section>

        <section class="ex">
            <h2>In use</h2>
            <p class="note">Drop a <code class="inline">calendar-grid</code> anywhere, project
               a <code class="inline">Today</code> button into the named slot. The projected
               button sits one layer down from the grid — compiler rewrites
               <code class="inline">onclick="today"</code> to
               <code class="inline">^.today</code> because a <code class="inline">&lt;slot&gt;</code>
               is transparent to scope but being lexically inside a custom element is not.</p>
            <div class="split">
                <code-block lang="html">${escape`${USAGE}`}</code-block>
                <div class="live">${USAGE}</div>
            </div>
        </section>

        <section class="ex">
            <h2>Where the carets come from</h2>
            <p class="note">Three <code class="inline">onclick</code> calls, three different
               depths, one flat author-time style. The compiler counts how many custom-element
               layers each call is nested inside and injects that many carets:</p>
            <ul class="depths">
                <li><code class="inline">onclick="prevMonth"</code> — inside
                   <code class="inline">calendar-grid</code>'s own template. Depth 0. Compiled
                   verbatim.</li>
                <li><code class="inline">onclick="today"</code> — projected into
                   <code class="inline">&lt;calendar-grid&gt;</code> via a slot. Depth 1.
                   Compiled to <code class="inline">^.today</code>.</li>
                <li><code class="inline">onclick="^^.selectDate(date)"</code> — inside
                   <code class="inline">calendar-day</code>, two custom-element layers away
                   from the grid. Authored with explicit carets since the day component itself
                   owns that binding. Could equivalently be written
                   <code class="inline">parentRef.parentRef.selectDate(date)</code> — pure
                   spelling choice.</li>
            </ul>
        </section>

        <section class="ex">
            <h2>How a caret resolves at runtime</h2>
            <p class="note">Every <code class="inline">@Component</code> element gets
               <code class="inline">data-rx-host=""</code> written on it on connect. A caret
               is one <code class="inline">parentElement.closest('[data-rx-host]')</code>
               hop. The whole scope walker is six lines of DOM, no framework state, nothing
               cached:</p>
            <code-block lang="ts">${escape`${LOOKUP_SOURCE}`}</code-block>
            <p class="note">Mirrors (<code class="inline">rx-div</code>,
               <code class="inline">rx-button</code>) and plain DOM don't carry the
               <code class="inline">data-rx-host</code> attribute, so
               <code class="inline">closest</code> skips past them and lands on the next real
               component host. That's why projection through a slot doesn't add a layer:
               the slot tag itself isn't a component and doesn't mark a host.</p>
        </section>

        <section class="ex">
            <h2>Siblings share the one source of truth</h2>
            <p class="note">Any day cell, the prev/next buttons, the projected Today — all
               mutate the same three observables on the one
               <code class="inline">calendar-grid</code>. There's no fan-out, no store, no
               shared state container. The component you clicked walked up the DOM to find
               its host, and wrote to it directly.</p>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .depths { list-style: none; padding: 0; margin: 0;
                  display: flex; flex-direction: column; gap: 0.5rem;
                  color: #888; font-size: 0.9rem; line-height: 1.6; }
        .depths li { padding: 0.6rem 0.8rem; background: #050505;
                     border-left: 2px solid #1a2352; border-radius: 3px; }
    `,
})
export class CalendarExample extends RxElement {}
