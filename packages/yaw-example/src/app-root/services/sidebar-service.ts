import { Injectable, state } from '@yaw-rx/core';

@Injectable()
export class SidebarService {
    @state open = false;
    @state available = false;

    toggle(): void {
        this.open = !this.open;
    }

    close(): void {
        this.open = false;
    }
}
