const el = require('./el');


const attachNoteGrid = module.exports =
(scheduler, audioCtx, output) => {
  const RUN = () => {
    registerWithScheduler();
    return renderEls();
  }

  const beatCount = 16;

  // const grid = drums.map( () =>
  //   [...Array(beatCount).keys()].map(() => false) );

  const makeNote = (beatI, octave, scaleOctaveNoteI) =>
    ({beatI, octave, scaleOctaveNoteI});

  const notes = [
    // makeNote(0+0, 4, 0),
    // makeNote(0+1, 4, 0),
    // makeNote(0+2, 4, 0),
    // makeNote(0+3, 4, 0),
    // makeNote(0+4, 4, 0),
    // makeNote(0+5, 4, 0),
    // makeNote(0+6, 4, 0),
    //
    // makeNote(0+0, 4, 0),
    // makeNote(0+1, 4, 1),
    // makeNote(0+2, 4, 2),
    // makeNote(0+3, 4, 0),
    // makeNote(0+5, 4, 0),
    // makeNote(0+5, 4, 2),
    // makeNote(0+7, 4, 1),
    // makeNote(0+7, 4, 3),
    //
    // makeNote(8+0, 4, 0),
    // makeNote(8+1, 4, 1),
    // makeNote(8+2, 4, 2),
    // makeNote(8+3, 4, 3),
    // makeNote(8+4, 4, 4),
    // makeNote(8+5, 4, 5),
    // makeNote(8+6, 4, 6),
    // makeNote(8+7, 4, 0),
    // makeNote(8+7, 4, 2),
    // makeNote(8+7, 4, 4),
  ];

  const renderEls = () => {
    dx = makeScale({  // beats
      domain: [0, beatCount],
      range:  [0, 800],
    });
    dy = makeScale({  // notes in scale octave
      domain: [0, 7],
      range:  [400, 0],
    });

    elsvg = el.withNs("http://www.w3.org/2000/svg")
    return el('div.note-grid.control', [ // TODO scrollable, more octaves
      elsvg('svg', {
        width:dx(beatCount),
        height:dy(0),
        click: e => {
          // if viewBox see https://stackoverflow.com/a/42711775/17055
          const dim = e.target.getBoundingClientRect();
          const x = e.clientX - dim.left;
          const y = e.clientY - dim.top;
          const beatI = Math.floor(dx.invert(x));
          const noteI = Math.floor(dy.invert(y));
          console.log("svgN", beatI, noteI);
          const note = makeNote(beatI, 4, noteI);
          notes.push(note);
          e.target.appendChild(makeSvgNote(note));
          scheduler.reset();
        },
      }),
    ]);
  }

  const makeSvgNote = note => { // TODO: octaves
    p1 = { x:dx(note.beatI+0), y:dy(note.scaleOctaveNoteI+0) };
    p2 = { x:dx(note.beatI+1), y:dy(note.scaleOctaveNoteI+1) };
    return elsvg('polygon', {
      points: `
        ${p1.x},${p1.y}
        ${p2.x},${p1.y}
        ${p2.x},${p2.y}
        ${p1.x},${p2.y}
        `,
      fill:'lightblue',
      stroke:'steelblue',
      click: e => {
        console.log("note", e);
        notes.splice(notes.indexOf(note), 1);
        e.target.remove();
        scheduler.reset();
        // e.stopPropogation();  //WTF?!?
        e.cancelBubble = true;
      },
    });
  }

  const registerWithScheduler = () => {
    // TODO: unregister on destruction
    scheduler.register({

      scheduleBeat: (beatI, scheduleTime) => {
        const notesInBeat = notes.filter(note => note.beatI == beatI % beatCount);   // TODO: maybe optimize by grouping notes by beatI in array?
        console.log("NoteGrid: scheduleBeat", beatI, scheduleTime, notesInBeat);
        return notesInBeat.map(note => playNoteAt(note, scheduleTime))
      },

      onBeat: beatI => {
        console.log("NoteGrid: onBeat", beatI);
      },

    });
  }

  // { beatI:0, octave:4, scaleOctaveNoteI:0 },
  const playNoteAt = (note, startTime) => {
    // TODO: refactor: DRY against instruments.makeUrlSampleDrum
    const duration = 1/scheduler.bps;  // in beats; TODO: * note.beatLength
    const at = when => startTime + duration * when

    const oscillator = audioCtx.createOscillator();
    // oscillator.type = 'triangle';
    // TODO BROKEN:
    // const midiNoteNumber = midi.midiNoteNumberForScaleNoteNumber("minor", 9, note.octave, note.scaleOctaveNoteI); // TODO: paramaterize
    const midiNoteNumber = midi.midiNoteNumberForScaleNoteNumber("major", 0, note.octave, note.scaleOctaveNoteI); // TODO: paramaterize
    oscillator.frequency.value = midi.freqForMidiNoteNumber(midiNoteNumber);
    console.log({midiNoteNumber, scaleOctaveNoteI:note.scaleOctaveNoteI, frequency:oscillator.frequency.value})
    oscillator.start(at(0.0));
    oscillator.stop (at(2));

    const envelope = audioCtx.createGain();  // TODO: do these leak?  Unreachable after oscillator stops, though not disconnected.  When I tried to disconnect them thereafter, things gliched and swerved.  Why?
    envelope.gain.linearRampToValueAtTime      (0.0001, 0.000001);   // (initial)
    envelope.gain.exponentialRampToValueAtTime (1.0,    at(0.025));  // Attack
    envelope.gain.exponentialRampToValueAtTime (0.3,    at(0.4));    // Decay
    envelope.gain.setValueAtTime               (0.3,    at(1.0));    // Sustain
    envelope.gain.linearRampToValueAtTime      (0.0001, at(1.5));    // Release

    oscillator.connect(envelope);
    envelope.connect(output);

    // console.log("schedule start", startTime, midiNote, audioCtx.currentTime, );
    return oscillator;  // an AudioScheduledSourceNode, for lookahead management by scheduler
  }

  return RUN();
}

// TODO: DRY and move to midi.js
const midi = {
  notesPerOctave: 12,
  scalesByName: {
    // each scale is an array of 7 note offsets
    major: [0,2,4,5,7,9,11/*,12*/], // T T S T T T S
    minor: [0,2,3,5,7,8,10/*,12*/], // T S T T S T T
  },
  midiNoteNumberForScaleNoteNumber: (scaleName, rootNumber, octave, scaleOctaveNoteI) =>
    // http://www.tonalsoft.com/pub/news/pitch-bend.aspx; rootNumber:(C:0,A:5)
    ((octave+1) * midi.notesPerOctave) + rootNumber + ((midi.scalesByName[scaleName]||[])[scaleOctaveNoteI]||0) ,
  freqForMidiNoteNumber: n => Math.pow(2, (n-69)/12) * 440,
}

// TODO: move to utils or svg or whatever
const makeScale = opts => {
  make = opts => {
    const istart = opts.domain[0];
    const istop  = opts.domain[1];
    const ostart = opts.range[0];
    const ostop  = opts.range[1];

    return (value) =>
      ( ostart + (ostop - ostart) * ((value - istart) / (istop - istart)) )
  }

  const scale = make(opts);
  scale.invert = make({
    domain: opts.range,
    range: opts.domain,
  });

  return scale;
};
