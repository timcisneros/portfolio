import { weightedChoice, type HeadlineQuality } from './engine';

export type HeadlineDomain =
    | 'automation'
    | 'data'
    | 'developer'
    | 'experience'
    | 'operations'
    | 'product';

export type ConstructionFamily =
    | 'counterfactual'
    | 'question'
    | 'reflection'
    | 'stance'
    | 'statement';

export type Energy = 'quiet' | 'curious' | 'playful' | 'concrete';
export type ConceptualDistance = 'near' | 'medium' | 'far';

export type TrajectoryCandidate<T> = {
    value: T;
    key: string;
    subject: string;
    verb: string;
    object: string;
    domain: HeadlineDomain;
    family: ConstructionFamily;
    quality: HeadlineQuality;
    energy: Energy;
    surprise: number;
    concepts: string[];
};

const QUALITY_WEIGHT: Record<HeadlineQuality, number> = {
    strong: 4,
    exploratory: 3,
    supporting: 1,
};

const ENERGY_CYCLE: Energy[] = ['concrete', 'curious', 'playful', 'quiet'];
const DISTANCE_CYCLE: ConceptualDistance[] = ['near', 'medium', 'far', 'near'];

export class NarrativePlanner {
    private recent = new Map<string, string[]>();
    private energyIndex = 0;
    private surpriseSpent = 0;
    private lastDomain: HeadlineDomain | null = null;
    private lastConcepts: string[] = [];

    constructor(
        private readonly memoryLimit = 10,
        private readonly surpriseBudget = 1.4
    ) {}

    private novelty(facet: string, value: string) {
        const values = this.recent.get(facet) ?? [];
        const index = values.indexOf(value);
        if (index < 0) return 1;
        return Math.max(0.1, (index + 1) / (this.memoryLimit + 1));
    }

    private remember(facet: string, value: string) {
        const values = this.recent.get(facet) ?? [];
        this.recent.set(
            facet,
            [value, ...values.filter((item) => item !== value)].slice(
                0,
                this.memoryLimit
            )
        );
    }

    score<T>(candidate: TrajectoryCandidate<T>) {
        const desiredEnergy = ENERGY_CYCLE[this.energyIndex % ENERGY_CYCLE.length];
        const desiredDistance = DISTANCE_CYCLE[this.energyIndex % DISTANCE_CYCLE.length];
        const novelty = [
            this.novelty('key', candidate.key),
            this.novelty('subject', candidate.subject),
            this.novelty('verb', candidate.verb),
            this.novelty('object', candidate.object),
            this.novelty('domain', candidate.domain),
            this.novelty('family', candidate.family),
        ].reduce((score, value) => score * Math.sqrt(value), 1);
        const energy = candidate.energy === desiredEnergy ? 1.8 : 1;
        const surpriseRoom = Math.max(0.15, this.surpriseBudget - this.surpriseSpent);
        const surprise = candidate.surprise <= surpriseRoom ? 1.25 : 0.35;
        const overlap = candidate.concepts.some((concept) =>
            this.lastConcepts.includes(concept)
        );
        const distance: ConceptualDistance =
            this.lastDomain === null ||
            (candidate.domain === this.lastDomain && !overlap)
                ? 'medium'
                : candidate.domain === this.lastDomain && overlap
                  ? 'near'
                  : 'far';
        const distanceWeight = distance === desiredDistance ? 1.55 : 1;
        return (
            QUALITY_WEIGHT[candidate.quality] *
            novelty *
            energy *
            surprise *
            distanceWeight
        );
    }

    choose<T>(
        candidates: TrajectoryCandidate<T>[],
        random: () => number = Math.random
    ) {
        const selected = weightedChoice(
            candidates.map((candidate) => ({
                value: candidate,
                weight: this.score(candidate),
            })),
            random
        );
        if (!selected) return null;
        this.observe(selected);
        return selected.value;
    }

    observe<T>(candidate: TrajectoryCandidate<T>) {
        this.remember('key', candidate.key);
        this.remember('subject', candidate.subject);
        this.remember('verb', candidate.verb);
        this.remember('object', candidate.object);
        this.remember('domain', candidate.domain);
        this.remember('family', candidate.family);
        this.energyIndex = (this.energyIndex + 1) % ENERGY_CYCLE.length;
        this.lastDomain = candidate.domain;
        this.lastConcepts = candidate.concepts;
        this.surpriseSpent = Math.max(
            0,
            this.surpriseSpent * 0.55 + candidate.surprise
        );
    }

    snapshot() {
        return {
            energy: ENERGY_CYCLE[this.energyIndex % ENERGY_CYCLE.length],
            distance:
                DISTANCE_CYCLE[this.energyIndex % DISTANCE_CYCLE.length],
            surpriseSpent: this.surpriseSpent,
            recent: Object.fromEntries(this.recent),
        };
    }
}

export type Relation = { subject: string; verb: string; object: string };

export const analyzeRelationGraph = (relations: Relation[]) => {
    const degree = (field: keyof Relation) => {
        const counts = new Map<string, number>();
        for (const relation of relations) {
            counts.set(relation[field], (counts.get(relation[field]) ?? 0) + 1);
        }
        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    };
    const subjects = degree('subject');
    const verbs = degree('verb');
    const objects = degree('object');
    const average = relations.length / Math.max(1, subjects.length);
    return {
        relationCount: relations.length,
        subjectDegrees: subjects,
        verbDegrees: verbs,
        objectDegrees: objects,
        subjectHubs: subjects.filter(([, count]) => count > average * 2),
        underconnectedSubjects: subjects.filter(([, count]) => count < 2),
    };
};
