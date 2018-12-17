const el = require('./el');


const RUN = (selector='body') => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // TODO: by browser policy, must (I THINK!) be created in a click handler or all audio is muted (ok for now on desktop Chrome, but to change in next Chrome release)

  const scheduler = require('./scheduler')(audioCtx);
  const master = makeMaster(audioCtx);

  const topEl = require('./controls').attachTopControls(audioCtx, scheduler, master);

  const instruments = require('./instruments');
  const drums = [ 69-12, 69-7, 69 ]  // 69 == MIDI A4; 12 == octave note width;
    .map( midiNote => instruments.makeSimpleOscillatorDrum(audioCtx, master, midiNote) );

  const beatGridEl = require('./beatGrid')(scheduler, drums);

  el.select(selector, [topEl, beatGridEl]);
}

const makeMaster = audioCtx => {
  const master = audioCtx.createGain();
  master.gain.value = 0.2;
  master.connect(audioCtx.destination);
  return master;
}


RUN();
