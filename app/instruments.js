exports.makeSimpleOscillatorDrum = (audioCtx, output, midiNote) => {
  return startTime => {
    const duration = 1.0;
    const oscillator = audioCtx.createOscillator();
    // oscillator.type = 'triangle';
    oscillator.frequency.value = freqForMidiNoteNumber(midiNote);
    oscillator.start(startTime + 0.0);
    oscillator.stop (startTime + duration*2);

    const envelope = audioCtx.createGain();  // TODO: do these leak?  Unreachable after oscillator stops, though not disconnected.  When I tried to disconnect them thereafter, things gliched and swerved.  Why?
    envelope.gain.linearRampToValueAtTime      (0.0001, 0.000001);                   // initial
    envelope.gain.exponentialRampToValueAtTime (1.0, startTime + duration * 0.015);  // Attack
    envelope.gain.exponentialRampToValueAtTime (0.3, startTime + duration * 0.4);    // Decay
    envelope.gain.setValueAtTime               (0.3, startTime + duration * 0.8);    // Sustain
    envelope.gain.linearRampToValueAtTime      (0.0001, startTime + duration * 2.0); // Release

    oscillator.connect(envelope);
    envelope.connect(output);

    // console.log("schedule start", startTime, midiNote, audioCtx.currentTime, );
    return oscillator;  // an AudioScheduledSourceNode, for lookahead management by scheduler
  }
}

const freqForMidiNoteNumber = n => Math.pow(2, (n-69)/12) * 440
