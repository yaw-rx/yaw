import { Component, RxElement } from 'yaw';
import { DOC_STYLES } from '../../../utils/doc-styles.js';
import './drum-sequencer/drum-machine.js';

@Component({
    selector: 'drum-sequencer',
    template: `
        <h1>Drum sequencer</h1>
        <p class="lede">Three nested components, a Web Audio service, and the same caret
           syntax running through all of it. <code class="inline">drum-machine</code> owns
           the pattern and the transport. <code class="inline">track-row</code> owns mute
           and displays its slice. <code class="inline">step-cell</code> owns its lit/active
           pixel. Click a cell and the event crosses two scope boundaries —
           <code class="inline">^^toggleStep(^trackKey, idx)</code> — to mutate the
           pattern at the root, which cascades back down via <code class="inline">rx-for</code>.
           Press play and the <code class="inline">AudioEngine</code> synthesises every voice
           inline with oscillators and noise bursts. No samples, no loops, no tricks.</p>

        <section class="ex">
            <h2>Play it</h2>
            <p class="note">Click cells to program, press play. The playhead sweeps, the
               cells flash, the speakers click. Drag tempo to rescale the clock. RAND
               seeds a pattern, CLR wipes it. Mute a track by clicking its name.</p>
            <div class="live"><drum-machine></drum-machine></div>
        </section>
    `,
    styles: `
        :host { display: block; }
        ${DOC_STYLES}
        .ex { margin-top: 2rem; }
        .live { padding: 0; background: transparent; border: none; zoom: 65%; }
    `,
})
export class DrumSequencer extends RxElement {}
