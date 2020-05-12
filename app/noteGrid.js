const el = require('./el');


const attachNoteGrid = module.exports =
(scheduler, audioCtx, output) => {
  const RUN = () => {
    registerWithScheduler();
    return renderEls();
  }

  const beatCount = 8;

  // const grid = drums.map( () =>
  //   [...Array(beatCount).keys()].map(() => false) );
  const notes = [
    { beatI:0, octave:4, scaleOctaveNoteI:0 },
    { beatI:1, octave:4, scaleOctaveNoteI:1 },
    { beatI:2, octave:4, scaleOctaveNoteI:2 },
    { beatI:3, octave:4, scaleOctaveNoteI:0 },
    { beatI:5, octave:4, scaleOctaveNoteI:0 },
    { beatI:5, octave:4, scaleOctaveNoteI:2 },
    { beatI:7, octave:4, scaleOctaveNoteI:1 },
    { beatI:7, octave:4, scaleOctaveNoteI:3 },
  ];

  // const buttonsPerBeat = [...Array(beatCount).keys()].map( () => [] );

  const renderEls = () =>
    el('div.note-grid.control', [ "note grid" ])

  const registerWithScheduler = () => {
    // TODO: unregister on destruction
    scheduler.register({

      scheduleBeat: (beatI, scheduleTime) => {
        notesInBeat = notes.filter(note => note.beatI == beatI % beatCount);   // TODO: maybe optimize by grouping notes by beatI in array?
        return notesInBeat.map( (note) => playNoteAt(note, scheduleTime))
        console.log("NoteGrid: scheduleBeat", beatI, scheduleTime, notesInBeat);
      },

      onBeat: beatI => {
        console.log("NoteGrid: onBeat", beatI);
      },

    });
  }

  // { beatI:0, octave:4, scaleOctaveNoteI:0 },
  const playNoteAt = (note, startTime) => {
    const duration = 1/scheduler.bps;  // in beats
    const oscillator = audioCtx.createOscillator();
    // oscillator.type = 'triangle';
    oscillator.frequency.value = freqForMidiNoteNumber(69+note.scaleOctaveNoteI); // TODO
    oscillator.start(startTime + 0.0);
    oscillator.stop (startTime + duration * 2);

    const envelope = audioCtx.createGain();  // TODO: do these leak?  Unreachable after oscillator stops, though not disconnected.  When I tried to disconnect them thereafter, things gliched and swerved.  Why?
    envelope.gain.linearRampToValueAtTime      (0.0001, 0.000001);                   // initial
    envelope.gain.exponentialRampToValueAtTime (1.0, startTime + duration * 0.015);  // Attack
    envelope.gain.exponentialRampToValueAtTime (0.3, startTime + duration * 0.4);    // Decay
    envelope.gain.setValueAtTime               (0.3, startTime + duration * 1.0);    // Sustain
    envelope.gain.linearRampToValueAtTime      (0.0001, startTime + duration * 1.5); // Release

    oscillator.connect(envelope);
    envelope.connect(output);

    // console.log("schedule start", startTime, midiNote, audioCtx.currentTime, );
    return oscillator;  // an AudioScheduledSourceNode, for lookahead management by scheduler
  }

  return RUN();
}

const freqForMidiNoteNumber = n => Math.pow(2, (n-69)/12) * 440
