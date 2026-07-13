export type HeadlineQuality = 'strong' | 'exploratory' | 'supporting';

export type WeightedCandidate<T> = {
    value: T;
    weight: number;
    key?: string;
};

export const weightedChoice = <T>(
    candidates: WeightedCandidate<T>[],
    random: () => number = Math.random
): T | null => {
    if (!candidates.length) return null;
    const total = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let roll = random() * total;
    for (const candidate of candidates) {
        roll -= candidate.weight;
        if (roll <= 0) return candidate.value;
    }
    return candidates[candidates.length - 1].value;
};

export class TrajectoryMemory {
    private recent: string[] = [];

    constructor(private readonly limit = 12) {}

    remember(key: string) {
        this.recent = [key, ...this.recent.filter((item) => item !== key)].slice(
            0,
            this.limit
        );
    }

    noveltyWeight(key: string) {
        const index = this.recent.indexOf(key);
        if (index < 0) return 1;
        return Math.max(0.08, (index + 1) / (this.limit + 1));
    }

    choose<T>(
        candidates: WeightedCandidate<T>[],
        keyOf: (value: T) => string,
        random: () => number = Math.random
    ) {
        const selected = weightedChoice(
            candidates.map((candidate) => {
                const key = candidate.key ?? keyOf(candidate.value);
                return {
                    ...candidate,
                    weight: candidate.weight * this.noveltyWeight(key),
                };
            }),
            random
        );
        if (selected !== null) this.remember(keyOf(selected));
        return selected;
    }

    snapshot() {
        return [...this.recent];
    }
}

export type SemanticRole =
    | 'audience'
    | 'business'
    | 'coordination'
    | 'data'
    | 'decision-support'
    | 'developer'
    | 'friction'
    | 'infrastructure'
    | 'information'
    | 'operations'
    | 'outcome'
    | 'product'
    | 'workflow';

export type RoleSubject = {
    id: string;
    capabilities: string[];
};

export type RoleVerb = {
    id: string;
    capability: string;
    objectRoles: SemanticRole[];
};

export type RoleObject = {
    id: string;
    roles: SemanticRole[];
};

export const compileRoleRelations = (
    subjects: RoleSubject[],
    verbs: RoleVerb[],
    objects: RoleObject[]
) =>
    subjects.flatMap((subject) =>
        verbs.flatMap((verb) =>
            subject.capabilities.includes(verb.capability)
                ? objects
                      .filter((object) =>
                          object.roles.some((role) => verb.objectRoles.includes(role))
                      )
                      .map((object) => ({
                          subject: subject.id,
                          verb: verb.id,
                          object: object.id,
                      }))
                : []
        )
    );
