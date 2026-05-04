import { Injectable, state } from '@yaw-rx/core';
import { combineLatest, switchMap, from, timer, type Subscription } from 'rxjs';

export interface Forecast {
    time: string;
    temp: number;
    icon: string;
}

const ICONS: Record<number, string> = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️',
    45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️',
    80: '🌦️', 81: '🌧️', 82: '🌧️',
    95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function weatherIcon(code: number): string {
    return ICONS[code] ?? '🌡️';
}

@Injectable()
export class WeatherService {
    @state lat = 52.52;
    @state lon = 13.41;
    @state city = 'Berlin';
    @state temp = 0;
    @state wind = 0;
    @state icon = '☀️';
    @state hours: Forecast[] = [];

    private sub!: Subscription;

    onInit(): void {
        this.sub = combineLatest([this.lat$, this.lon$]).pipe(
            switchMap(([lat, lon]) => timer(0, 15 * 60_000).pipe(
                switchMap(() => from(this.poll(lat, lon))),
            )),
        ).subscribe();
    }

    onDestroy(): void {
        this.sub.unsubscribe();
    }

    private async poll(lat: number, lon: number): Promise<void> {
        const res = await fetch(
            `https://api.open-meteo.com/v1/forecast`
            + `?latitude=${lat}&longitude=${lon}`
            + `&current=temperature_2m,wind_speed_10m,weather_code`
            + `&hourly=temperature_2m,weather_code`,
        );
        const data = await res.json();
        this.temp = data.current.temperature_2m;
        this.wind = data.current.wind_speed_10m;
        this.icon = weatherIcon(data.current.weather_code);
        const nowHour = new Date().toISOString().slice(0, 13);
        const times = data.hourly.time as string[];
        const start = Math.max(0, times.findIndex(t => t.startsWith(nowHour)));
        this.hours = data.hourly.temperature_2m.slice(start, start + 6).map((t: number, i: number) => ({
            time: (data.hourly.time[start + i] as string).slice(11),
            temp: t,
            icon: weatherIcon(data.hourly.weather_code[start + i] as number),
        }));
    }
}
