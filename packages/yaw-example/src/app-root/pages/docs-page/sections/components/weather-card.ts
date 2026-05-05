import { Component, Inject, RxElement, state } from '@yaw-rx/core';
import { RxFor } from '@yaw-rx/core/directives/rx-for';
import { type Subscription } from 'rxjs';
import { WeatherService } from './weather-service.js';

@Component({
    selector: 'weather-card',
    providers: [WeatherService],
    directives: [RxFor],
    template: `
        <div class="hero">
            <span class="big-icon">{{svc.icon}}</span>
            <div class="summary">
                <h2>{{svc.city}}</h2>
                <p class="temp">{{svc.temp}}°C</p>
                <p class="wind">💨 {{svc.wind}} km/h</p>
            </div>
        </div>
        <ul class="forecast" rx-for="hour of svc.hours">
            <li>
                <span class="hour-icon">{{hour.icon}}</span>
                <span class="hour-time">{{hour.time}}</span>
                <span class="hour-temp">{{hour.temp}}°C</span>
            </li>
        </ul>
    `,
    styles: `
        :host { display: block; padding: 1.25rem; background: var(--bg-2);
                border: var(--border-width) solid var(--bg-5); border-radius: var(--radius-lg);
                font-family: system-ui, sans-serif; color: var(--text); }
        .hero { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
        .big-icon { font-size: 3.5rem; line-height: 1; }
        .summary { display: flex; flex-direction: column; gap: 0.1rem; }
        h2 { color: var(--white); font-size: 1.1rem; font-weight: 700; margin: 0; }
        .temp { color: var(--accent); font-size: 1.4rem; font-weight: 600; margin: 0; }
        .wind { color: var(--muted); font-size: 0.85rem; margin: 0; }
        .forecast { list-style: none; padding: 0; margin: 0;
                    border-top: var(--border-width) solid var(--bg-5); padding-top: 0.75rem; }
        li { display: flex; align-items: center; gap: 0.75rem;
             padding: 0.3rem 0; font-size: 0.85rem; }
        .hour-icon { width: 1.5rem; text-align: center; }
        .hour-time { color: var(--secondary); min-width: 3.5rem; }
        .hour-temp { color: var(--accent); margin-left: auto; }
    `,
})
export class WeatherCard extends RxElement {
    @Inject(WeatherService) svc!: WeatherService;
    @state lat = 52.52;
    @state lon = 13.41;
    private subs: Subscription[] = [];

    override onInit(): void {
        this.subs.push(
            this.lat$.subscribe((v) => { this.svc.lat = v; }),
            this.lon$.subscribe((v) => { this.svc.lon = v; }),
        );
    }

    override onDestroy(): void {
        for (const sub of this.subs) sub.unsubscribe();
    }
}
