import {
    NarrativePlanner,
    type TrajectoryCandidate,
} from './planner';

export const seededRandom = (initialSeed: number) => {
    let seed = initialSeed >>> 0;
    return () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
};

export const runTrajectoryAudit = <T>(
    candidates: TrajectoryCandidate<T>[],
    options: { seeds: number; steps: number }
) => {
    const keys = new Map<string, number>();
    const domains = new Map<string, number>();
    const families = new Map<string, number>();
    let immediateRepeats = 0;

    for (let seed = 1; seed <= options.seeds; seed++) {
        const random = seededRandom(seed);
        const planner = new NarrativePlanner();
        let previous: string | null = null;
        for (let step = 0; step < options.steps; step++) {
            const selected = planner.choose(candidates, random);
            if (selected === null) break;
            const candidate = candidates.find((item) => item.value === selected);
            if (!candidate) continue;
            if (candidate.key === previous) immediateRepeats++;
            previous = candidate.key;
            keys.set(candidate.key, (keys.get(candidate.key) ?? 0) + 1);
            domains.set(
                candidate.domain,
                (domains.get(candidate.domain) ?? 0) + 1
            );
            families.set(
                candidate.family,
                (families.get(candidate.family) ?? 0) + 1
            );
        }
    }

    return {
        totalSelections: [...keys.values()].reduce((sum, count) => sum + count, 0),
        uniqueKeys: keys.size,
        immediateRepeats,
        keyFrequency: Object.fromEntries(keys),
        domainFrequency: Object.fromEntries(domains),
        familyFrequency: Object.fromEntries(families),
    };
};

export type VisualCandidate = {
    key: string;
    line1: string;
    line2: string;
};

export const auditVisualReachability = (
    candidates: VisualCandidate[],
    widths: number[],
    measure: (text: string) => number
) =>
    widths.map((width) => ({
        width,
        unreachable: candidates
            .filter(
                (candidate) =>
                    measure(candidate.line1) > width ||
                    measure(candidate.line2) > width
            )
            .map(({ key }) => key),
    }));
