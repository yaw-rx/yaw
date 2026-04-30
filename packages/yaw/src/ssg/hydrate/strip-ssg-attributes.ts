/**
 * Removes all `data-ssg-id` attributes from the DOM after hydration completes.
 *
 * These attributes are structural markers used during SSG capture to map
 * components to their serialized state. They serve no purpose after hydration.
 */
export const stripSsgAttributes = (): void => {
    for (const el of document.querySelectorAll('[data-ssg-id]')) {
        el.removeAttribute('data-ssg-id');
    }
};
