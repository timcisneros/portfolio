export type CarVector = { x: number; y: number };

export type CarImpactContact = {
  contactOffset?: CarVector;
  /** True only for the first solver frame of a newly established contact. */
  freshImpact?: boolean;
  normal?: CarVector;
  normalImpulse: number;
};

const COLLISION_DEPTH_SCALE = Math.sin(Math.PI / 4);

export type CarImpactBasis = {
  forward: CarVector;
  massKg: number;
  pixelsPerMeter: number;
  right: CarVector;
  trackWidthM: number;
};

export function unprojectCarImpactNormal(normal: CarVector): CarVector {
  const y = normal.y * COLLISION_DEPTH_SCALE;
  const length = Math.hypot(normal.x, y) || 1;
  return { x: normal.x / length, y: y / length };
}

export function unprojectCarImpactVector(vector: CarVector): CarVector {
  return { x: vector.x, y: vector.y / COLLISION_DEPTH_SCALE };
}

export function analyzeCarImpact(
  contacts: readonly CarImpactContact[],
  basis: CarImpactBasis,
) {
  const freshContacts = contacts.filter((contact) => contact.freshImpact !== false);
  const deltaVelocityMps = freshContacts.reduce((sum, contact) => {
    if (!contact.normal) return sum;
    const normal = unprojectCarImpactNormal(contact.normal);
    const deltaSpeed = contact.normalImpulse / Math.max(1, basis.massKg);
    return {
      x: sum.x + normal.x * deltaSpeed,
      y: sum.y + normal.y * deltaSpeed,
    };
  }, { x: 0, y: 0 });
  const longitudinalMps = deltaVelocityMps.x * basis.forward.x
    + deltaVelocityMps.y * basis.forward.y;
  const lateralMps = deltaVelocityMps.x * basis.right.x
    + deltaVelocityMps.y * basis.right.y;
  const longitudinalDominant = Math.abs(longitudinalMps)
    >= Math.abs(lateralMps) * 1.15;
  const totalImpulse = freshContacts.reduce(
    (sum, contact) => sum + contact.normalImpulse,
    0,
  );
  const averageContact = freshContacts.reduce((sum, contact) => {
    const offset = unprojectCarImpactVector(contact.contactOffset ?? { x: 0, y: 0 });
    const weight = contact.normalImpulse / Math.max(0.0001, totalImpulse);
    return { x: sum.x + offset.x * weight, y: sum.y + offset.y * weight };
  }, { x: 0, y: 0 });
  const averageLateralOffset = averageContact.x * basis.right.x
    + averageContact.y * basis.right.y;
  return {
    centeredBumperImpact: longitudinalDominant
      && Math.abs(averageLateralOffset)
        <= basis.trackWidthM * basis.pixelsPerMeter * 0.32,
    contacts: freshContacts,
    lateralMps,
    longitudinalDominant,
    longitudinalMps,
  };
}

export type CarCollisionReconciliationInput = {
  contacts: CarImpactContact[];
  previousDrivenWheelSpeedRatio: number;
  previousYawRate?: number;
};
