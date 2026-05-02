import { of } from 'rxjs';
import { Component, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';

@Component({
    selector: 'scope-demo',
    directives: [RxFor],
    template: `
        <div class="teams" rx-for="team, teamIdx of teams by id">
            <div class="team">
                <h4>{{teamIdx}}: {{team.name}}</h4>
                <ul rx-for="{ name, role }, i of team.members by id">
                    <li>{{i}}: {{name}} ({{role}})</li>
                </ul>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; }
        .teams { display: flex; flex-direction: column; gap: 1rem; }
        .team { background: #050505; border: 1px solid #1a1a1a; border-radius: 6px;
                padding: 0.75rem 1rem; }
        h4 { color: #8af; margin: 0 0 0.5rem; font-family: monospace; font-size: 0.85rem; }
        ul { margin: 0; padding-left: 1.2rem; }
        li { color: #ccc; font-family: monospace; font-size: 0.8rem; padding: 0.15rem 0; }
    `,
})
export class ScopeDemo extends RxElement {
    @state teams = [
        { id: 1, name: of('Alpha'), members: of([
            { id: 10, name: of('Alice'), role: of('lead') },
            { id: 11, name: of('Bob'), role: of('dev') },
        ])},
        { id: 2, name: of('Beta'), members: of([
            { id: 20, name: of('Carol'), role: of('lead') },
            { id: 21, name: of('Dave'), role: of('dev') },
            { id: 22, name: of('Eve'), role: of('ops') },
        ])},
    ];
}
