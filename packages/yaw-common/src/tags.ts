/** Identity tagged template — triggers HTML syntax highlighting in the yaw-vscode extension. */
export const html = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    String.raw({ raw: strings }, ...values);

/** Identity tagged template — triggers CSS syntax highlighting in the yaw-vscode extension. */
export const css = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    String.raw({ raw: strings }, ...values);

/** Identity tagged template — triggers TypeScript syntax highlighting in the yaw-vscode extension. */
export const ts = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    String.raw({ raw: strings }, ...values);

/** Identity tagged template — triggers WGSL syntax highlighting in the yaw-vscode extension. */
export const wgsl = (strings: TemplateStringsArray, ...values: readonly unknown[]): string =>
    String.raw({ raw: strings }, ...values);
