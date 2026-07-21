# Audio provenance

`car-tire-screech-{1,2,3}-real.mp3` and `car-tire-screech-real.mp3` are the
four unmodified MP3 takes in Dorian Clair’s **Screeching Tires** series from
[BigSoundBank](https://bigsoundbank.com/screeching-tires-1-s2368.html), released
under CC0. Each is a real outdoor recording of four car tires. Runtime chooses a
complete, naturally bounded recorded event from per-wheel braking pressure,
longitudinal/lateral adhesion loss, slip, speed, and breakaway severity. The four
level-matched events preserve their real attacks and decays; only a short
click-safe release is applied when the tire regains grip. A held brake cannot
continuously retrigger them. No recording is pitch-shifted, spectrally
reconstructed, or reduced to a repeating micro-loop.

`car-impact-light-real.mp3` is one isolated strike from **MTLimpt Metal Impact
Medium Bang Resonate x17** by harrisonlace from
[Freesound](https://freesound.org/people/harrisonlace/sounds/798843/), released
under CC0. The source is a Tascam DR-07x recording of an empty car body being
struck by hand. `car-impact-heavy-real.mp3` is the collision event from
**Car Crash_INT.wav** by PauliusI from
[Freesound](https://freesound.org/people/PauliusI/sounds/346300/), also released
under CC0. That source is an actual Peugeot 406 hitting an actual Ford KA,
recorded inside the Peugeot with a Sennheiser MKH50 and Sound Devices 788T. The
excerpts are timing trims of the published MP3 previews with no pitch shift,
filtering, layering, or generated reinforcement. Runtime impact intensity
chooses between them and controls gain only.

`car-horn-modern.wav` is an edited excerpt of **Car Horn Honk.wav** by DeVern,
downloaded from
[Freesound](https://freesound.org/people/DeVern/sounds/349922/) under the CC0
public-domain dedication. It is a contemporary stationary SUV horn captured
with a Sennheiser MKE 600.

The longest recorded press was isolated as mono PCM. Its sustain uses a pair of
points selected by comparing the full waveform following the loop start and end,
plus the final-to-first sample transition Web Audio actually repeats. Short taps
complete a 100 ms minimum physical attack before a filtered 70 ms decay, avoiding
an unrelated release waveform being spliced into the attack.

`car-engine-loop.wav` is an unused earlier experiment derived from **Car Engine
Contact Recording—Mini Cooper S 2019** by TheLittleCrow, downloaded from
[Freesound](https://freesound.org/people/TheLittleCrow/sounds/669618/) under the
CC0 public-domain dedication. The contact microphones captured the chassis and
engine block directly. A steady section was mixed to mono, loudness-normalized,
and given a 500 ms circular crossfade for continuous playback.

`engine-startup.wav`, `engine-natural-idle.wav`, `engine-shutdown.wav`, and all
six cruise mid/high RPM banks are matched derivatives of
**3008-start-idle-rev-shutoff.wav** by Mihacappy, downloaded from
[Freesound](https://freesound.org/people/Mihacappy/sounds/815853/) under the CC0
public-domain dedication. The source is a stereo recording of a 2022 Peugeot
3008 1.5L BlueHDi starting, idling, revving, and shutting off, recorded outside
the closed hood without enhancement. Every active engine bank is mono 48 kHz
PCM from that one recording. The twelve-and-a-half-second idle begins in the
source's settled middle region and uses a 900 ms equal-power wrap followed by an untouched
tail that closes on a low-curvature sample boundary. The cruise mid/high banks
are simple resampled versions of that exact loop, changing firing cadence
without a time-stretch filter or a second engine recording. This preserves one engine,
microphone perspective, room tone, and firing character across starter crank,
combustion catch, initial flare, steady idle, driving range, fuel cut, and final
mechanical rundown.

The source author's identified 1,500, 2,000, and 3,000 RPM free-rev events were
evaluated as a possible load program and rejected. Those windows contain rising
and falling RPM rather than true steady-state operation; looping them repeats a
rev-up/rev-down contour as audible flutter. They are not shipped. A future load
program must use genuinely steady RPM-and-torque captures. `npm run audio:audit`
checks every active asset for format, headroom, and boundary continuity.

Runtime equal-power curves perform lifecycle handoffs
through the same body, presence, output, compressor, and spatial path as the RPM
banks. Drive torque remains unavailable until combustion has caught. A
route handoff is treated as an already-running engine and never replays
ignition. Parking crossfades the live bank into the recorded shutdown; ordinary
component cleanup remains silent so navigation cannot create a false shutdown
elsewhere on the page.

Lifecycle gain staging is referenced to the matched idle rather than to each
file's peak. The startup recording's natural crank and combustion flare provide
the transient increase without a separate loudness jump, and the first half
second of shutdown is level-matched to idle before its recorded mechanical
decay. RPM-bank source gains compensate for the small RMS change introduced by
resampling; runtime speed, load, intake, and road layers are therefore
responsible for the increase while driving instead of inconsistent files.
The authored per-bank calibration is applied directly at playback. A shared
fast limiter follows the global make-up gain, preserving the intended level
while catching summed engine, horn, radio, and interaction peaks before the
browser output can hard-clip.

Source transitions are state-specific. Startup settles before a 380 ms
equal-power handoff to idle. The incoming idle enters at a level matched to the
quieter startup tail and settles to its steady reference over 220 ms.
Drivetrain torque becomes available when this acoustic handoff begins. The
banked renderer starts its idle source at the same boundary instead of running
at an unrelated phase in the background. Pressing Park begins
shutdown immediately while the car coasts to rest. The asset starts on the
recording's fuel-cut transient with no embedded idle lead and replaces the live
engine over a 30 ms click-safe handoff,
avoiding a long overlap between unrelated firing phases. RPM-bank blending is
confined to narrow crossover windows near idle departure and the upper power
band; each source otherwise plays alone. This prevents the beating and tonal
"morph" caused by blending idle and driving recordings across an entire RPM
range.

The renderer supports an ordered matrix of independently recorded load rows,
each containing the same RPM reference points. It uses equal-power interpolation
between unrelated load recordings and unity-linear interpolation between the
phase-related RPM bands inside each row. No load rows are currently configured
because a transient rev sweep is not a valid steady-load source. Smoothed engine
load therefore controls intake, combustion-band balance, and level without
switching recordings from raw key edges.

New production rows must identify the vehicle and transmission; document
exterior, intake, and exhaust microphone perspectives; provide synchronized
lossless stems at every steady RPM/load point; and cover the documented torque
and power peaks. The same manifest must include matched startup, shutdown,
throttle-tip-in, overrun fuel-cut, and shift torque-release captures. Anonymous
numbered field recordings and compressed website previews are not accepted
merely because their license permits reuse.

Unreviewed originals belong in the git-ignored `.engine-audio-source/`
quarantine, never in `public/`. Copy
`docs/engine-source-manifest.example.json` there as `manifest.json`, keep every
referenced WAV beside it, and run
`npm run audio:source:audit -- .engine-audio-source/manifest.json`. The source
gate rejects noncommercial licensing, lossy media, missing hashes, path escapes,
unverified RPM or torque/load claims, missing manufacturer/telemetry operating
calibration, mismatched RPM grids, reused capture windows, missing synchronized
perspectives, incomplete lifecycle recordings, and absent driving transients.
Passing that gate only makes a source eligible for derivative preparation; it does not
enable the source in the browser. Prepared mono 48 kHz PCM derivatives must
still pass `npm run audio:audit` and an explicit listening review before a style
may reference them.

The [2026 Procedural Engine Sounds
Dataset](https://huggingface.co/datasets/rdoerfler/procedural-engine-sounds) was
evaluated because it provides sample-aligned RPM and torque channels, but the
project policy excludes its CC BY-NC 4.0 license from this public employment
portfolio. The openly downloadable CC0 performance-car collection was also
evaluated and rejected because its numbered files do not identify a vehicle,
RPM, load, or consistent microphone perspective. Compressed preview mirrors are
not substitutes for an unavailable original recording.

The experimental cycle renderer delays entry of a shorter higher-RPM grain bank
until its events overlap continuously at the current firing cadence. Its
overlap normalizer also leaves sparse grain edges attenuated instead of boosting
each edge back to full scale. It remains available behind the single
`ENGINE_RENDERER_MODE` development switch, but production deliberately uses the
continuous banked renderer because the reconstructed grains remain perceptible
during rev sweeps.

The active `engine-city-{mid,high}.wav` files form the shared Peugeot cruise
fallback for every current car, resampled from the same idle loop at the exact
ratio between idle RPM and each bank's reference RPM. Runtime playback then
uses the inverse reference ratio, so both sides of a crossover have the same
effective firing cadence instead of dropping pitch at the handoff. Each asset
retains a sample-safe boundary and receives no spectral time stretching. The
older rally/taxi derivatives, per-variant idle derivatives, and Mini Cooper loop
remain in the directory for comparison but are no longer used. Because the bank signals are correlated,
runtime uses unity-gain linear blends rather than equal-power blends that would
add roughly 3 dB at the midpoint. Changing vehicle styles keeps the running bank
at its existing phase when the acoustic `sourceId` is unchanged; only gearing,
coupling, mass, and road behavior change.

Production driving audio uses the complete matched RPM bank continuously. The
optional `AudioWorklet` reconstructs combustion-event-centered grains from the
same capture for renderer development; when explicitly enabled, it reports
readiness before a short crossfade and the complete banked renderer remains
audible if initialization fails. No main-thread grain scheduler is used.

The active assets retain the source's 48 kHz bandwidth. Runtime keeps an
unfiltered dry combustion path beside the low-, mid-, intake-, and overrun-color
paths, then applies only a broad 8.2–10 kHz output rolloff and light compression.
The global body and presence filters remain stationary while driving. Smoothed
load changes parallel intake/combustion levels instead of sweeping filters over
the complete signal.
This prevents the lifecycle recordings from sounding substantially louder or
clearer than the filtered driving bank. The longer cruise loop leaves more than
two seconds before recurrence even in the highest-RPM derivative.

Idle and lifecycle playback run 5.2 dB below the driving-bank reference. The
driving program has its own gain stage, while startup, idle, driving, and
shutdown all use the same stationary dry/low/mid/high tone path. Consequently
the level reached while driving cannot make the next lifecycle recording jump
in loudness, and returning to idle cannot change acoustic resonance. Shutdown
plays through its complete mechanical rundown; only its final 90 ms taper to
zero so the source file cannot end on a non-zero sample. Load still produces the
expected increase while a parked car no longer dominates the page's mix.

A virtual crankshaft now integrates firing torque, RPM-dependent pumping loss,
idle control, clutch reaction torque, and engine-specific rotational inertia.
It no longer follows a target RPM through a generic spring response. A
progressively engaging launch clutch exposes actual clutch slip and transmits
the same continuously varying torque factor to vehicle motion. Shifts release
the clutch in the old ratio, interrupt combustion torque,
select the new ratio at the released midpoint, and re-engage afterward; shift
dwell, kickdown demand, steering load, and cooldown still prevent gear hunting.
Manual profiles nearly fully release their friction clutch during that interval.
The automatic profile instead maintains hydrodynamic coupling, progressively
locks its converter at cruise, releases lockup under high load, and only softens
coupling during a ratio change.
Service braking holds the selected gear instead of chaining downshifts, then
releases the clutch near a stop instead of pulling the engine below idle.

The shared torque curve is anchored to Stellantis' published 1.5L BlueHDi 130
family specification: 300 Nm at 1,750 rpm and 96 kW at 3,750 rpm. The latter
corresponds to roughly 244 Nm, or 81.5% of peak torque, and fixes the descending
side of the modeled diesel curve. This is explicitly tagged as an engine-family
reference because the field recording does not identify its exact transmission
or VIN; vehicle mass and gearing remain toy-car behavior rather than claimed
Peugeot simulation. See the [manufacturer technical specification](https://www.media.stellantis.com/uploads/uk/model-pricelist/peugeot5008pricespecapr23-6455a67a8aa20.pdf).

Closed-throttle movement has an engine-overrun state independent from the
service brake, so braking does not incorrectly erase the coupled engine drag.
Propulsive demand is smoothed as an engine/manifold state before reaching the
audio graph; the graph applies only short click-safe interpolation instead of a
second sluggish behavioral model. Ignition and shutdown use
their complete recorded events. A held accelerator gains authority gradually
after the recorded combustion catch instead of being discarded until the idle
handoff has completely ended. Throttle and shift changes remain continuous
changes to RPM, load, intake, and drivetrain torque; the engine no longer cuts
arbitrary loop fragments into synthetic one-shots. A future style may attach a
dedicated event recording, but the controller will never fabricate one from an
unrelated offset.

The audible car mix uses recorded material exclusively: the matched engine
banks and lifecycle captures, the horn recording, the tire recording, and the
two physical-impact recordings. Procedural road, tire, gear-mesh, and clutch
noise beds are intentionally absent. Runtime processing is limited to routing,
short click-safe gain envelopes, looping inside stable recorded regions,
stationary tone calibration, compression, and spatial placement.
Very restrained irregular low-frequency modulation alters playback detune at
idle; it is a control signal rather than an audible generated layer, and it
fades once the car is moving. The shared spatial bus also removes high
frequencies as the car moves beyond the viewport, matching distance attenuation.
The recorded combustion body keeps only a sub-decibel, yaw-aware front/rear
bias. The independent intake band originates slightly ahead of the car, while
the overrun/exhaust band originates slightly behind it. The full mono engine is
never duplicated, avoiding comb filtering between two HRTF paths. The recorded
tire, impact, and horn effects remain omnidirectional so turning the miniature
car cannot cause an unnatural level swing.

Startup and shutdown URLs, measured source-time handoff points, torque-release
point, and shutdown crossfade now belong to each engine style. The three current
styles intentionally reference the same matched lifecycle recording until a
replacement source clears the source gate. The global limiter exposes its live
gain reduction through `getSecretAudioDiagnostics()` so future level calibration
can verify that ordinary driving is not being shaped by emergency peak control.
Every style also declares a stable acoustic `sourceId`; tests require styles
sharing that identity to share combustion configuration, RPM model, torque
curve, bank recordings, lifecycle recordings, tone, and dynamics. A new engine
identity therefore cannot silently combine unrelated captures or pretend that
one recording represents several engines.

Runtime graph automation is admitted on every 60 Hz animation frame and capped
near 90 Hz on high-refresh displays. Live diagnostics expose peak, RMS, spectral
centroid, and limiter reduction, while the asset audit verifies that the
startup-to-idle and idle-to-shutdown entry windows remain level-compatible.

Engine behavior is defined in `lib/carEngineStyles.ts`, independently from the
Web Audio graph. Cars with the current Peugeot `sourceId` share one honest
acoustic and combustion definition while retaining their own gear ratios,
shift timing, coupling, forward/reverse road-speed mapping, mass, tires, and
road response. The current city, rally, and taxi styles use five-, six-, and
four-speed transmissions respectively. A genuinely different engine must add
a new source identity and matched recordings rather than only changing DSP
parameters.

`car-horn-full.mp3` is an unused CC0 historical effects-library source retained
for comparison.

`car-horn.wav` is an earlier excerpt of **Recent Car Horn #7** by
Joseph SARDIN from
[BigSoundBank](https://bigsoundbank.com/recent-car-horn-7-s0969.html), released
under the site's CC0/public-domain-equivalent license.

`car-horn-sustained.mp3` is an unused processing experiment derived from the
CC0 recording **car horn.wav** by keweldog on
[Freesound](https://freesound.org/people/keweldog/sounds/182474/).
