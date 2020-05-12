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
  const notes = [
    // { beatI:0+0, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+1, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+2, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+3, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+4, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+5, octave:4, scaleOctaveNoteI:0 },
    // { beatI:0+6, octave:4, scaleOctaveNoteI:0 },

    { beatI:0+0, octave:4, scaleOctaveNoteI:0 },
    { beatI:0+1, octave:4, scaleOctaveNoteI:1 },
    { beatI:0+2, octave:4, scaleOctaveNoteI:2 },
    { beatI:0+3, octave:4, scaleOctaveNoteI:0 },
    { beatI:0+5, octave:4, scaleOctaveNoteI:0 },
    { beatI:0+5, octave:4, scaleOctaveNoteI:2 },
    { beatI:0+7, octave:4, scaleOctaveNoteI:1 },
    { beatI:0+7, octave:4, scaleOctaveNoteI:3 },

    { beatI:8+0, octave:4, scaleOctaveNoteI:0 },
    { beatI:8+1, octave:4, scaleOctaveNoteI:1 },
    { beatI:8+2, octave:4, scaleOctaveNoteI:2 },
    { beatI:8+3, octave:4, scaleOctaveNoteI:3 },
    { beatI:8+4, octave:4, scaleOctaveNoteI:4 },
    { beatI:8+5, octave:4, scaleOctaveNoteI:5 },
    { beatI:8+6, octave:4, scaleOctaveNoteI:6 },
    { beatI:8+7, octave:4, scaleOctaveNoteI:0 },
    { beatI:8+7, octave:4, scaleOctaveNoteI:2 },
    { beatI:8+7, octave:4, scaleOctaveNoteI:4 },
  ];

  // const buttonsPerBeat = [...Array(beatCount).keys()].map( () => [] );

  const renderEls = () =>
    el('div.note-grid.control', [ "note grid" ])

  const registerWithScheduler = () => {
    // TODO: unregister on destruction
    scheduler.register({

      scheduleBeat: (beatI, scheduleTime) => {
        const notesInBeat = notes.filter(note => note.beatI == beatI % beatCount);   // TODO: maybe optimize by grouping notes by beatI in array?
        console.log("NoteGrid: scheduleBeat", beatI, scheduleTime, notesInBeat);
        return notesInBeat.map((note) => playNoteAt(note, scheduleTime))
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
    // const midiNoteNumber = midi.midiNoteNumberForScaleNoteNumber("minor", 4, note.octave, note.scaleOctaveNoteI); // TODO: paramaterize
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
