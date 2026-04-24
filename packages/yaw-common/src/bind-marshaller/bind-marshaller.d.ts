export type BindKind = 'class' | 'on' | 'style' | 'attr' | 'prop' | 'ref' | 'text' | 'model';
export interface BindMarshallerResult {
    kind: BindKind;
    memberPath: string[];
}
export interface BindMarshaller {
    encode(kind: BindKind, memberPath?: string[]): string;
    decode(attr: string): BindMarshallerResult | undefined;
}
