export interface HydrationStateBlob {
    components: Record<string, Record<string, unknown>>;
    services: Record<string, Record<string, unknown>>;
    directives: Record<string, unknown>;
}
