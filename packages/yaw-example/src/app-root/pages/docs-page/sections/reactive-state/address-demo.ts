import { getAddress, type Address } from 'viem';
import { type AttributeCodec, Component, RxElement, state } from '@yaw-rx/core';

@Component({
    selector: 'address-demo',
    attributeCodecs: {
        Address: {
            encode: (v) => v as string,
            decode: (s) => getAddress(s),
        } as AttributeCodec,
    },
    template: `
        <div class="panel">
            <div class="row">
                <span class="label">Address</span>
                <code class="value">{{wallet}}</code>
            </div>
            <div class="buttons">
                <button onclick="setVitalik">vitalik.eth</button>
                <button onclick="setZero">zero address</button>
            </div>
        </div>
    `,
    styles: `
        :host { display: block; width: 100%; }
        .panel { display: flex; flex-direction: column; gap: 0.75rem; }
        .row { display: flex; align-items: center; gap: 0.75rem;
               justify-content: space-between; flex-wrap: wrap; }
        .label { color: var(--secondary); font-family: monospace; font-size: 0.75rem;
                 text-transform: uppercase; letter-spacing: 0.08em; }
        .value { color: var(--accent); font-family: monospace; font-size: 0.7rem;
                 background: var(--bg-2); padding: 0.35rem 0.7rem;
                 border: 1px solid var(--bg-5); border-radius: 4px;
                 overflow: hidden; text-overflow: ellipsis; word-break: break-all; }
        .buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        button { background: var(--bg-3); border: 1px solid var(--border); color: var(--white);
                 padding: 0.4rem 0.8rem; font: inherit; font-family: monospace;
                 font-size: 0.8rem; cursor: pointer; border-radius: 4px; }
        button:hover { border-color: var(--accent); color: var(--accent); }
    `,
})
export class AddressDemo extends RxElement {
    @state wallet!: Address;

    setVitalik(): void {
        this.wallet = getAddress('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');
    }
    setZero(): void {
        this.wallet = getAddress('0x0000000000000000000000000000000000000000');
    }
}
