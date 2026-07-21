import { describe, expect, it } from "vitest";
import {
  CAR_ENGINE_STYLES,
  getCarEngineBandWeights,
  getCarEngineLoadWeights,
  getCarEngineMixTargets,
  getCarEngineRoadSpeedKph,
  getCarEngineTargetRpm,
  getCarMaximumPageSpeed,
  getCarPageSpeedRatio,
  getCarTorqueMultiplier,
} from "../../lib/carEngineStyles";

describe("car engine styles", () => {
  it("authors distinct yaw and understeer envelopes for each chassis", () => {
    const city = CAR_ENGINE_STYLES.city.physics;
    const rally = CAR_ENGINE_STYLES.rally.physics;
    const taxi = CAR_ENGINE_STYLES.taxi.physics;

    expect(rally.maximumYawRate).toBeGreaterThan(city.maximumYawRate);
    expect(city.maximumYawRate).toBeGreaterThan(taxi.maximumYawRate);
  });

  it("supports gearboxes with different gear counts", () => {
    expect(CAR_ENGINE_STYLES.city.transmission.gears).toHaveLength(5);
    expect(CAR_ENGINE_STYLES.rally.transmission.gears).toHaveLength(6);
    expect(CAR_ENGINE_STYLES.taxi.transmission.gears).toHaveLength(4);
  });

  it("gives each car a distinct mechanical powertrain without inventing audio provenance", () => {
    const styles = Object.values(CAR_ENGINE_STYLES);
    const mechanicalSignatures = styles.map((style) => [
      style.transmission.coupling.kind,
      style.transmission.gears.length,
      style.physics.driveBiasFront,
      style.physics.finalDriveRatio,
      style.physics.massKg,
      style.controls.pedals.throttleRiseRate,
    ].join(":"));

    expect(new Set(mechanicalSignatures).size).toBe(styles.length);
    expect(CAR_ENGINE_STYLES.rally.physics.driveBiasFront).toBeGreaterThan(0);
    expect(CAR_ENGINE_STYLES.rally.physics.driveBiasFront).toBeLessThan(1);
    expect(CAR_ENGINE_STYLES.city.transmission.coupling.kind).toBe("manual");
    expect(CAR_ENGINE_STYLES.rally.transmission.coupling.kind).toBe("manual");
    expect(CAR_ENGINE_STYLES.taxi.transmission.coupling.kind)
      .toBe("torque-converter");
    expect(new Set(styles.map(
      (style) => style.controls.pedals.torqueDemandExponent,
    )).size).toBe(styles.length);
    expect(new Set(styles.map(
      (style) => style.physics.drivelineResponseFrequency,
    )).size).toBe(styles.length);
    expect(new Set(styles.map(
      (style) => style.physics.drivelineBacklashRadians,
    )).size).toBe(styles.length);
    expect(styles.every(
      (style) => !("yawAssistRoadSpeedGain" in style.controls.steering)
        && !("yawAssistLowSpeedGain" in style.controls.steering),
    )).toBe(true);
    // The available recordings document one engine family. Vehicle behavior
    // may differ through gearing, mass, driven axles, and coupling, but the
    // site must not claim three acoustic engines it does not actually have.
    expect(new Set(styles.map((style) => style.samples.sourceId)).size).toBe(1);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label has ordered, bounded transmission data",
    (style) => {
      const gears = style.transmission.gears;
      const combustion = style.combustion;
      expect(combustion.cylinderCount).toBeGreaterThanOrEqual(3);
      expect(combustion.eventsPerRevolution).toBeGreaterThan(0);
      expect(combustion.firingOrder).toHaveLength(combustion.cylinderCount);
      expect(new Set(combustion.firingOrder).size).toBe(combustion.cylinderCount);
      expect(combustion.cylinderGains).toHaveLength(combustion.cylinderCount);
      expect(combustion.cylinderTimingMs).toHaveLength(combustion.cylinderCount);
      expect(combustion.limiterResumeRpm).toBeLessThan(combustion.limiterStartRpm);
      expect(combustion.limiterStartRpm).toBeLessThanOrEqual(style.rpm.maximum);
      expect(combustion.crankInertia).toBeGreaterThan(0.5);
      expect(combustion.overrunCutStrength).toBeGreaterThan(0);
      expect(combustion.overrunCutStrength).toBeLessThan(0.8);
      expect(style.calibration.evidenceUrl).toMatch(/^https:\/\//);
      expect(style.calibration.maximumTorqueRpm).toBeLessThan(
        style.calibration.maximumPowerRpm,
      );
      expect(style.calibration.maximumPowerRpm).toBeLessThan(style.rpm.maximum);
      expect(style.calibration.maximumPowerKw).toBe(96);
      expect(style.calibration.maximumTorqueNm).toBe(300);
      expect(style.samples.sourceId).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)+$/);
      expect(style.samples.rpmBands).toHaveLength(3);
      expect(style.samples.lifecycle.startup.url).toMatch(/^\/audio\/.+\.wav$/);
      expect(style.samples.lifecycle.shutdown.url).toMatch(/^\/audio\/.+\.wav$/);
      expect(style.samples.lifecycle.startup.torqueStartSeconds).toBeGreaterThan(0);
      expect(style.samples.lifecycle.startup.torqueStartSeconds).toBeLessThan(
        style.samples.lifecycle.startup.bankCrossfadeStartSeconds,
      );
      expect(style.samples.lifecycle.startup.bankCrossfadeStartSeconds).toBeLessThan(
        style.samples.lifecycle.startup.bankCrossfadeEndSeconds,
      );
      expect(style.samples.lifecycle.shutdown.crossfadeSeconds).toBeGreaterThan(0);
      style.samples.loadPrograms?.forEach((program, index) => {
        expect(program.gain).toBeGreaterThan(0.5);
        expect(program.gain).toBeLessThan(1.5);
        expect(program.referenceLoad).toBeGreaterThan(0);
        expect(program.referenceLoad).toBeLessThanOrEqual(1);
        expect(program.rpmBands.length).toBeGreaterThanOrEqual(3);
        expect(program.rpmBands).toHaveLength(style.samples.rpmBands.length);
        expect(program.rpmBands.map((band) => band.referenceRpm)).toEqual(
          style.samples.rpmBands.map((band) => band.referenceRpm),
        );
        expect(program.rpmBands.every((band) => band.role !== "idle")).toBe(true);
        const productionUrls = new Set(style.samples.rpmBands.map((band) => band.url));
        program.rpmBands.forEach((band) => {
          expect(productionUrls.has(band.url)).toBe(false);
        });
        if (index > 0) {
          expect(program.referenceLoad).toBeGreaterThan(
            style.samples.loadPrograms![index - 1].referenceLoad,
          );
        }
      });
      expect(style.samples.rpmBands[0].role).toBe("idle");
      style.samples.rpmBands.forEach((band) => {
        expect(band.url).toMatch(/^\/audio\/.+\.(wav|mp3|ogg)$/);
      });
      expect(style.samples.rpmBands.map((band) => band.referenceRpm))
        .toEqual([...style.samples.rpmBands]
          .map((band) => band.referenceRpm)
          .sort((left, right) => left - right));
      expect(new Set(style.samples.rpmBands.map((band) => band.url)).size).toBe(3);
      expect(gears.at(-1)?.upshiftSpeed).toBeNull();
      for (let index = 0; index < gears.length; index += 1) {
        expect(gears[index].meshTeeth).toBeGreaterThan(20);
        expect(gears[index].downshiftSpeed).toBeGreaterThanOrEqual(0);
        expect(gears[index].downshiftSpeed).toBeLessThan(1);
        if (gears[index].upshiftSpeed !== null) {
          expect(gears[index].upshiftSpeed).toBeGreaterThan(gears[index].downshiftSpeed);
          expect(gears[index].upshiftSpeed).toBeLessThan(1);
        }
        if (index > 0) {
          expect(gears[index].downshiftSpeed)
            .toBeGreaterThan(gears[index - 1].downshiftSpeed);
        }
      }
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label has a complete, bounded physical drive profile",
    (style) => {
      const physics = style.physics;
      expect(physics.massKg).toBeGreaterThan(700);
      expect(physics.brakeBiasFront).toBeGreaterThan(0.5);
      expect(physics.brakeBiasFront).toBeLessThan(0.75);
      expect(physics.centerOfGravityHeightM).toBeGreaterThan(0.3);
      expect(physics.driveBiasFront).toBeGreaterThanOrEqual(0);
      expect(physics.driveBiasFront).toBeLessThanOrEqual(1);
      Object.values(style.differentials).forEach((differential) => {
        expect(differential.torqueBiasRatio).toBeGreaterThanOrEqual(1);
        expect(differential.preloadNewtons).toBeGreaterThanOrEqual(0);
        expect(differential.coastTorqueBiasRatio).toBeGreaterThanOrEqual(1);
        expect(differential.coastTorqueBiasRatio)
          .toBeLessThanOrEqual(differential.torqueBiasRatio);
        expect(differential.coastPreloadNewtons).toBeGreaterThanOrEqual(0);
        expect(differential.responseRate).toBeGreaterThan(0);
        expect(differential.couplingGainNewtonsPerMps).toBeGreaterThanOrEqual(0);
      });
      expect(physics.drivetrainEfficiency).toBeGreaterThan(0.7);
      expect(physics.drivetrainEfficiency).toBeLessThanOrEqual(1);
      expect(physics.drivelineDampingRatio).toBeGreaterThan(0.65);
      expect(physics.drivelineDampingRatio).toBeLessThan(1);
      expect(physics.drivelineResponseFrequency).toBeGreaterThan(60);
      expect(physics.drivelineBacklashRadians).toBeGreaterThan(0);
      expect(physics.drivelineBacklashRadians).toBeLessThan(0.04);
      expect(physics.frontWeightBias).toBeGreaterThan(0.45);
      expect(physics.frontWeightBias).toBeLessThan(0.7);
      expect(physics.finalDriveRatio).toBeGreaterThan(2);
      expect(getCarMaximumPageSpeed(style, 1))
        .toBeGreaterThan(getCarMaximumPageSpeed(style, -1));
      expect(physics.reverseTorqueAuthority).toBeGreaterThan(0.3);
      expect(physics.reverseTorqueAuthority).toBeLessThan(0.7);
      expect("reverseTorqueScale" in physics).toBe(false);
      expect("reverseDemandScale" in style.controls.pedals).toBe(false);
      expect("forwardAcceleration" in physics).toBe(false);
      expect("reverseAcceleration" in physics).toBe(false);
      expect(physics.maximumEngineBrakeWheelTorqueNm).toBeGreaterThan(0);
      expect("engineBrakeDeceleration" in physics).toBe(false);
      expect("aerodynamicDrag" in physics).toBe(false);
      expect("rollingResistance" in physics).toBe(false);
      expect(physics.worldPixelsPerMeter).toBeGreaterThan(40);
      expect(physics.physicalWheelbaseM * physics.worldPixelsPerMeter)
        .toBeGreaterThan(100);
      expect(physics.physicalWheelbaseM).toBeGreaterThan(2);
      expect(physics.trackWidthM).toBeGreaterThan(1.2);
      expect(physics.wheelRadiusM).toBeGreaterThan(0.2);
      expect(physics.wheelRadiusM).toBeLessThan(0.5);
      expect(physics.wheelInertiaKgM2).toBeGreaterThan(0.5);
      expect(physics.longitudinalGripRatio).toBeGreaterThanOrEqual(0.8);
      expect(physics.longitudinalGripRatio).toBeLessThanOrEqual(1.3);
      expect("launchTorqueMultiplier" in physics).toBe(false);
      expect(physics.longitudinalSlidingGripRatio).toBeGreaterThan(0.7);
      expect(physics.longitudinalSlidingGripRatio).toBeLessThanOrEqual(1);
      expect(physics.tireLateralSlidingGripRatio).toBeGreaterThan(0.7);
      expect(physics.tireLateralSlidingGripRatio).toBeLessThanOrEqual(1);
      expect(physics.tireBreakawaySharpness).toBeGreaterThan(0);
      expect(physics.tireRecoveryRate).toBeGreaterThan(0.5);
      expect(physics.tireRecoveryRate).toBeLessThanOrEqual(1);
      expect(physics.lowSpeedTireReferenceMps).toBeGreaterThan(0.2);
      expect(physics.lowSpeedTireBlendMps).toBeGreaterThan(1.5);
      expect(physics.lowSpeedTireBlendMps).toBeLessThan(3);
      expect(physics.steeringTrailM).toBeGreaterThan(0);
      expect(physics.steeringSystemInertiaKgM2).toBeGreaterThan(0);
      expect(physics.steeringCounterRate).toBeGreaterThan(physics.steeringInputRate);
      expect(physics.steeringInputRate).toBeGreaterThan(physics.steeringReturnRate);
      expect(physics.steeringRackFrequency).toBeGreaterThan(10);
      expect(physics.steeringReturnSpeedGain).toBeGreaterThan(0);
      expect(physics.tireLateralRelaxationLengthM).toBeGreaterThan(0.1);
      expect(physics.tireLongitudinalRelaxationLengthM).toBeGreaterThan(0.1);
      expect(physics.tireLongitudinalRelaxationLengthM)
        .toBeLessThan(physics.tireLateralRelaxationLengthM);
      expect(physics.tireResponseScale).toBeGreaterThan(1);
      expect(physics.tireResponseScale).toBeLessThan(3);
      expect(physics.rearCorneringStiffnessScale).toBeGreaterThan(0.8);
      expect(physics.rearCorneringStiffnessScale).toBeLessThan(1.2);
      expect(physics.maximumYawRate).toBeGreaterThan(1);
      expect(physics.maximumYawRate).toBeLessThanOrEqual(1.5);
      const { direction, driverAids, pedals, steering } = style.controls;
      expect(driverAids.stabilityEngineReduction).toBeGreaterThan(0);
      expect(driverAids.stabilityEngineReduction).toBeLessThan(0.4);
      expect(direction.couplingBlendSeconds).toBeLessThan(0.2);
      expect(direction.residualBrakePressure).toBeGreaterThan(0.05);
      expect(direction.residualBrakePressure).toBeLessThan(0.3);
      expect(direction.restEntrySpeedMps).toBeGreaterThan(0.03);
      expect(direction.restEntrySpeedMps).toBeLessThan(0.08);
      expect(direction.restReleaseForceNewtons).toBeGreaterThan(50);
      expect(direction.restSettleSeconds).toBeGreaterThan(0.02);
      expect(direction.stopSpeedMps).toBeGreaterThan(0.15);
      expect(direction.stopSpeedMps).toBeLessThan(0.35);
      expect(pedals.brakeContactPressure).toBeGreaterThan(0.1);
      expect(pedals.brakeContactPressure).toBeLessThan(0.3);
      expect(pedals.brakeContactRate).toBeGreaterThan(pedals.brakeApplyRate);
      expect(pedals.throttleReversalRate).toBeGreaterThan(pedals.throttleRiseRate);
      expect(pedals.engineLoadRiseSeconds).toBeLessThan(pedals.engineLoadReleaseSeconds);
      expect(pedals.torqueDemandExponent).toBeGreaterThan(0.75);
      expect(pedals.torqueDemandExponent).toBeLessThan(1.35);
      expect(steering.heldDamping).toBeLessThan(steering.releasedDamping);
      expect(steering.heldAligningMomentScale).toBeGreaterThan(0);
      expect(steering.heldAligningMomentScale).toBeLessThan(0.15);
      expect(driverAids.absSlipThreshold).toBeGreaterThan(0.1);
      expect(driverAids.absPressureReleaseRate)
        .toBeGreaterThan(driverAids.absPressureApplyRate);
      expect(driverAids.tractionSlipThreshold).toBeGreaterThan(0.35);
      expect(driverAids.tractionMaximumReduction).toBeLessThan(0.55);
      expect(driverAids.engineDragSlipThreshold).toBeGreaterThan(0.05);
      expect(driverAids.engineDragSlipThreshold)
        .toBeLessThan(driverAids.tractionSlipThreshold);
      expect(driverAids.engineDragMaximumReduction).toBeGreaterThan(0.25);
      expect(driverAids.engineDragMaximumReduction).toBeLessThan(0.5);
      expect(driverAids.engineDragApplyRate).toBeGreaterThan(0);
      expect(driverAids.engineDragReleaseRate).toBeGreaterThan(0);
      expect(driverAids.stabilityBrakeStrength).toBeGreaterThan(0.1);
      expect(driverAids.stabilityBrakeStrength).toBeLessThan(0.25);
      expect(getCarMaximumPageSpeed(style, 1) / style.road.maximumForwardKph)
        .toBeCloseTo(style.physics.worldPixelsPerMeter / 3.6, 8);
      expect(getCarMaximumPageSpeed(style, -1) / style.road.maximumReverseKph)
        .toBeCloseTo(style.physics.worldPixelsPerMeter / 3.6, 8);
      expect(physics.torqueCurve.length).toBeGreaterThanOrEqual(3);
      expect(physics.torqueCurve.map((point) => point.rpmRatio)).toEqual(
        [...physics.torqueCurve]
          .map((point) => point.rpmRatio)
          .sort((left, right) => left - right),
      );
      physics.torqueCurve.forEach((point) => {
        expect(point.rpmRatio).toBeGreaterThanOrEqual(0);
        expect(point.rpmRatio).toBeLessThanOrEqual(1);
        expect(point.multiplier).toBeGreaterThan(0);
      });
      expect(style.transmission.reverseRatio).toBeGreaterThan(2);
      expect(style.transmission.reverseMeshTeeth).toBeGreaterThan(20);
      const coupling = style.transmission.coupling;
      if (coupling.kind === "manual") {
        expect(coupling.launchCoupling).toBeGreaterThan(0.3);
        expect(coupling.launchCoupling).toBeLessThan(0.7);
        expect(coupling.shiftReleaseCoupling).toBeGreaterThan(0);
        expect(coupling.shiftReleaseCoupling).toBeLessThan(0.1);
      } else {
        expect(coupling.stallCoupling).toBeGreaterThan(0.15);
        expect(coupling.stallTorqueTransfer).toBeGreaterThan(coupling.stallCoupling);
        expect(coupling.stallTorqueTransfer).toBeLessThanOrEqual(1);
        expect(coupling.stallTorqueRatio).toBeGreaterThan(1.5);
        expect(coupling.stallTorqueRatio).toBeLessThan(3);
        expect(coupling.fluidCoupling).toBeGreaterThan(coupling.stallCoupling);
        expect(coupling.shiftCoupling).toBeGreaterThan(0.5);
        expect(coupling.lockupStartSpeed).toBeLessThan(coupling.lockupEndSpeed);
        expect(coupling.lockupReleaseLoad).toBeGreaterThan(0.5);
        expect(coupling.lockupReleaseLoad).toBeLessThan(1);
      }
      const targets = style.handlingTargets;
      expect(targets.minimumForwardLaunchRatio)
        .toBeGreaterThan(targets.minimumReverseLaunchRatio);
      expect(targets.reverseToForwardLaunchRatioMax).toBeLessThan(1);
      expect(targets.maximumBrakeStopSeconds).toBeGreaterThan(0.2);
      expect(targets.maximumSlalomSideslipRatio).toBeLessThan(0.35);
      expect(targets.minimumTurnHeadingRadians).toBeGreaterThan(0.1);
      const telemetryEnvelopes = [
        targets.telemetry.brakingDistancePixels,
        targets.telemetry.coastRetentionRatio,
        targets.telemetry.forwardThirtyFivePercentSeconds,
        targets.telemetry.reverseLaunchRatio,
        targets.telemetry.reverseFifteenPercentSeconds,
        targets.telemetry.steeringResponseSeconds,
      ];
      telemetryEnvelopes.forEach(([minimum, maximum]) => {
        expect(minimum).toBeGreaterThan(0);
        expect(maximum).toBeGreaterThan(minimum);
      });
      style.transmission.gears.forEach((gear, index) => {
        expect(gear.ratio).toBeGreaterThan(0.5);
        if (index > 0) expect(gear.ratio).toBeLessThan(style.transmission.gears[index - 1].ratio);
      });
    },
  );

  it("uses a torque converter only for the automatic taxi", () => {
    expect(CAR_ENGINE_STYLES.city.transmission.coupling.kind).toBe("manual");
    expect(CAR_ENGINE_STYLES.rally.transmission.coupling.kind).toBe("manual");
    expect(CAR_ENGINE_STYLES.taxi.transmission.coupling.kind)
      .toBe("torque-converter");
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label maps page speed, road speed, gearing, and redline coherently",
    (style) => {
      const forwardPageSpeed = getCarMaximumPageSpeed(style, 1);
      const reversePageSpeed = -getCarMaximumPageSpeed(style, -1);
      expect(getCarPageSpeedRatio(style, forwardPageSpeed)).toBeCloseTo(1, 8);
      expect(getCarPageSpeedRatio(style, reversePageSpeed)).toBeCloseTo(-1, 8);
      expect(getCarEngineRoadSpeedKph(
        style,
        getCarPageSpeedRatio(style, forwardPageSpeed),
      )).toBeCloseTo(style.road.maximumForwardKph, 8);
      expect(getCarEngineRoadSpeedKph(
        style,
        getCarPageSpeedRatio(style, reversePageSpeed),
      )).toBeCloseTo(-style.road.maximumReverseKph, 8);
      const topGearRpm = getCarEngineTargetRpm(
        style,
        1,
        1,
        style.transmission.gears.length,
        0,
      );
      expect(topGearRpm).toBeGreaterThan(style.calibration.maximumTorqueRpm);
      expect(topGearRpm).toBeLessThanOrEqual(style.combustion.limiterStartRpm);
    },
  );

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label keeps calculated RPM inside its operating range",
    (style) => {
      expect(getCarEngineTargetRpm(style, 0, 0, 1, 0)).toBe(style.rpm.idle);
      expect(getCarEngineTargetRpm(style, 1, 1, style.transmission.gears.length, 1))
        .toBeLessThanOrEqual(style.rpm.maximum);
      expect(getCarEngineTargetRpm(style, -1, -1, 1, 1))
        .toBeLessThanOrEqual(style.rpm.maximum);
    },
  );

  it("maps forward and reverse speeds through each style independently", () => {
    expect(getCarEngineRoadSpeedKph(CAR_ENGINE_STYLES.city, 1)).toBe(82);
    expect(getCarEngineRoadSpeedKph(CAR_ENGINE_STYLES.rally, 1)).toBe(92);
    expect(getCarEngineRoadSpeedKph(CAR_ENGINE_STYLES.taxi, -1))
      .toBe(-CAR_ENGINE_STYLES.taxi.road.maximumReverseKph);
  });

  it("produces distinct RPM behavior for different engine styles", () => {
    const cityRpm = getCarEngineTargetRpm(CAR_ENGINE_STYLES.city, 0.35, 1, 2, 1);
    const rallyRpm = getCarEngineTargetRpm(CAR_ENGINE_STYLES.rally, 0.35, 1, 2, 1);
    const taxiRpm = getCarEngineTargetRpm(CAR_ENGINE_STYLES.taxi, 0.35, 1, 2, 1);
    expect(new Set([cityRpm, rallyRpm, taxiRpm]).size).toBe(3);
  });

  it("couples road speed to wheel, selected gear, and final-drive ratios", () => {
    const style = CAR_ENGINE_STYLES.city;
    const firstGear = getCarEngineTargetRpm(style, 0.18, 1, 1, 0);
    const secondGear = getCarEngineTargetRpm(style, 0.18, 1, 2, 0);
    const fasterFirstGear = getCarEngineTargetRpm(style, 0.2, 1, 1, 0);
    expect(firstGear).toBeGreaterThan(secondGear);
    expect(fasterFirstGear).toBeGreaterThan(firstGear);
    const roadMetresPerSecond = style.road.maximumForwardKph * 0.18 / 3.6;
    const wheelRpm = roadMetresPerSecond
      / (2 * Math.PI * style.physics.wheelRadiusM) * 60;
    expect(firstGear).toBeCloseTo(
      wheelRpm * style.transmission.gears[0].ratio * style.physics.finalDriveRatio,
      5,
    );
  });

  it("shares the complete matched bank within one acoustic source identity", () => {
    const idleUrls = Object.values(CAR_ENGINE_STYLES)
      .map((style) => style.samples.rpmBands[0].url);
    const drivingUrls = Object.values(CAR_ENGINE_STYLES)
      .flatMap((style) => style.samples.rpmBands.slice(1).map((band) => band.url));
    expect(new Set(idleUrls)).toEqual(new Set(["/audio/engine-natural-idle.wav"]));
    expect(new Set(drivingUrls)).toEqual(new Set([
      "/audio/engine-city-mid.wav",
      "/audio/engine-city-high.wav",
    ]));
  });

  it("keeps lifecycle recordings coherent within an acoustic source identity", () => {
    const stylesBySource = Object.values(CAR_ENGINE_STYLES).reduce(
      (groups, style) => {
        const group = groups.get(style.samples.sourceId) ?? [];
        group.push(style);
        groups.set(style.samples.sourceId, group);
        return groups;
      },
      new Map<string, Array<(typeof CAR_ENGINE_STYLES)[keyof typeof CAR_ENGINE_STYLES]>>(),
    );
    stylesBySource.forEach((styles) => {
      const [reference, ...variants] = styles;
      expect(new Set(styles.map((style) => style.samples.lifecycle.startup.url)).size)
        .toBe(1);
      expect(new Set(styles.map((style) => style.samples.lifecycle.shutdown.url)).size)
        .toBe(1);
      expect(new Set(styles.map((style) => style.samples.rpmBands[0].url)).size)
        .toBe(1);
      variants.forEach((style) => {
        expect(style.calibration).toEqual(reference.calibration);
        expect(style.combustion).toEqual({
          ...reference.combustion,
          crankInertia: style.combustion.crankInertia,
        });
        expect(style.rpm).toEqual(reference.rpm);
        expect(style.samples.rpmBands).toEqual(reference.samples.rpmBands);
        expect(style.sound).toEqual(reference.sound);
        expect(style.physics.torqueCurve).not.toEqual(reference.physics.torqueCurve);
      });
    });
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label maps smoothed load without looping transient rev sweeps",
    (style) => {
      const idle = getCarEngineMixTargets(style, {
        load: 0,
        overrun: 0,
        rpm: style.rpm.idle,
        shiftProgress: 0,
        speed: 0,
      });
      const loaded = getCarEngineMixTargets(style, {
        load: 1,
        overrun: 0,
        rpm: style.rpm.maximum * 0.75,
        shiftProgress: 0,
        speed: 0.65,
      });
      const shifting = getCarEngineMixTargets(style, {
        load: 1,
        overrun: 0,
        rpm: style.rpm.maximum * 0.75,
        shiftProgress: 0.5,
        speed: 0.65,
      });

      expect(idle.loadBlend).toBe(0);
      expect(loaded.loadBlend).toBe(0);
      expect(loaded.driveLevel).toBeGreaterThan(idle.driveLevel);
      expect(loaded.intake).toBeGreaterThan(idle.intake);
      expect(shifting.intake).toBeLessThan(loaded.intake);
      expect(style.samples.loadPrograms).toBeUndefined();
    },
  );

  it("interpolates independent load rows with equal-power weights", () => {
    expect(getCarEngineLoadWeights([0, 0.5, 1], 0)).toEqual([1, 0, 0]);
    expect(getCarEngineLoadWeights([0, 0.5, 1], 1)).toEqual([0, 0, 1]);
    const lower = getCarEngineLoadWeights([0, 0.5, 1], 0.25);
    const upper = getCarEngineLoadWeights([0, 0.5, 1], 0.75);
    expect(lower[0]).toBeCloseTo(Math.SQRT1_2);
    expect(lower[1]).toBeCloseTo(Math.SQRT1_2);
    expect(lower[2]).toBe(0);
    expect(upper[0]).toBe(0);
    expect(upper[1]).toBeCloseTo(Math.SQRT1_2);
    expect(upper[2]).toBeCloseTo(Math.SQRT1_2);
    expect(lower.reduce((sum, weight) => sum + weight * weight, 0))
      .toBeCloseTo(1);
    expect(upper.reduce((sum, weight) => sum + weight * weight, 0))
      .toBeCloseTo(1);
  });

  it.each(Object.values(CAR_ENGINE_STYLES))(
    "$label confines correlated RPM handoffs to narrow unity-gain windows",
    (style) => {
      const bands = style.samples.rpmBands;
      const idleSpan = bands[1].referenceRpm - bands[0].referenceRpm;
      const upperSpan = bands[2].referenceRpm - bands[1].referenceRpm;
      expect(getCarEngineBandWeights(bands, bands[0].referenceRpm)).toEqual([1, 0, 0]);
      expect(getCarEngineBandWeights(
        bands,
        bands[0].referenceRpm + idleSpan * 0.4,
      )).toEqual([0, 1, 0]);
      expect(getCarEngineBandWeights(bands, bands[1].referenceRpm)).toEqual([0, 1, 0]);
      expect(getCarEngineBandWeights(
        bands,
        bands[1].referenceRpm + upperSpan * 0.8,
      )).toEqual([0, 0, 1]);

      const idleBlendMidpoint = bands[0].referenceRpm + idleSpan * 0.21;
      const upperBlendMidpoint = bands[1].referenceRpm + upperSpan * 0.535;
      const idleMidpointWeights = getCarEngineBandWeights(bands, idleBlendMidpoint);
      const upperMidpointWeights = getCarEngineBandWeights(bands, upperBlendMidpoint);
      expect(idleMidpointWeights[0]).toBeCloseTo(0.5);
      expect(idleMidpointWeights[1]).toBeCloseTo(0.5);
      expect(upperMidpointWeights[1]).toBeCloseTo(0.5);
      expect(upperMidpointWeights[2]).toBeCloseTo(0.5);
      expect(idleMidpointWeights.reduce(
        (sum, weight) => sum + weight,
        0,
      )).toBeCloseTo(1);
      expect(upperMidpointWeights.reduce(
        (sum, weight) => sum + weight,
        0,
      )).toBeCloseTo(1);

      [0.2, 0.5, 0.6].forEach((ratio) => {
        const rpm = bands[0].referenceRpm
          + (bands[2].referenceRpm - bands[0].referenceRpm) * ratio;
        const weights = getCarEngineBandWeights(bands, rpm);
        expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
        expect(weights.filter((weight) => weight > 0)).toHaveLength(1);
      });
    },
  );

  it("interpolates torque instead of tying longitudinal force to steering", () => {
    const city = CAR_ENGINE_STYLES.city;
    const lowRpm = city.rpm.idle;
    const peakTorqueRpm = city.calibration.maximumTorqueRpm;
    const peakPowerRpm = city.calibration.maximumPowerRpm;
    expect(getCarTorqueMultiplier(city, lowRpm)).toBeCloseTo(0.58);
    expect(getCarTorqueMultiplier(city, peakTorqueRpm)).toBeCloseTo(1);
    expect(getCarTorqueMultiplier(city, peakPowerRpm)).toBeCloseTo(0.815);
    expect(getCarTorqueMultiplier(city, peakTorqueRpm))
      .toBeGreaterThan(getCarTorqueMultiplier(city, lowRpm));
    expect(getCarTorqueMultiplier(city, peakTorqueRpm))
      .toBeGreaterThan(getCarTorqueMultiplier(city, peakPowerRpm));
  });

  it("keeps installation inertia distinct while limiter calibration stays source-coherent", () => {
    const styles = Object.values(CAR_ENGINE_STYLES);
    expect(new Set(styles.map((style) => style.combustion.crankInertia)).size)
      .toBe(styles.length);
    expect(new Set(styles.map((style) => style.combustion.limiterStartRpm)).size)
      .toBe(1);
  });
});
