const el = require('./el');


exports.attachTopControls =
(audioCtx, scheduler, master) => {
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


const makeValueControl = exports.makeValueControl =
label => {
  let valueEl;
  const r = el(`.control.value`, [
    el('label', [ label ]),
    valueEl = el('.value-text'),
  ]);
  r.setValue = v => valueEl.innerText = v;
  return r;
}

const makeRangeControl = exports.makeRangeControl =
(name, label, attrs, handleChange) => {
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
