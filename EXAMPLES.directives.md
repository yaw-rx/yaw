```typescript
// A directive owns the reactive wiring for a named attribute.
// It evaluates the expression, subscribes to observables on the parent,
// and calls the named method on the host element when the value changes.

@Directive({ attribute: 'condition', type: Boolean })
class ConditionDirective {
    connect(expr: string, parent: RxElement, host: RxElement): Subscription[] {
        const ctx = parent as unknown as Record<string, unknown>;
        const subs: Subscription[] = [];
        const run = () => (host as any).condition(Boolean(evaluate(expr, ctx)));
        for (const id of identifiers(expr)) {
            const subject = ctx[`${id}$`];
            if (subject && 'subscribe' in subject)
                subs.push((subject as any).subscribe(run));
        }
        run();
        return subs;
    }
}

@Directive({ attribute: 'items', type: Array })
class ItemsDirective {
    connect(expr: string, parent: RxElement, host: RxElement): Subscription[] {
        const ctx = parent as unknown as Record<string, unknown>;
        const subject = ctx[`${expr}$`];
        if (!subject || !('subscribe' in subject)) return [];
        return [(subject as any).subscribe((val: unknown[]) => (host as any).items(val))];
    }
}


// Components declare which directives they host.
// They implement the method — that's the only contract.

@Component({
    selector: 'rx-if',
    directives: [ConditionDirective]
})
class RxIf extends RxElement {
    private content = '';

    override onInit(): void {
        const tpl = this.firstElementChild;
        if (tpl instanceof HTMLTemplateElement) this.content = tpl.innerHTML;
    }

    condition(show: boolean): void {
        this.innerHTML = show ? this.content : '';
    }
}

// <rx-if condition="count > 0">
//   <template><span>items</span></template>
// </rx-if>


@Component({
    selector: 'rx-for',
    directives: [ItemsDirective]
})
class RxFor extends RxElement {
    items(incoming: unknown[]): void {
        // stamp/remove DOM nodes keyed by id
    }
}

// <rx-for items="tasks" key="id">
//   <template><task-row></task-row></template>
// </rx-for>


// Directives can also be used standalone on any element in a component's template.
// The host element just needs to implement the method.

@Directive({ attribute: 'highlight', type: Boolean })
class HighlightDirective {
    connect(expr: string, parent: RxElement, host: RxElement): Subscription[] {
        const ctx = parent as unknown as Record<string, unknown>;
        const subs: Subscription[] = [];
        const run = () => (host as any).highlight(Boolean(evaluate(expr, ctx)));
        for (const id of identifiers(expr)) {
            const subject = ctx[`${id}$`];
            if (subject && 'subscribe' in subject)
                subs.push((subject as any).subscribe(run));
        }
        run();
        return subs;
    }
}

@Component({
    selector: 'task-list',
    template: `<li highlight="selectedId === item.id">{{item.title}}</li>`,
    directives: [HighlightDirective]
})
class TaskList extends RxElement {
    highlight(active: boolean): void {
        this.classList.toggle('highlighted', active);
    }
}
```
