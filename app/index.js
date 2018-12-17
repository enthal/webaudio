const el = require('./el');


const RUN = (selector='body') => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // TODO: by browser policy, must (I THINK!) be created in a click handler or all audio is muted (ok for now on desktop Chrome, but to change in next Chrome release)

  const scheduler = require('./scheduler')(audioCtx);
  const master = makeMaster(audioCtx);

  const topEl = attachTopControls(audioCtx, scheduler, master);

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


const attachTopControls = (audioCtx, scheduler, master) => {
  const controls = {};
  const playPause = () => {
    scheduler.playing = !scheduler.playing;
    topEl.classList.toggle('playing',scheduler.playing);
    console.log("playing",scheduler.playing);
  };

  const topEl = el('.top-controls', [
    el('.row', [
      controls.playPauseButton   = el('.control.button.play-pause-button', { click:playPause } ),
      controls.restartButton     = el('.control.button.restart-button',    { click:scheduler.restart } ),
      controls.beatView          = makeValueControl("Beat"),
      controls.timeView          = makeValueControl("Time"),
    ]),
    el('.row', [
      makeRangeControl( 'bpm', "BPM",
        { min:10, max:240, value:120, step:1 },
        v => scheduler.bpm = v ),
      makeRangeControl( 'gain', "Gain",
        { min:0.0, max:1.0, value:0.2, step:0.05 },
        v => {
          master.gain.linearRampToValueAtTime(v, audioCtx.currentTime + 0.01);
          return v.toFixed(2);
        } ),
    ]),
  ]);

  scheduler.register({ onBeat: (beatI, playTime) => {
    controls.beatView.setValue(beatI);
    controls.timeView.setValue(playTime.toFixed(1));
  } });

  return topEl;
}


const makeValueControl = label => {
  let valueEl;
  const r = el(`.control.value`, [
    el('label', [ label ]),
    valueEl = el('.value-text'),
  ]);
  r.setValue = v => valueEl.innerText = v;
  return r;
}

const makeRangeControl = (name, label, attrs, handleChange) => {
  let inputEl, valueEl;
  const r = el(`.control.range-control`, [
    el('', [
      el('label', { for:name }, [ label ]),
      valueEl = el('span.value'),
    ]),
    inputEl = el('input', { type:'range', name, ...attrs })
  ])
  // console.log("inputEl.value",inputEl.value);

  const onRealChange = () => {
    makeChange(+inputEl.value);  // Chrome/webkit bug?: inputEl.value integer before attached to DOM, wtf
  }
  const makeChange = v => {
    console.log('range control change:', name, v);
    valueEl.innerText = handleChange(v);
  }
  makeChange(attrs.value);
  inputEl.addEventListener('input', onRealChange);

  return r;
}


RUN();
