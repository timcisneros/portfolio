import {
  getCarDrivenWheelSpeed,
  advanceCarLongitudinalControl,
  advanceCarPedalInput,
  getCarSignedSpeed,
  stepCarChassis,
  type CarChassisInput,
  type CarChassisOutput,
  type CarChassisState,
} from "./carChassis";
import {
  getCarPageSpeedRatio,
  type CarEngineStyle,
} from "./carEngineStyles";
import { getCarYawInertiaKgM2 } from "./carGeometry";
import {
  getCarDrivetrainMechanicalReduction,
  getCarPowertrainMechanics,
  updateCarDrivetrain,
  type CarDrivetrainOutput,
  type CarDrivetrainState,
} from "./carDrivetrain";

export type CarDynamicsState = {
  chassis: CarChassisState;
  drivetrain: CarDrivetrainState;
};

export type CarDynamicsInput = Pick<
  CarChassisInput,
  | "contactConstraints"
  | "deltaSeconds"
  | "opposingPedals"
  | "parking"
  | "reducedMotion"
  | "steering"
  | "throttle"
  | "wheelGripMultipliers"
  | "wheelRollingResistanceMultipliers"
> & {
  detailedDiagnostics?: boolean;
  engineRunning?: boolean;
};

export type CarDynamicsOutput = {
  chassis: CarChassisOutput;
  diagnostics: CarDynamicsDiagnostics;
  drivetrain: CarDrivetrainOutput;
  state: CarDynamicsState;
};

export type CarMechanicalEnergyLedger = {
  balanceResidualJ: number;
  brakeLossJ: number;
  clutchSlipLossJ: number;
  differentialCouplingLossJ: number;
  combustionWorkJ: number;
  contactConstraintLossJ: number;
  drivelineWorkJ: number;
  idleGovernorWorkJ: number;
  inputShaftEnergyJ: number;
  pumpingLossJ: number;
  resistanceLossJ: number;
  shaftDampingLossJ: number;
  shaftPotentialEnergyJ: number;
  shiftOverlapLossJ: number;
  synchronizerLossJ: number;
  storedEnergyDeltaJ: number;
  storedEnergyJ: number;
  tireSlipLossJ: number;
};

export type CarDynamicsDiagnostics = {
  /** Corrector passes after the initial predictor, bounded to two. */
  correctionIterations: 0 | 1 | 2;
  appliedWheelForceNewtons: number;
  /** Null in production; populated only for explicit mechanical audits. */
  energy: CarMechanicalEnergyLedger | null;
  forceResidualNewtons: number;
  forceResidualRatio: number;
};

export function getCarMechanicalKineticEnergyJ(
  state: CarDynamicsState,
  style: CarEngineStyle,
) {
  const pixelsPerMeter = Math.max(1, style.physics.worldPixelsPerMeter);
  const wheelRadiusM = Math.max(0.05, style.physics.wheelRadiusM);
  const speedMps = Math.hypot(
    state.chassis.velocityX,
    state.chassis.velocityY,
  ) / pixelsPerMeter;
  const translational = 0.5 * style.physics.massKg * speedMps * speedMps;
  const yaw = 0.5
    * getCarYawInertiaKgM2(style.id, style.physics.massKg)
    * state.chassis.yawRate * state.chassis.yawRate;
  const wheelRotational = [
    state.chassis.frontLeftWheelSpeed,
    state.chassis.frontRightWheelSpeed,
    state.chassis.rearLeftWheelSpeed,
    state.chassis.rearRightWheelSpeed,
  ].reduce((energy, wheelSurfaceSpeed) => {
    const angularSpeed = wheelSurfaceSpeed / pixelsPerMeter / wheelRadiusM;
    return energy + 0.5 * style.physics.wheelInertiaKgM2
      * angularSpeed * angularSpeed;
  }, 0);
  const mechanicalReduction = getCarDrivetrainMechanicalReduction(
    style,
    state.drivetrain,
  );
  const mechanics = getCarPowertrainMechanics(style, mechanicalReduction);
  const crankAngularSpeed = state.drivetrain.rpm * Math.PI / 30;
  const crank = 0.5 * mechanics.crankInertiaKgM2
    * crankAngularSpeed * crankAngularSpeed;
  const inputShaftAngularSpeed = (
    state.drivetrain.converterTurbineRpm ?? 0
  ) * Math.PI / 30;
  const inputShaft = 0.5 * mechanics.inputShaftInertiaKgM2
    * inputShaftAngularSpeed * inputShaftAngularSpeed;
  const shaftTwistRadians = state.drivetrain.shaftTwistRadians ?? 0;
  const effectiveShaftTwistRadians = Math.sign(shaftTwistRadians) * Math.max(
    0,
    Math.abs(shaftTwistRadians) - style.physics.drivelineBacklashRadians,
  );
  const shaftPotential = 0.5 * mechanics.shaftStiffnessNmPerRadian
    * effectiveShaftTwistRadians * effectiveShaftTwistRadians;
  return translational + yaw + wheelRotational + crank + inputShaft
    + shaftPotential;
}

function buildDiagnostics(
  previous: CarDynamicsState,
  next: CarDynamicsState,
  style: CarEngineStyle,
  deltaSeconds: number,
  drivetrain: CarDrivetrainOutput,
  forceResidualNewtons: number,
  correctionIterations: 0 | 1 | 2,
  contactConstraintLossJ: number,
  detailed: boolean,
): CarDynamicsDiagnostics {
  const appliedWheelForceNewtons = next.chassis.frontDrivelineForce
    + next.chassis.rearDrivelineForce;
  let energy: CarMechanicalEnergyLedger | null = null;
  if (detailed) {
    const pixelsPerMeter = Math.max(1, style.physics.worldPixelsPerMeter);
    const wheelRadiusM = Math.max(0.05, style.physics.wheelRadiusM);
    const previousEnergy = getCarMechanicalKineticEnergyJ(previous, style);
    const storedEnergyJ = getCarMechanicalKineticEnergyJ(next, style);
    const storedEnergyDeltaJ = storedEnergyJ - previousEnergy;
    const mechanicalReduction = getCarDrivetrainMechanicalReduction(
      style,
      next.drivetrain,
    );
    const mechanics = getCarPowertrainMechanics(style, mechanicalReduction);
    const inputShaftAngularSpeed = (
      next.drivetrain.converterTurbineRpm ?? 0
    ) * Math.PI / 30;
    const inputShaftEnergyJ = 0.5 * mechanics.inputShaftInertiaKgM2
      * inputShaftAngularSpeed * inputShaftAngularSpeed;
    const shaftTwistRadians = next.drivetrain.shaftTwistRadians ?? 0;
    const effectiveShaftTwistRadians = Math.sign(shaftTwistRadians) * Math.max(
      0,
      Math.abs(shaftTwistRadians) - style.physics.drivelineBacklashRadians,
    );
    const shaftPotentialEnergyJ = 0.5 * mechanics.shaftStiffnessNmPerRadian
      * effectiveShaftTwistRadians * effectiveShaftTwistRadians;
    const averageDrivenSurfaceSpeedMps = (
      getCarDrivenWheelSpeed(previous.chassis, style)
        + getCarDrivenWheelSpeed(next.chassis, style)
    ) * 0.5 / pixelsPerMeter;
    const drivelineWorkJ = appliedWheelForceNewtons
      * averageDrivenSurfaceSpeedMps * deltaSeconds;
    const averageCrankRadiansPerSecond = (
      previous.drivetrain.rpm + next.drivetrain.rpm
    ) * 0.5 * Math.PI / 30;
    const combustionWorkJ = Math.max(
      0,
      drivetrain.combustionTorqueNm * averageCrankRadiansPerSecond * deltaSeconds,
    );
    const idleGovernorWorkJ = Math.max(
      0,
      drivetrain.idleGovernorTorqueNm
        * averageCrankRadiansPerSecond * deltaSeconds,
    );
    const pumpingLossJ = Math.max(
      0,
      drivetrain.pumpingTorqueNm * averageCrankRadiansPerSecond * deltaSeconds,
    );
    const clutchSlipLossJ = Math.abs(
      drivetrain.clutchReactionTorqueNm
        * drivetrain.clutchSlipRpm * Math.PI / 30 * deltaSeconds,
    );
    const resistanceLossJ = Math.max(
      0,
      (next.chassis.rollingResistanceLossJ ?? 0)
        + (next.chassis.aerodynamicDragLossJ ?? 0),
    );
    const brakeLossJ = Math.max(0, next.chassis.brakeLossJ ?? 0);
    const nextWheelSpeeds = [
      next.chassis.frontLeftWheelSpeed,
      next.chassis.frontRightWheelSpeed,
      next.chassis.rearLeftWheelSpeed,
      next.chassis.rearRightWheelSpeed,
    ];
    const wheelSpeeds = nextWheelSpeeds;
    const nextSignedSpeed = getCarSignedSpeed(next.chassis);
    const longitudinalForces = [
      next.chassis.frontLeftLongitudinalForce,
      next.chassis.frontRightLongitudinalForce,
      next.chassis.rearLeftLongitudinalForce,
      next.chassis.rearRightLongitudinalForce,
    ];
    const longitudinalSlipLossJ = longitudinalForces.reduce((loss, force, index) => (
      loss + Math.abs(force)
        * Math.abs(wheelSpeeds[index] / pixelsPerMeter - nextSignedSpeed / pixelsPerMeter)
        * deltaSeconds
    ), 0);
    const lateralSpeedMps = Math.abs(
      -next.chassis.velocityX * Math.sin(next.chassis.heading)
        + next.chassis.velocityY * Math.cos(next.chassis.heading),
    ) / pixelsPerMeter;
    const tireSlipLossJ = longitudinalSlipLossJ + [
      next.chassis.frontLeftLateralForce,
      next.chassis.frontRightLateralForce,
      next.chassis.rearLeftLateralForce,
      next.chassis.rearRightLateralForce,
    ].reduce((loss, force) => loss + Math.abs(force) * lateralSpeedMps
      * deltaSeconds, 0);
    const differentialCouplingLossJ = Math.max(
      0,
      next.chassis.differentialCouplingLossJ ?? 0,
    );
    const shaftDampingLossJ = Math.max(0, drivetrain.shaftDampingLossJ);
    const synchronizerLossJ = Math.max(0, drivetrain.synchronizerLossJ);
    const shiftOverlapLossJ = Math.max(0, drivetrain.shiftOverlapLossJ);
    const accountedExternalEnergyJ = combustionWorkJ + idleGovernorWorkJ
      - pumpingLossJ - clutchSlipLossJ - resistanceLossJ
      - brakeLossJ - tireSlipLossJ - contactConstraintLossJ
      - shaftDampingLossJ - synchronizerLossJ - shiftOverlapLossJ - differentialCouplingLossJ;
    energy = {
      balanceResidualJ: storedEnergyDeltaJ - accountedExternalEnergyJ,
      brakeLossJ,
      clutchSlipLossJ,
      combustionWorkJ,
      contactConstraintLossJ,
      differentialCouplingLossJ,
      drivelineWorkJ,
      idleGovernorWorkJ,
      inputShaftEnergyJ,
      pumpingLossJ,
      resistanceLossJ,
      shaftDampingLossJ,
      shaftPotentialEnergyJ,
      shiftOverlapLossJ,
      synchronizerLossJ,
      storedEnergyDeltaJ,
      storedEnergyJ,
      tireSlipLossJ,
    };
  }
  return {
    correctionIterations,
    appliedWheelForceNewtons,
    energy,
    forceResidualNewtons,
    forceResidualRatio: forceResidualNewtons / Math.max(
      36,
      Math.abs(appliedWheelForceNewtons),
      Math.abs(appliedWheelForceNewtons) + forceResidualNewtons,
    ),
  };
}

/**
 * Advance the complete mechanical car through one fixed step. Production and
 * telemetry both use this function so authored handling targets cannot drift
 * away from the actual drivetrain/tire coupling path.
 */
export function stepCarDynamics(
  previous: CarDynamicsState,
  style: CarEngineStyle,
  input: CarDynamicsInput,
): CarDynamicsOutput {
  const engineRunning = input.engineRunning !== false;
  const driverThrottle = advanceCarPedalInput(
    previous.chassis.throttlePedal,
    engineRunning ? input.throttle : 0,
    style.controls.pedals,
    input.deltaSeconds,
  );
  const intentOptions = {
    controls: style.controls,
    opposingPedals: input.opposingPedals,
    parking: input.parking,
    pixelsPerMeter: style.physics.worldPixelsPerMeter,
  };
  const longitudinalTransition = advanceCarLongitudinalControl(
    previous.chassis,
    input.throttle,
    input.deltaSeconds,
    intentOptions,
  );
  const drivetrainInput = (
    candidate: CarChassisState,
    feedbackAmount = 1,
  ) => {
    const blend = (prior: number, next: number) => prior
      + (next - prior) * feedbackAmount;
    const previousFrontCarrierSpeed = (
      previous.chassis.frontLeftWheelSpeed
        + previous.chassis.frontRightWheelSpeed
    ) / 2;
    const candidateFrontCarrierSpeed = (
      candidate.frontLeftWheelSpeed + candidate.frontRightWheelSpeed
    ) / 2;
    const previousRearCarrierSpeed = (
      previous.chassis.rearLeftWheelSpeed
        + previous.chassis.rearRightWheelSpeed
    ) / 2;
    const candidateRearCarrierSpeed = (
      candidate.rearLeftWheelSpeed + candidate.rearRightWheelSpeed
    ) / 2;
    const blendedSteeringAngle = blend(
      previous.chassis.steeringAngle,
      candidate.steeringAngle,
    );
    const frontLoadTotal = Math.max(
      1,
      candidate.frontLeftLoadNewtons + candidate.frontRightLoadNewtons,
    );
    const frontTireDemand = (
      candidate.frontLeftTireDemand * candidate.frontLeftLoadNewtons
        + candidate.frontRightTireDemand * candidate.frontRightLoadNewtons
    ) / frontLoadTotal;
    const lateralAccelerationDemand = Math.abs(candidate.lateralAcceleration)
      / Math.max(1, style.physics.lateralGrip);
    const corneringDemand = Math.max(
      Math.abs(blendedSteeringAngle / style.physics.maximumSteeringAngle) * 0.45,
      frontTireDemand,
      lateralAccelerationDemand,
    );
    return {
      corneringDemand,
      deltaSeconds: input.deltaSeconds,
      drivenAxleAccelerationsMps2: {
        front: blend((
          previous.chassis.frontLeftWheelAcceleration
            + previous.chassis.frontRightWheelAcceleration
        ) / 2, (
          candidate.frontLeftWheelAcceleration
            + candidate.frontRightWheelAcceleration
        ) / 2),
        rear: blend((
          previous.chassis.rearLeftWheelAcceleration
            + previous.chassis.rearRightWheelAcceleration
        ) / 2, (
          candidate.rearLeftWheelAcceleration
            + candidate.rearRightWheelAcceleration
        ) / 2),
      },
      drivenContactForcesNewtons: {
        front: blend(
          previous.chassis.frontLeftLongitudinalForce
            + previous.chassis.frontRightLongitudinalForce,
          candidate.frontLeftLongitudinalForce
            + candidate.frontRightLongitudinalForce,
        ),
        rear: blend(
          previous.chassis.rearLeftLongitudinalForce
            + previous.chassis.rearRightLongitudinalForce,
          candidate.rearLeftLongitudinalForce
            + candidate.rearRightLongitudinalForce,
        ),
      },
      drivenAxleSpeedRatios: {
        front: getCarPageSpeedRatio(style, blend(
          previousFrontCarrierSpeed,
          candidateFrontCarrierSpeed,
        )),
        rear: getCarPageSpeedRatio(style, blend(
          previousRearCarrierSpeed,
          candidateRearCarrierSpeed,
        )),
      },
      drivenWheelSpeedRatio: getCarPageSpeedRatio(
        style,
        blend(
          getCarDrivenWheelSpeed(previous.chassis, style),
          getCarDrivenWheelSpeed(candidate, style),
        ),
      ),
      engagedDirection: longitudinalTransition.engagedDirection,
      propulsionRequested: Math.abs(input.throttle) > 0.02
        && !longitudinalTransition.serviceBraking,
      longitudinalPhase: longitudinalTransition.phase,
      longitudinalContactReactionForceNewtons: blend(
        Number.isFinite(previous.chassis.longitudinalContactReactionForceNewtons)
          ? previous.chassis.longitudinalContactReactionForceNewtons
          : 0,
        Number.isFinite(candidate.longitudinalContactReactionForceNewtons)
          ? candidate.longitudinalContactReactionForceNewtons
          : 0,
      ),
      serviceBrake: longitudinalTransition.serviceBraking,
      signedSpeedRatio: getCarPageSpeedRatio(style, blend(
        getCarSignedSpeed(previous.chassis),
        getCarSignedSpeed(candidate),
      )),
      steering: blendedSteeringAngle / style.physics.maximumSteeringAngle,
      throttle: driverThrottle,
    };
  };
  const chassisInput = (
    wheelForceNewtons: number,
    steeringForcePreview?: CarChassisState,
  ): CarChassisInput => ({
    ...input,
    driverThrottle,
    longitudinalTransition,
    steeringForcePreview,
    wheelForceNewtons: engineRunning ? wheelForceNewtons : 0,
  });

  const predictedMechanical = updateCarDrivetrain(
    previous.drivetrain,
    style,
    drivetrainInput(previous.chassis),
  );
  const predictedChassis = stepCarChassis(
    previous.chassis,
    style,
    chassisInput(predictedMechanical.output.wheelForceNewtons),
  );
  const correctionActive = longitudinalTransition.serviceBraking
    || Math.abs(predictedMechanical.output.wheelForceNewtons) > 1
    || Math.hypot(previous.chassis.velocityX, previous.chassis.velocityY) > 1
    || Math.abs(previous.chassis.steeringAngle) > 0.001
    || Math.abs(input.steering) > 0.001;
  if (!correctionActive) {
    predictedChassis.state.dynamicsCorrectionActive = false;
    const state = {
      chassis: predictedChassis.state,
      drivetrain: predictedMechanical.state,
    };
    return {
      chassis: predictedChassis,
      diagnostics: buildDiagnostics(
        previous,
        state,
        style,
        input.deltaSeconds,
        predictedMechanical.output,
        0,
        0,
        predictedChassis.contactConstraintLossJ,
        input.detailedDiagnostics === true,
      ),
      drivetrain: predictedMechanical.output,
      state,
    };
  }

  const correctedMechanical = updateCarDrivetrain(
    previous.drivetrain,
    style,
    drivetrainInput(
      predictedChassis.state,
      2 / 3,
    ),
  );
  const forceCorrectionMagnitude = Math.abs(
    correctedMechanical.output.wheelForceNewtons
      - predictedMechanical.output.wheelForceNewtons,
  );

  // Once the mechanical system is active, always finish the same predictor /
  // corrector path. Switching back to the predictor at low force changed the
  // applied driveline authority between adjacent steps and caused a visible tug.
  const correctedChassis = stepCarChassis(
    previous.chassis,
    style,
    chassisInput(
      correctedMechanical.output.wheelForceNewtons,
      predictedChassis.state,
    ),
  );
  // Use one deterministic corrector while rolling. Switching between the
  // predictor, first corrector, and an optional verification result changed the
  // applied force authority between adjacent steps and felt like self-tugging.
  const chassis = correctedChassis;
  const mechanical = correctedMechanical;
  const correctionIterations = 1 as const;
  const forceResidualNewtons = forceCorrectionMagnitude;
  chassis.state.dynamicsCorrectionActive = true;
  const state = {
    chassis: chassis.state,
    drivetrain: mechanical.state,
  };
  return {
    chassis,
    diagnostics: buildDiagnostics(
      previous,
      state,
      style,
      input.deltaSeconds,
      mechanical.output,
      forceResidualNewtons,
      correctionIterations,
      chassis.contactConstraintLossJ,
      input.detailedDiagnostics === true,
    ),
    drivetrain: mechanical.output,
    state,
  };
}
