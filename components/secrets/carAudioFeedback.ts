import type { CarChassisState } from "../../lib/carChassis";
import type { CarTireAudioInput } from "../../lib/secretAudio";

export function getCarTireAudioInput(
  chassis: CarChassisState,
): CarTireAudioInput {
  const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
  const wheels = [
    {
      brake: chassis.frontLeftBrakePressure,
      lateralAdhesion: chassis.frontLeftLateralAdhesion,
      longitudinalAdhesion: chassis.frontLeftLongitudinalAdhesion,
      longitudinalSlip: chassis.frontLeftLongitudinalSlip,
    },
    {
      brake: chassis.frontRightBrakePressure,
      lateralAdhesion: chassis.frontRightLateralAdhesion,
      longitudinalAdhesion: chassis.frontRightLongitudinalAdhesion,
      longitudinalSlip: chassis.frontRightLongitudinalSlip,
    },
    {
      brake: chassis.rearLeftBrakePressure,
      lateralAdhesion: chassis.rearLeftLateralAdhesion,
      longitudinalAdhesion: chassis.rearLeftLongitudinalAdhesion,
      longitudinalSlip: chassis.rearLeftLongitudinalSlip,
    },
    {
      brake: chassis.rearRightBrakePressure,
      lateralAdhesion: chassis.rearRightLateralAdhesion,
      longitudinalAdhesion: chassis.rearRightLongitudinalAdhesion,
      longitudinalSlip: chassis.rearRightLongitudinalSlip,
    },
  ].map((wheel) => {
    const brake = clamp01(wheel.brake);
    const slip = clamp01(Math.abs(wheel.longitudinalSlip));
    const longitudinalAdhesionLoss = clamp01(1 - wheel.longitudinalAdhesion);
    const brakeSeverity = clamp01((brake - 0.58) / 0.34);
    const slipSeverity = clamp01((slip - 0.24) / 0.56);
    const adhesionSeverity = clamp01(
      (longitudinalAdhesionLoss - 0.12) / 0.68,
    );
    return {
      braking: clamp01(
        brakeSeverity * slipSeverity * (0.25 + adhesionSeverity * 0.75),
      ),
      driven: clamp01(
        slip * (1 - brake) * (0.48 + longitudinalAdhesionLoss * 0.52),
      ),
      lateralAdhesionLoss: clamp01(1 - wheel.lateralAdhesion),
    };
  });
  const tireLoad = Math.max(
    chassis.frontLeftTireDemand,
    chassis.frontRightTireDemand,
    chassis.rearLeftTireDemand,
    chassis.rearRightTireDemand,
  );
  const minimumAdhesion = Math.min(
    chassis.frontLeftAdhesion,
    chassis.frontRightAdhesion,
    chassis.rearLeftAdhesion,
    chassis.rearRightAdhesion,
  );
  const brakingBreakaway = Math.max(...wheels.map((wheel) => wheel.braking));
  const drivenBreakaway = Math.max(...wheels.map((wheel) => wheel.driven));
  const lateralAdhesionLoss = Math.max(
    ...wheels.map((wheel) => wheel.lateralAdhesionLoss),
  );
  const corneringBreakaway = clamp01(
    chassis.lateralTireSlip * (0.48 + lateralAdhesionLoss * 0.52),
  );
  return {
    adhesionLoss: clamp01(1 - minimumAdhesion),
    brakePressure: clamp01(chassis.brakePressure),
    brakingBreakaway,
    corneringBreakaway,
    drivenBreakaway,
    lateralSlip: chassis.lateralTireSlip,
    longitudinalSlip: chassis.longitudinalTireSlip,
    serviceBraking: chassis.brakePressure > 0.08,
    slippingWheelCount: wheels.reduce(
      (count, wheel) => count + Number(
        Math.max(wheel.braking, wheel.driven) > 0.12,
      ),
      0,
    ),
    tireLoad: Math.max(0, tireLoad),
  };
}
