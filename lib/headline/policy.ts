export type BehaviorFacet =
    | 'path'
    | 'template'
    | 'operation'
    | 'slot'
    | 'navigation'
    | 'timing';

export type BehaviorCandidate<T extends string> = {
    value: T;
    weight: number;
};

export type TimingProfile = 'crisp' | 'deliberate' | 'exploratory';

export class HeadlineBehaviorPolicy {
    private readonly recent: Record<BehaviorFacet, string[]> = {
        path: [],
        template: [],
        operation: [],
        slot: [],
        navigation: [],
        timing: [],
    };
    private readonly counts: Record<BehaviorFacet, Record<string, number>> = {
        path: {},
        template: {},
        operation: {},
        slot: {},
        navigation: {},
        timing: {},
    };

    constructor(private readonly memorySize = 8) {}

    choose<T extends string>(
        facet: BehaviorFacet,
        candidates: BehaviorCandidate<T>[],
        random: () => number = Math.random
    ): T | null {
        if (!candidates.length) return null;
        const weighted = candidates.map((candidate) => {
            const index = this.recent[facet].indexOf(candidate.value);
            const novelty =
                index < 0 ? 1 : Math.max(0.15, (index + 1) / (this.memorySize + 1));
            const frequency = this.counts[facet][candidate.value] ?? 0;
            return {
                ...candidate,
                effectiveWeight:
                    candidate.weight * novelty * (1 / Math.sqrt(frequency + 1)),
            };
        });
        let roll =
            random() * weighted.reduce((sum, item) => sum + item.effectiveWeight, 0);
        const selected =
            weighted.find((candidate) => {
                roll -= candidate.effectiveWeight;
                return roll <= 0;
            })?.value ?? weighted[weighted.length - 1].value;
        this.record(facet, selected);
        return selected;
    }

    record(facet: BehaviorFacet, value: string) {
        this.recent[facet] = [
            value,
            ...this.recent[facet].filter((item) => item !== value),
        ].slice(0, this.memorySize);
        this.counts[facet][value] = (this.counts[facet][value] ?? 0) + 1;
    }

    chooseTiming(random: () => number = Math.random): TimingProfile {
        return (
            this.choose(
                'timing',
                [
                    { value: 'crisp', weight: 4 },
                    { value: 'deliberate', weight: 3 },
                    { value: 'exploratory', weight: 2 },
                ],
                random
            ) ?? 'crisp'
        );
    }

    snapshot() {
        return {
            recent: Object.fromEntries(
                Object.entries(this.recent).map(([facet, values]) => [facet, [...values]])
            ),
            counts: Object.fromEntries(
                Object.entries(this.counts).map(([facet, counts]) => [facet, { ...counts }])
            ),
        };
    }
}

export const timingDelay = (profile: TimingProfile, base: number) => {
    if (profile === 'crisp') return base * 0.65;
    if (profile === 'exploratory') return base * 1.35;
    return base;
};

export const auditBehaviorDistribution = (
    counts: Record<string, number>,
    maximumShare = 0.75
) => {
    const entries = Object.entries(counts).filter(([, count]) => count > 0);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);
    const [dominantBehavior = '', dominantCount = 0] = entries.sort(
        (a, b) => b[1] - a[1]
    )[0] ?? ['', 0];
    const dominantShare = total ? dominantCount / total : 0;
    return {
        total,
        representedBehaviors: entries.length,
        dominantBehavior,
        dominantShare,
        balanced: entries.length > 1 && dominantShare <= maximumShare,
    };
};
