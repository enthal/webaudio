const el = require('./el');


module.exports =
(selector='body') => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // TODO: by browser policy, must (I THINK!) be created in a click handler or all audio is muted (ok for now on desktop Chrome, but to change in next Chrome release)

  const GO = () => {
    const scheduler = require('./scheduler')(audioCtx);
    const master = makeMaster(audioCtx);
    const topEl = require('./controls').attachTopControls(audioCtx, scheduler, master);

    const drums = makeDrums(master, [ 69-12, 69-7, 69 ]);  // 69 == MIDI A4; 12 == octave note width;
    const beatGridEl = require('./beatGrid')(scheduler, drums);

    el.select(selector, [topEl, beatGridEl]);
  }

  const makeMaster = () => {
    const master = audioCtx.createGain();
    master.gain.value = 0.2;
    master.connect(audioCtx.destination);
    return master;
  }

  const makeDrums = (output, midiNotes) =>
    midiNotes.map( midiNote =>
      require('./instruments')
        .makeSimpleOscillatorDrum(audioCtx, output, midiNote) );

  GO();
}
