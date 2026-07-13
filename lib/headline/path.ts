export type SemanticPathNode<T> = {
    value: T;
    key: string;
    concepts: string[];
    valid: boolean;
};

const overlap = (a: string[], b: string[]) => {
    const right = new Set(b);
    return a.filter((concept) => right.has(concept)).length;
};

export const planSemanticPath = <T>(
    source: SemanticPathNode<T>,
    target: SemanticPathNode<T>,
    candidates: SemanticPathNode<T>[],
    maxStates = 3
): SemanticPathNode<T>[] => {
    if (!source.valid || !target.valid) return [];
    if (maxStates < 3) return [source, target];
    const bridge = candidates
        .filter(
            (candidate) =>
                candidate.valid &&
                candidate.key !== source.key &&
                candidate.key !== target.key
        )
        .map((candidate) => ({
            candidate,
            score:
                overlap(source.concepts, candidate.concepts) +
                overlap(candidate.concepts, target.concepts),
        }))
        .filter(({ score }) => score >= 2)
        .sort((a, b) => b.score - a.score || a.candidate.key.localeCompare(b.candidate.key))[0]
        ?.candidate;
    return bridge ? [source, bridge, target] : [source, target];
};

export type SemanticDependency =
    | 'mode'
    | 'subject'
    | 'agreement'
    | 'verb'
    | 'object'
    | 'punctuation'
    | 'emphasis';

const DEPENDENCIES: Partial<Record<SemanticDependency, SemanticDependency[]>> = {
    agreement: ['subject'],
    object: ['verb'],
    punctuation: ['mode'],
    emphasis: ['subject', 'verb', 'object'],
};

export const orderSemanticDependencies = (
    changed: SemanticDependency[]
): SemanticDependency[] => {
    const requested = new Set(changed);
    const result: SemanticDependency[] = [];
    const visiting = new Set<SemanticDependency>();
    const visit = (dependency: SemanticDependency) => {
        if (result.includes(dependency) || visiting.has(dependency)) return;
        visiting.add(dependency);
        for (const prerequisite of DEPENDENCIES[dependency] ?? []) {
            if (requested.has(prerequisite)) visit(prerequisite);
        }
        visiting.delete(dependency);
        result.push(dependency);
    };
    changed.forEach(visit);
    return result;
};

export type CaretAnchorSlot =
    | 'subject'
    | 'connector'
    | 'modal'
    | 'verb'
    | 'object'
    | 'punctuation'
    | 'emphasis'
    | 'construction';

export type CaretNavigationMode = 'arrow' | 'word-jump' | 'direct';

export type CaretAnchor = {
    slot: CaretAnchorSlot;
    line: 1 | 2;
    start: number;
    end: number;
};

export class CaretAnchorMemory {
    private anchor: CaretAnchor | null = null;
    private recentModes: CaretNavigationMode[] = [];

    plan(
        next: CaretAnchor,
        caret: { line: 1 | 2; position: number }
    ): CaretNavigationMode {
        const distance = caret.line === next.line
            ? Math.abs(caret.position - next.start)
            : Infinity;
        let mode: CaretNavigationMode;
        if (
            this.anchor?.slot === next.slot &&
            caret.line === next.line &&
            distance <= 10
        ) {
            mode = 'arrow';
        } else if (caret.line === next.line && distance <= 22) {
            mode = 'word-jump';
        } else {
            mode = 'direct';
        }
        this.anchor = { ...next };
        this.recentModes = [
            mode,
            ...this.recentModes.filter((item) => item !== mode),
        ].slice(0, 3);
        return mode;
    }

    snapshot() {
        return {
            anchor: this.anchor ? { ...this.anchor } : null,
            recentModes: [...this.recentModes],
        };
    }
}
