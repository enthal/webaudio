const makeScheduler = module.exports =
audioCtx => {
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
