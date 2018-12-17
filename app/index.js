const el = require('./el');


const RUN = (selector='body') => {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();  // TODO: by browser policy, must (I THINK!) be created in a click handler or all audio is muted (ok for now on desktop Chrome, but to change in next Chrome release)

  const scheduler = makeScheduler(audioCtx);
  const master = makeMaster(audioCtx);

  const topEl = attachTopControls(audioCtx, scheduler, master);

  const instruments = require('./instruments');
  const drums = [ 69-12, 69-7, 69 ]  // 69 == MIDI A4; 12 == octave note width;
    .map( midiNote => instruments.makeSimpleOscillatorDrum(audioCtx, master, midiNote) );
  const beatGridEl = attachBeatGrid(scheduler, drums);

  el.select(selector, [topEl, beatGridEl]);
}


const makeScheduler = audioCtx => {
  audioCtx.suspend();

  const scheduledNodeSet = new Set;
  const handlers = new Set;
  const tellHandlers = (type, ...args) =>
    [...handlers].map( handler => handler[type] && handler[type](...args) );

  let playing = false;
  let bps = 160/60;
  const lookaheadDuration = 1;

  // C.f., https://www.html5rocks.com/en/tutorials/audio/scheduling/
  /*let*/ lastScheduleCallTime = audioCtx.currentTime;
  const incrementLookaheadSchedule = () => {
    const now = audioCtx.currentTime;
    const playTime = now - sessionStartTime;
    const beatI = Math.floor(beatReal);

    if (lastBeatI !== beatI) {
      lastBeatI = beatI;
      tellHandlers("onBeat", beatI, playTime);
      console.log("beatI", beatI, playTime.toFixed(2));
    }

    let scheduleBeatI = lastScheduledBeatI;
    for (;;) {
      const beatPart = beatReal - beatI;
      const scheduleTime = (lastScheduledTime == null)
        ? playTime          + (beatPart && 1 - beatPart) / bps
        : lastScheduledTime +                          1 / bps;
      if (scheduleTime > playTime + lookaheadDuration)  break;
      lastScheduledTime = scheduleTime;
      lastScheduledBeatI = ++scheduleBeatI;

      tellHandlers("scheduleBeat", scheduleBeatI, sessionStartTime + scheduleTime)  // returns an array of arrays of AudioScheduledSourceNode|falsey
        .forEach(ax => ax && ax.forEach( x => {
          if (!x)  return;
          x.$startTime = sessionStartTime + scheduleTime;  // dirty?  for later cancellation
          scheduledNodeSet.add(x);
          x.onended = () =>   // on stop/end by _any_ means
            scheduledNodeSet.delete(x);
        }))
    }

    playing ? audioCtx.resume() : audioCtx.suspend();   // seems OK to call this every time

    beatReal += (now - lastScheduleCallTime) * bps;
    lastScheduleCallTime = now;
    // console.log("beatReal",beatReal);
  }

  const resetLookaheadSchedule = () => {
    // Stop only nodes that haven't started playing.
    console.log("** resetLookaheadSchedule", audioCtx.currentTime, scheduledNodeSet.size, beatReal)
    scheduledNodeSet.forEach( x => {
      let stopped;
      if (x.$startTime >= audioCtx.currentTime) {   // == if reset to start time while paused
        stopped = true;
        x.stop();  // resulting onended callback will remove from scheduledNodeSet
      }
      console.log(x.$startTime, stopped?"stop":"spare", +(x.$startTime - audioCtx.currentTime).toFixed(4), x);
    } );

    // next incrementLookaheadSchedule will rebuild the schedule starting at playTime/beatReal
    const beatI = Math.floor(beatReal);
    lastScheduledBeatI = beatI - ((beatI == beatReal) && 1);  // schedule _next_ beat, unless exactly at start of _this_ one
    lastScheduledTime = null;
  }

  const restart = () => {
    console.log("restart");
    scheduledNodeSet.forEach( x => {
      console.log("stop", x);
      x.stop();  // stop even already-playing notes
    } );

    // TODO: unglobal (but allow debugging somehow)
    sessionStartTime = audioCtx.currentTime;
    beatReal = 0;
    lastBeatI = -1;
    lastScheduledBeatI = -1;
    lastScheduledTime = null;

    audioCtx.suspend();  // but still perhaps playing==true: if so, will resume in incrementLookaheadSchedule; ensures we schedule first beat!
  }
  restart();

  const scheduleForever = () => {
    incrementLookaheadSchedule();
    window.requestAnimationFrame(scheduleForever)
  }
  window.requestAnimationFrame(scheduleForever)  // https://www.html5rocks.com/en/tutorials/audio/scheduling/


  // Interface
  return {
    register: handler => handlers.add(handler),
    get playing()  { return playing; },
    set playing(x) { playing = x; },
    get bpm()  { return bps*60; },
    set bpm(x) {
      bps = x/60;
      resetLookaheadSchedule();
    },
    restart,
    reset: resetLookaheadSchedule,
  }
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


const attachBeatGrid = (scheduler, drums) => {
  const RUN = () => {
    registerWithScheduler();
    return renderBeatGrid();
  }

  const beatCount = 8;

  const grid = drums.map( () =>
    [...Array(beatCount).keys()].map(() => false) );

  const buttonsPerBeat = [...Array(beatCount).keys()].map( () => [] );

  const renderBeatGrid = () =>
    el('.beat-grid', grid.map( drumBeats =>
      el('.beat-row', drumBeats.map( (v, beatI) => {
        const button = el('button', {
          click: () => {
            drumBeats[beatI] = !drumBeats[beatI];
            button.classList.toggle('on', drumBeats[beatI]);
            scheduler.reset();
          }
        });
        buttonsPerBeat[beatI].push(button);
        return button
      } ))
    ))

  const registerWithScheduler = () => {
    // TODO: unregister on destruction
    scheduler.register({

      scheduleBeat: (beatI, scheduleTime) => {
        return drums.map( (drum, drumI) => grid[drumI][beatI % beatCount]  &&  drum(scheduleTime) );
      },

      onBeat: beatI => {
        if (!(beatI%8))  console.log("-- beatI LOOP", beatI%8, beatI);

        buttonsPerBeat.forEach( buttons =>
          buttons.forEach( button =>
            button.classList.remove('current') ) );

        buttonsPerBeat[beatI % beatCount]
          .forEach( button =>
            button.classList.add('current') );
      },

    });
  }

  return RUN();
}


RUN();
