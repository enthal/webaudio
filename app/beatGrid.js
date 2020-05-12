const el = require('./el');


const attachBeatGrid = module.exports =
(scheduler, drums) => {
  const RUN = () => {
    registerWithScheduler();
    return renderEls();
  }

  const beatCount = 8;

  const grid = drums.map( () =>
    [...Array(beatCount).keys()].map(() => false) );

  const buttonsPerBeat = [...Array(beatCount).keys()].map( () => [] );

  const renderEls = () =>
    el('table.beat-grid', grid.map( (drumBeats, i) =>
      el('tr.beat-row', [
        el('td.control-base.label', [
          (drums[i].$meta||{}).name||"Drum ?"
        ]),
        ...drumBeats.map( (v, beatI) => {
          const button = el('button', {
            click: () => {
              drumBeats[beatI] = !drumBeats[beatI];
              button.classList.toggle('on', drumBeats[beatI]);
              scheduler.reset();
            }
          });
          buttonsPerBeat[beatI].push(button);
          return el('td',[button]);
        } )
      ])
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
