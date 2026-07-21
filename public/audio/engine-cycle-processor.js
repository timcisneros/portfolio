class EngineCycleProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "rpm",
        defaultValue: 850,
        minValue: 500,
        maxValue: 8000,
        automationRate: "k-rate",
      },
      {
        name: "load",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "overrun",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "shift",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "rpmAcceleration",
        defaultValue: 0,
        minValue: -1,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "limiter",
        defaultValue: 0,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }

  constructor(options) {
    super();
    const configuration = options.processorOptions ?? {};
    this.setCombustionConfiguration(configuration);
    this.sources = [];
    this.grains = [];
    this.outputFrame = 0;
    this.combustionPhase = 1;
    this.resetFrame = null;
    this.resetEventOffset = 0;
    this.randomState = 0x6d2b79f5;
    this.idleIrregularity = 0;
    this.idleWander = 0;
    this.idleWanderTarget = 0;
    this.exhaustPressure = 0;
    this.firingSequence = 0;
    this.overrunAccumulator = 0;
    this.setSources(configuration.sources ?? [configuration], false);
    this.port.onmessage = (event) => {
      if (event.data?.type === "reset") {
        this.resetFrame = this.outputFrame + Math.max(
          0,
          event.data.delayFrames || 0,
        );
        this.resetEventOffset = Math.round(event.data.eventOffset || 0);
      } else if (event.data?.type === "sources") {
        this.setSources(event.data.sources ?? [], true);
      } else if (event.data?.type === "configuration") {
        this.setCombustionConfiguration(event.data);
      }
    };
    this.port.postMessage({ type: "ready" });
  }

  setCombustionConfiguration(configuration) {
    this.eventsPerRevolution = configuration.eventsPerRevolution || 2;
    this.cylinderCount = Math.max(1, Math.round(configuration.cylinderCount || 4));
    const configuredOrder = Array.isArray(configuration.firingOrder)
      ? configuration.firingOrder
      : [];
    this.firingOrder = configuredOrder.length === this.cylinderCount
      ? Int16Array.from(configuredOrder, (index) => (
          Math.max(0, Math.min(this.cylinderCount - 1, Math.round(index)))
        ))
      : Int16Array.from({ length: this.cylinderCount }, (_, index) => index);
    const configuredGains = Array.isArray(configuration.cylinderGains)
      ? configuration.cylinderGains
      : [];
    this.cylinderGains = Float32Array.from(
      { length: this.cylinderCount },
      (_, index) => Math.max(0.9, Math.min(1.1, configuredGains[index] ?? 1)),
    );
    const configuredTiming = Array.isArray(configuration.cylinderTimingMs)
      ? configuration.cylinderTimingMs
      : [];
    const minimumTiming = Math.min(0, ...configuredTiming);
    this.cylinderTimingFrames = Int16Array.from(
      { length: this.cylinderCount },
      (_, index) => Math.max(
        0,
        Math.round(((configuredTiming[index] ?? 0) - minimumTiming) * sampleRate / 1000),
      ),
    );
    this.overrunCutStrength = Math.max(
      0,
      Math.min(0.75, configuration.overrunCutStrength ?? 0.46),
    );
    this.firingSequence = 0;
    this.overrunAccumulator = 0;
  }

  createUniformEvents(sampleCount, sourceSampleRate, referenceRpm) {
    const period = sourceSampleRate * 60
      / (referenceRpm * this.eventsPerRevolution);
    const eventCount = Math.max(1, Math.floor(sampleCount / period));
    const events = new Float32Array(eventCount);
    for (let index = 0; index < eventCount; index += 1) {
      events[index] = (index + 1) * period;
    }
    return events;
  }

  setSources(rawSources, preservePosition) {
    const previousSources = this.sources;
    const configured = rawSources
      .map((rawSource) => {
        const samples = rawSource.samples instanceof Float32Array
          ? rawSource.samples
          : new Float32Array(rawSource.samples ?? []);
        const sourceSampleRate = rawSource.sourceSampleRate || sampleRate;
        const referenceRpm = rawSource.referenceRpm || 850;
        const suppliedEvents = rawSource.events instanceof Float32Array
          ? rawSource.events
          : new Float32Array(rawSource.events ?? []);
        const candidateEvents = suppliedEvents.length > 1
          ? suppliedEvents
          : this.createUniformEvents(
              samples.length,
              sourceSampleRate,
              referenceRpm,
            );
        const expectedPeriod = sourceSampleRate * 60
          / (referenceRpm * this.eventsPerRevolution);
        // A grain that wraps across the original recording boundary exposes
        // that file's loop seam in the middle of an otherwise continuous idle.
        // Keep the combustion clock continuous, but draw its grains only from
        // events with enough recorded material on both sides.
        const eventMargin = expectedPeriod * 1.5;
        const safeEventValues = Array.from(candidateEvents).filter((position) =>
          position >= eventMargin
          && position <= samples.length - 1 - eventMargin
        );
        const events = safeEventValues.length > 0
          ? Float32Array.from(safeEventValues)
          : Float32Array.of(Math.max(0, (samples.length - 1) / 2));
        const requestedStartIndex = Math.max(
          0,
          Math.min(candidateEvents.length - 1, rawSource.startEventIndex || 0),
        );
        const requestedStartPosition = candidateEvents[requestedStartIndex]
          ?? events[0];
        const startEventIndex = Math.max(
          0,
          events.reduce((nearestIndex, position, index) =>
            Math.abs(position - requestedStartPosition)
              < Math.abs(events[nearestIndex] - requestedStartPosition)
              ? index
              : nearestIndex
          , 0),
        );
        const previous = preservePosition
          ? previousSources.reduce((nearest, candidate) => (
              Math.abs(candidate.referenceRpm - referenceRpm)
                < Math.abs((nearest?.referenceRpm ?? Number.POSITIVE_INFINITY) - referenceRpm)
                ? candidate
                : nearest
            ), null)
          : null;
        const progress = previous && previous.events.length > 0
          ? previous.eventIndex / previous.events.length
          : 0;
        return {
          eventIndex: previous
            ? Math.floor(progress * events.length) % events.length
            : startEventIndex,
          events,
          gain: Math.max(0.0001, rawSource.gain || 1),
          referenceRpm,
          samples,
          sourceSampleRate,
          startEventIndex,
        };
      })
      .filter((source) => source.samples.length > 0 && source.events.length > 0)
      .sort((left, right) => left.referenceRpm - right.referenceRpm);
    if (configured.length > 0) this.sources = configured;
  }

  resetTimeline(frame) {
    for (const source of this.sources) {
      source.eventIndex = (
        source.startEventIndex
        + this.resetEventOffset % source.events.length
        + source.events.length
      ) % source.events.length;
    }
    this.grains = [];
    this.combustionPhase = 1;
    this.firingSequence = Math.max(0, this.resetEventOffset);
    this.overrunAccumulator = 0;
    this.resetFrame = null;
    this.resetEventOffset = 0;
  }

  nextRandom() {
    let value = this.randomState;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.randomState = value >>> 0;
    return this.randomState / 0xffffffff * 2 - 1;
  }

  interpolatedSample(source, position) {
    const length = source.samples.length;
    if (length === 0) return 0;
    const bounded = Math.max(0, Math.min(length - 1, position));
    const lower = Math.floor(bounded);
    const upper = Math.min(length - 1, lower + 1);
    const blend = bounded - lower;
    return source.samples[lower] * (1 - blend) + source.samples[upper] * blend;
  }

  localEventPeriod(source, eventIndex) {
    const events = source.events;
    const center = events[eventIndex];
    const previous = eventIndex > 0
      ? events[eventIndex - 1]
      : events[events.length - 1] - source.samples.length;
    const next = eventIndex < events.length - 1
      ? events[eventIndex + 1]
      : events[0] + source.samples.length;
    const measured = (next - previous) / 2;
    const expected = source.sourceSampleRate * 60
      / (source.referenceRpm * this.eventsPerRevolution);
    return Number.isFinite(measured) && measured > expected * 0.45
      ? Math.min(expected * 1.65, measured)
      : expected;
  }

  scheduleSourceEvent(source, frame, mixGain, eventGain, envelopeSkew) {
    const eventIndex = source.eventIndex;
    const sourceCenter = source.events[eventIndex];
    const sourcePeriod = this.localEventPeriod(source, eventIndex);
    const availableLength = Math.max(
      64,
      Math.floor(
        Math.min(sourceCenter, source.samples.length - 1 - sourceCenter) * 2,
      ),
    );
    const grainLength = Math.min(
      availableLength,
      Math.max(64, Math.round(sourcePeriod * 2.05)),
    );
    const outputLength = Math.max(
      64,
      Math.round(grainLength * sampleRate / source.sourceSampleRate),
    );
    this.grains.push({
      age: 0,
      envelopeSkew,
      eventGain,
      mixGain,
      outputLength,
      source,
      sourceStart: sourceCenter - grainLength / 2,
      startFrame: frame,
    });
    source.eventIndex = (eventIndex + 1) % source.events.length;
  }

  scheduleEvent(
    frame,
    rpm,
    load,
    overrun,
    shift,
    limiter,
    rpmAcceleration,
    idleFactor,
  ) {
    if (this.sources.length === 0) return;
    const orderIndex = this.firingSequence % this.firingOrder.length;
    const cylinderIndex = this.firingOrder[orderIndex];
    if (orderIndex === 0) {
      this.idleIrregularity += (this.nextRandom() - this.idleIrregularity) * 0.13;
      this.idleWanderTarget = this.nextRandom();
    }
    this.firingSequence += 1;
    const idleReference = this.sources[0]?.referenceRpm ?? 850;
    const overrunSpeed = Math.max(
      0,
      Math.min(1, (rpm - idleReference * 1.08) / Math.max(1, idleReference * 1.35)),
    );
    this.overrunAccumulator += overrun * overrunSpeed * this.overrunCutStrength;
    const overrunCut = this.overrunAccumulator >= 1;
    if (overrunCut) this.overrunAccumulator -= 1;
    else if (overrun < 0.04) this.overrunAccumulator *= 0.86;
    const combustionPresence = limiter > 0.5
      ? 0.06
      : overrunCut
        ? 0.34
        : 1;
    const eventGain = Math.max(
      0.04,
      (0.94 + load * 0.1)
        * (1 - overrun * 0.08)
        * (1 - shift * 0.58)
        * (1 + Math.max(0, rpmAcceleration) * load * 0.035)
        * (1 + this.idleIrregularity * idleFactor * 0.035)
        * this.cylinderGains[cylinderIndex]
        * combustionPresence,
    );
    const envelopeSkew = Math.max(
      -0.18,
      Math.min(0.3, load * 0.28 - overrun * 0.16 + rpmAcceleration * 0.055),
    );
    const scheduledFrame = frame + this.cylinderTimingFrames[cylinderIndex];
    if (rpm <= this.sources[0].referenceRpm || this.sources.length === 1) {
      this.scheduleSourceEvent(
        this.sources[0],
        scheduledFrame,
        1,
        eventGain,
        envelopeSkew,
      );
      return;
    }
    const last = this.sources[this.sources.length - 1];
    if (rpm >= last.referenceRpm) {
      this.scheduleSourceEvent(last, scheduledFrame, 1, eventGain, envelopeSkew);
      return;
    }
    for (let index = 1; index < this.sources.length; index += 1) {
      const upper = this.sources[index];
      const lower = this.sources[index - 1];
      const span = upper.referenceRpm - lower.referenceRpm;
      // The first higher-RPM source contains much shorter combustion grains.
      // Introducing it across the full RPM span makes those grains isolated at
      // low target cadence, which sounds like discrete particles while the car
      // accelerates. Wait until its grains can overlap continuously, then use a
      // compact equal-power handoff. Upper driving bands already satisfy that
      // overlap condition and can use their narrower spectral crossover.
      const blendStart = index === 1
        ? Math.max(
            lower.referenceRpm + span * 0.27,
            upper.referenceRpm / 2.05,
          )
        : lower.referenceRpm + span * 0.35;
      const blendEnd = index === 1
        ? lower.referenceRpm + span * 0.5
        : lower.referenceRpm + span * 0.72;
      if (rpm < blendStart) {
        this.scheduleSourceEvent(
          lower,
          scheduledFrame,
          1,
          eventGain,
          envelopeSkew,
        );
        return;
      }
      if (rpm > blendEnd) continue;
      const blend = (rpm - blendStart) / Math.max(1, blendEnd - blendStart);
      this.scheduleSourceEvent(
        lower,
        scheduledFrame,
        Math.cos((blend * Math.PI) / 2),
        eventGain,
        envelopeSkew,
      );
      this.scheduleSourceEvent(
        upper,
        scheduledFrame,
        Math.sin((blend * Math.PI) / 2),
        eventGain,
        envelopeSkew,
      );
      return;
    }
    this.scheduleSourceEvent(last, scheduledFrame, 1, eventGain, envelopeSkew);
  }

  parameterValue(values, frame, fallback) {
    if (!values || values.length === 0) return fallback;
    return values.length > 1 ? values[frame] : values[0];
  }

  process(_inputs, outputs, parameters) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    const rpmValues = parameters.rpm;
    const loadValues = parameters.load;
    const overrunValues = parameters.overrun;
    const shiftValues = parameters.shift;
    const rpmAccelerationValues = parameters.rpmAcceleration;
    const limiterValues = parameters.limiter;
    for (let frame = 0; frame < output.length; frame += 1) {
      const absoluteFrame = this.outputFrame + frame;
      if (this.resetFrame !== null && absoluteFrame >= this.resetFrame) {
        this.resetTimeline(absoluteFrame);
      }
      const rpm = Math.max(
        500,
        rpmValues.length > 1 ? rpmValues[frame] : rpmValues[0],
      );
      const load = Math.max(0, Math.min(1, this.parameterValue(loadValues, frame, 0)));
      const overrun = Math.max(
        0,
        Math.min(1, this.parameterValue(overrunValues, frame, 0)),
      );
      const shift = Math.max(0, Math.min(1, this.parameterValue(shiftValues, frame, 0)));
      const rpmAcceleration = Math.max(
        -1,
        Math.min(1, this.parameterValue(rpmAccelerationValues, frame, 0)),
      );
      const limiter = Math.max(
        0,
        Math.min(1, this.parameterValue(limiterValues, frame, 0)),
      );
      const exhaustResponse = overrun > this.exhaustPressure ? 0.045 : 0.21;
      this.exhaustPressure += (overrun - this.exhaustPressure)
        * (1 - Math.exp(-1 / (sampleRate * exhaustResponse)));
      const idleReference = this.sources[0]?.referenceRpm ?? 850;
      const idleSpeedFactor = Math.max(
        0,
        Math.min(1, 1 - (rpm - idleReference) / Math.max(1, idleReference * 0.42)),
      );
      const idleFactor = idleSpeedFactor * (1 - load) * (1 - this.exhaustPressure);
      this.idleWander += (this.idleWanderTarget - this.idleWander)
        * (1 - Math.exp(-1 / (sampleRate * 0.65)));
      const effectiveRpm = rpm * (1 + this.idleWander * idleFactor * 0.003);
      this.combustionPhase += effectiveRpm * this.eventsPerRevolution
        / (60 * sampleRate);
      while (this.combustionPhase >= 1) {
        this.combustionPhase -= 1;
        this.scheduleEvent(
          absoluteFrame,
          rpm,
          load,
          this.exhaustPressure,
          shift,
          limiter,
          rpmAcceleration,
          idleFactor,
        );
      }

      let mixed = 0;
      let windowSum = 0;
      for (const grain of this.grains) {
        if (absoluteFrame < grain.startFrame) continue;
        const age = absoluteFrame - grain.startFrame;
        grain.age = age;
        if (age >= grain.outputLength || grain.mixGain <= 0.0001) continue;
        const phase = age / Math.max(1, grain.outputLength - 1);
        const baseWindow = Math.sin(Math.PI * phase) ** 2;
        const envelopeShape = Math.max(
          0.62,
          1 + grain.envelopeSkew * (1 - phase * 2),
        );
        const window = baseWindow * grain.mixGain;
        const sourcePosition = grain.sourceStart
          + age * grain.source.sourceSampleRate / sampleRate;
        mixed += this.interpolatedSample(grain.source, sourcePosition)
          * window
          * grain.source.gain
          * grain.eventGain
          * envelopeShape;
        // Squared equal-power weights sum to one, so this normalizes temporal
        // grain overlap without undoing the RPM-source loudness compensation.
        windowSum += baseWindow * grain.mixGain * grain.mixGain;
      }
      // Normalize established overlap, but never divide a sparse grain edge
      // back up to full scale. Preserving that edge taper prevents a newly
      // introduced RPM source from announcing each grain as a separate event.
      output[frame] = windowSum > 0.0001
        ? mixed / Math.max(0.72, windowSum)
        : 0;
    }
    this.grains = this.grains.filter((grain) => grain.age < grain.outputLength);
    this.outputFrame += output.length;
    return true;
  }
}

registerProcessor("engine-cycle-processor", EngineCycleProcessor);
