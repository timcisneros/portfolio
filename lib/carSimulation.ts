import type {
  CarCollisionReconciliationInput,
} from "./carCollision";
import {
  createCarChassisState,
  getCarDrivenWheelSpeed,
  getCarSignedSpeed,
  reconcileCarWheelStateAfterCollision,
  resolveCarContactManifold,
  type CarChassisState,
  type CarPhysicsPose,
} from "./carChassis";
import {
  stepCarDynamics,
  type CarDynamicsInput,
  type CarDynamicsOutput,
  type CarDynamicsState,
} from "./carDynamics";
import {
  createCarDrivetrainState,
  reconcileCarDrivetrainAfterCollision,
  type CarDrivetrainOutput,
  type CarDrivetrainState,
} from "./carDrivetrain";
import {
  getCarPageSpeedRatio,
  type CarEngineStyle,
} from "./carEngineStyles";
import { getCarYawInertiaKgM2 } from "./carGeometry";

export type CarSimulationRuntime = {
  accumulatorSeconds: number;
  dynamics: CarDynamicsState;
  drivetrainOutput: CarDrivetrainOutput | null;
  position: { x: number; y: number };
  poses: {
    current: CarPhysicsPose;
    previous: CarPhysicsPose;
    rendered: CarPhysicsPose;
  };
};

export function createCarSimulationRuntime(
  style: CarEngineStyle,
  heading: number,
  position = { x: 28, y: 110 },
  signedSpeed = 0,
): CarSimulationRuntime {
  const chassis = createCarChassisState(heading, signedSpeed);
  const pose = { heading: chassis.heading, x: position.x, y: position.y };
  return {
    accumulatorSeconds: 0,
    drivetrainOutput: null,
    dynamics: { chassis, drivetrain: createCarDrivetrainState(style) },
    position: { ...position },
    poses: { current: { ...pose }, previous: { ...pose }, rendered: { ...pose } },
  };
}

export function getCarSimulationSpeed(runtime: CarSimulationRuntime) {
  return getCarSignedSpeed(runtime.dynamics.chassis);
}

export function getCarSimulationPose(runtime: CarSimulationRuntime): CarPhysicsPose {
  return {
    heading: runtime.dynamics.chassis.heading,
    x: runtime.position.x,
    y: runtime.position.y,
  };
}

export function synchronizeCarSimulationPoses(
  runtime: CarSimulationRuntime,
  heading = runtime.dynamics.chassis.heading,
) {
  const pose = { heading, x: runtime.position.x, y: runtime.position.y };
  runtime.poses.previous = { ...pose };
  runtime.poses.current = { ...pose };
  runtime.poses.rendered = { ...pose };
}

export function shiftCarSimulationPoses(
  runtime: CarSimulationRuntime,
  x: number,
  y: number,
) {
  runtime.poses.previous.x += x;
  runtime.poses.previous.y += y;
  runtime.poses.current.x += x;
  runtime.poses.current.y += y;
  runtime.poses.rendered.x += x;
  runtime.poses.rendered.y += y;
}

export function solveCarSimulationStep(
  runtime: CarSimulationRuntime,
  style: CarEngineStyle,
  input: CarDynamicsInput,
  source: CarDynamicsState = runtime.dynamics,
) {
  return stepCarDynamics(source, style, input);
}

export function commitCarSimulationStep(
  runtime: CarSimulationRuntime,
  output: CarDynamicsOutput,
  integratePosition = true,
) {
  runtime.dynamics = output.state;
  runtime.drivetrainOutput = output.drivetrain;
  if (integratePosition) {
    runtime.position.x += output.chassis.displacementX;
    runtime.position.y += output.chassis.displacementY;
  }
}

export function resetCarSimulationRuntime(
  runtime: CarSimulationRuntime,
  style: CarEngineStyle,
  heading: number,
  position = runtime.position,
  signedSpeed = 0,
) {
  const replacement = createCarSimulationRuntime(
    style, heading, position, signedSpeed,
  );
  runtime.accumulatorSeconds = replacement.accumulatorSeconds;
  runtime.dynamics = replacement.dynamics;
  runtime.drivetrainOutput = null;
  runtime.position = replacement.position;
  runtime.poses = replacement.poses;
}

export type CarSimulationCheckpoint = {
  accumulatorSeconds: number;
  dynamics: CarDynamicsState;
  drivetrainOutput: CarDrivetrainOutput | null;
  position: { x: number; y: number };
  poses: CarSimulationRuntime["poses"];
};

export type CarSimulationPresentation = Readonly<{
  brake: number;
  frontLeftSuspensionTravel: number;
  frontRightSuspensionTravel: number;
  pitch: number;
  rearLeftSuspensionTravel: number;
  rearRightSuspensionTravel: number;
  roll: number;
  steering: number;
}>;

function cloneCarDynamicsState(state: CarDynamicsState): CarDynamicsState {
  return { chassis: { ...state.chassis }, drivetrain: { ...state.drivetrain } };
}

export function captureCarSimulationCheckpoint(
  runtime: CarSimulationRuntime,
): CarSimulationCheckpoint {
  return {
    accumulatorSeconds: runtime.accumulatorSeconds,
    dynamics: cloneCarDynamicsState(runtime.dynamics),
    drivetrainOutput: runtime.drivetrainOutput
      ? { ...runtime.drivetrainOutput }
      : null,
    position: { ...runtime.position },
    poses: {
      current: { ...runtime.poses.current },
      previous: { ...runtime.poses.previous },
      rendered: { ...runtime.poses.rendered },
    },
  };
}

export function restoreCarSimulationCheckpoint(
  runtime: CarSimulationRuntime,
  checkpoint: CarSimulationCheckpoint,
) {
  runtime.accumulatorSeconds = checkpoint.accumulatorSeconds;
  runtime.dynamics = cloneCarDynamicsState(checkpoint.dynamics);
  runtime.drivetrainOutput = checkpoint.drivetrainOutput
    ? { ...checkpoint.drivetrainOutput }
    : null;
  runtime.position = { ...checkpoint.position };
  runtime.poses = {
    current: { ...checkpoint.poses.current },
    previous: { ...checkpoint.poses.previous },
    rendered: { ...checkpoint.poses.rendered },
  };
}

export function setCarSimulationWorldPose(
  runtime: CarSimulationRuntime,
  position: { x: number; y: number },
  heading = runtime.dynamics.chassis.heading,
  synchronize = false,
) {
  runtime.position = { ...position };
  runtime.dynamics.chassis.heading = heading;
  if (synchronize) synchronizeCarSimulationPoses(runtime, heading);
}

export function replaceCarSimulationDynamics(
  runtime: CarSimulationRuntime,
  dynamics: CarDynamicsState,
  drivetrainOutput: CarDrivetrainOutput | null = runtime.drivetrainOutput,
) {
  runtime.dynamics = cloneCarDynamicsState(dynamics);
  runtime.drivetrainOutput = drivetrainOutput ? { ...drivetrainOutput } : null;
}

export function hydrateCarSimulationRuntime(
  runtime: CarSimulationRuntime,
  input: {
    chassis: CarChassisState;
    drivetrain: CarDrivetrainState;
    drivetrainOutput?: CarDrivetrainOutput | null;
    position: { x: number; y: number };
  },
) {
  runtime.accumulatorSeconds = 0;
  runtime.dynamics = {
    chassis: { ...input.chassis },
    drivetrain: { ...input.drivetrain },
  };
  runtime.drivetrainOutput = input.drivetrainOutput
    ? { ...input.drivetrainOutput }
    : null;
  runtime.position = { ...input.position };
  synchronizeCarSimulationPoses(runtime, input.chassis.heading);
}

export function reconcileCarSimulationAfterCollision(
  runtime: CarSimulationRuntime,
  style: CarEngineStyle,
  input: CarCollisionReconciliationInput,
) {
  const chassis = reconcileCarWheelStateAfterCollision(
    runtime.dynamics.chassis,
    style,
    {
      contacts: input.contacts,
      previousYawRate: input.previousYawRate,
    },
  );
  const drivetrain = reconcileCarDrivetrainAfterCollision(
    runtime.dynamics.drivetrain,
    style,
    {
      direction: chassis.driveDirection,
      drivenWheelSpeedRatio: getCarPageSpeedRatio(
        style,
        getCarDrivenWheelSpeed(chassis, style),
      ),
      previousDrivenWheelSpeedRatio: input.previousDrivenWheelSpeedRatio,
    },
  );
  runtime.dynamics = { chassis, drivetrain };
}

export function getCarSimulationMotionEnergyJ(
  runtime: CarSimulationRuntime,
  style: CarEngineStyle,
) {
  const chassis = runtime.dynamics.chassis;
  const pixelsPerMeter = Math.max(1, style.physics.worldPixelsPerMeter);
  const wheelRadiusM = Math.max(0.05, style.physics.wheelRadiusM);
  const speedMps = Math.hypot(chassis.velocityX, chassis.velocityY)
    / pixelsPerMeter;
  const translation = 0.5 * style.physics.massKg * speedMps * speedMps;
  const yaw = 0.5 * getCarYawInertiaKgM2(style.id, style.physics.massKg)
    * chassis.yawRate * chassis.yawRate;
  const wheels = [
    chassis.frontLeftWheelSpeed,
    chassis.frontRightWheelSpeed,
    chassis.rearLeftWheelSpeed,
    chassis.rearRightWheelSpeed,
  ].reduce((energy, wheelSpeed) => {
    const angularSpeed = wheelSpeed / pixelsPerMeter / wheelRadiusM;
    return energy + 0.5 * style.physics.wheelInertiaKgM2
      * angularSpeed * angularSpeed;
  }, 0);
  return translation + yaw + wheels;
}

export function constrainCarSimulationPassiveMotion(
  runtime: CarSimulationRuntime,
  style: CarEngineStyle,
  maximumEnergyJ: number,
) {
  const motionEnergyJ = getCarSimulationMotionEnergyJ(runtime, style);
  const allowedEnergyJ = Math.max(0, maximumEnergyJ);
  if (motionEnergyJ <= allowedEnergyJ * 1.001 + 0.002) return false;
  const scale = allowedEnergyJ <= 0.002
    ? 0
    : Math.sqrt(allowedEnergyJ / Math.max(0.000001, motionEnergyJ));
  const chassis = runtime.dynamics.chassis;
  chassis.velocityX *= scale;
  chassis.velocityY *= scale;
  chassis.yawRate *= scale;
  chassis.frontLeftWheelSpeed *= scale;
  chassis.frontRightWheelSpeed *= scale;
  chassis.rearLeftWheelSpeed *= scale;
  chassis.rearRightWheelSpeed *= scale;
  chassis.frontWheelSpeed *= scale;
  chassis.rearWheelSpeed *= scale;
  chassis.frontLeftLongitudinalDeflectionM *= scale;
  chassis.frontRightLongitudinalDeflectionM *= scale;
  chassis.rearLeftLongitudinalDeflectionM *= scale;
  chassis.rearRightLongitudinalDeflectionM *= scale;
  chassis.frontLeftLateralDeflectionM *= scale;
  chassis.frontRightLateralDeflectionM *= scale;
  chassis.rearLeftLateralDeflectionM *= scale;
  chassis.rearRightLateralDeflectionM *= scale;
  chassis.frontDifferentialCouplingForce *= scale;
  chassis.rearDifferentialCouplingForce *= scale;
  chassis.centerDifferentialCouplingForce *= scale;
  runtime.dynamics.drivetrain.shaftTwistRadians =
    (runtime.dynamics.drivetrain.shaftTwistRadians ?? 0) * scale;
  runtime.dynamics.drivetrain.shaftTorqueNm =
    (runtime.dynamics.drivetrain.shaftTorqueNm ?? 0) * scale;
  return true;
}

export function getCarSimulationPresentation(
  runtime: CarSimulationRuntime,
): CarSimulationPresentation {
  const chassis = runtime.dynamics.chassis;
  const suspensionTravel = (compression: number) => Math.max(
    -0.16,
    Math.min(0.2, compression * 0.22),
  );
  const held = chassis.restState === "held";
  return {
    brake: Math.max(0, Math.min(1, chassis.brakePressure)),
    frontLeftSuspensionTravel: suspensionTravel(
      chassis.frontLeftSuspensionCompression,
    ),
    frontRightSuspensionTravel: suspensionTravel(
      chassis.frontRightSuspensionCompression,
    ),
    pitch: held ? 0 : Math.max(
      -0.006,
      Math.min(0.006, chassis.longitudinalLoadTransfer / 0.12 * 0.006),
    ),
    rearLeftSuspensionTravel: suspensionTravel(
      chassis.rearLeftSuspensionCompression,
    ),
    rearRightSuspensionTravel: suspensionTravel(
      chassis.rearRightSuspensionCompression,
    ),
    roll: held ? 0 : Math.max(
      -0.007,
      Math.min(0.007, -chassis.lateralLoadTransfer / 0.24 * 0.007),
    ),
    steering: chassis.steeringAngle,
  };
}

export function replaceCarSimulationDrivetrain(
  runtime: CarSimulationRuntime,
  drivetrain: CarDrivetrainState,
  output: CarDrivetrainOutput | null = null,
) {
  runtime.dynamics.drivetrain = { ...drivetrain };
  runtime.drivetrainOutput = output ? { ...output } : null;
}

export function setCarSimulationAccumulator(
  runtime: CarSimulationRuntime,
  seconds: number,
) {
  runtime.accumulatorSeconds = Math.max(0, seconds);
}

export function accumulateCarSimulationTime(
  runtime: CarSimulationRuntime,
  deltaSeconds: number,
  maximumSeconds: number,
) {
  runtime.accumulatorSeconds = Math.min(
    maximumSeconds,
    runtime.accumulatorSeconds + Math.max(0, deltaSeconds),
  );
}

export function beginCarSimulationFixedStep(runtime: CarSimulationRuntime) {
  runtime.poses.previous = { ...runtime.poses.current };
}

export function completeCarSimulationFixedStep(
  runtime: CarSimulationRuntime,
  stepSeconds: number,
) {
  runtime.poses.current = getCarSimulationPose(runtime);
  runtime.accumulatorSeconds = Math.max(
    0,
    runtime.accumulatorSeconds - Math.max(0, stepSeconds),
  );
}

export function setCarSimulationRenderedPose(
  runtime: CarSimulationRuntime,
  pose: CarPhysicsPose,
) {
  runtime.poses.rendered = { ...pose };
}

export function holdCarSimulationPose(runtime: CarSimulationRuntime) {
  const pose = getCarSimulationPose(runtime);
  runtime.poses.previous = { ...pose };
  runtime.poses.current = { ...pose };
  runtime.poses.rendered = { ...pose };
}

export function translateCarSimulationWorld(
  runtime: CarSimulationRuntime,
  x: number,
  y: number,
) {
  runtime.position.x += x;
  runtime.position.y += y;
  shiftCarSimulationPoses(runtime, x, y);
}

export function resolveCarSimulationContactManifold(
  runtime: CarSimulationRuntime,
  contacts: Parameters<typeof resolveCarContactManifold>[1],
  iterations?: number,
) {
  const result = resolveCarContactManifold(
    runtime.dynamics.chassis,
    contacts,
    iterations,
  );
  runtime.dynamics.chassis = { ...result.state };
  return result;
}
