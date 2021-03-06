const el = require('elel');


module.exports =
(selector='body') => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // TODO: by browser policy, must (I THINK!) be created in a click handler or all audio is muted (ok for now on desktop Chrome, but to change in next Chrome release)

  const GO = () => {
    const scheduler = require('./scheduler')(audioCtx);
    const master = makeMaster(audioCtx);
    const topEl = require('./controls').attachTopControls(audioCtx, scheduler, master);

    const noteGridEl = require('./noteGrid')(scheduler, audioCtx, master);

    const beatGridEl = require('./beatGrid')(scheduler, [
      ...makeSampleDrums(master, [
        'Bass-Drum-1.m4a',
        'Hip-Hop-Snare-1.m4a',
        'Bamboo.m4a',
      ]),
      ...makeMidiDrums(master, [ 69-12, 69-7, 69 ]),  // 69 == MIDI A4; 12 == octave note width
    ]);

    el.select(selector, [topEl, noteGridEl, beatGridEl]);
  }

  const makeMaster = () => {
    const master = audioCtx.createGain();
    master.gain.value = 0.2;
    master.connect(audioCtx.destination);
    return master;
  }

  const makeMidiDrums = (output, midiNotes) =>
    midiNotes.map( midiNote =>
      require('./instruments')
        .makeSimpleOscillatorDrum(audioCtx, output, midiNote) );

  const makeSampleDrums = (output, urls) =>
    urls.map( url =>
      require('./instruments')
        .makeUrlSampleDrum(audioCtx, output, url) );

  GO();
}
