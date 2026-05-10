import { Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'hb-row',
    template: `
        <div class="col-md-1">{{id}}</div>
        <div class="col-md-4"><a>{{label}}</a></div>
        <div class="col-md-1"><a><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></div>
        <div class="col-md-6"></div>
    `,
    styles: `:host { display: contents; }`,
})
export class HbRow extends RxElement {
    @state id = 0;
    @state label = '';
}
