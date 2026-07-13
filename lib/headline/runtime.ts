import {
    simulateEditTransaction,
    type EditOperation,
    type EditTransaction,
} from './edits';

export type RuntimePhase =
    | 'idle'
    | 'planning'
    | 'navigating'
    | 'selecting'
    | 'mutating'
    | 'pausing'
    | 'verifying'
    | 'committed'
    | 'recovering';

export type RuntimeTraceEvent = {
    phase: RuntimePhase;
    operationIndex: number;
    operation: EditOperation | null;
};

export type HeadlineRuntimeAdapter = {
    execute: (operation: EditOperation, done: () => void) => void;
};

export type RuntimeRequest = {
    initialLines: [string, string];
    expectedLines: [string, string];
    operations: EditOperation[];
    onCommit: () => void;
    onRecovery: (transaction: EditTransaction) => void;
};

export type RuntimeCheckpoint = {
    phase: RuntimePhase;
    operationIndex: number;
    paused: boolean;
    cancelled: boolean;
};

const phaseForOperation = (operation: EditOperation): RuntimePhase => {
    if (operation.type === 'move-caret') return 'navigating';
    if (operation.type === 'select-range') return 'selecting';
    if (operation.type === 'pause') return 'pausing';
    if (operation.type === 'commit-semantic-state') return 'verifying';
    return 'mutating';
};

export class HeadlineEditRuntime {
    private phase: RuntimePhase = 'idle';
    private trace: RuntimeTraceEvent[] = [];
    private request: RuntimeRequest | null = null;
    private transaction: EditTransaction | null = null;
    private operationIndex = -1;
    private paused = false;
    private cancelled = false;

    constructor(
        private readonly adapter: HeadlineRuntimeAdapter,
        private readonly onTrace?: (trace: RuntimeTraceEvent[]) => void
    ) {}

    run(request: RuntimeRequest) {
        this.trace = [];
        this.request = request;
        this.paused = false;
        this.cancelled = false;
        this.operationIndex = -1;
        this.record('planning', -1, null);
        const transaction = simulateEditTransaction(
            request.initialLines,
            request.operations,
            request.expectedLines
        );
        this.transaction = transaction;
        if (!transaction.valid) {
            this.record('recovering', -1, null);
            request.onRecovery(transaction);
            return false;
        }

        this.execute(0);
        return true;
    }

    pause() {
        if (this.phase === 'committed' || this.phase === 'recovering') return;
        this.paused = true;
    }

    resume(replayCurrent = true) {
        if (!this.paused || this.cancelled || !this.request) return;
        this.paused = false;
        if (replayCurrent) this.execute(this.operationIndex);
    }

    cancel() {
        if (this.phase === 'committed') return;
        this.cancelled = true;
        this.paused = false;
    }

    checkpoint(): RuntimeCheckpoint {
        return {
            phase: this.phase,
            operationIndex: this.operationIndex,
            paused: this.paused,
            cancelled: this.cancelled,
        };
    }

    private execute(index: number): void {
            const request = this.request;
            const transaction = this.transaction;
            if (!request || !transaction || this.cancelled) return;
            this.operationIndex = index;
            if (this.paused) return;
            const operation = request.operations[index];
            if (!operation) {
                this.record('recovering', index, null);
                request.onRecovery(transaction);
                return;
            }
            this.record(phaseForOperation(operation), index, operation);
            if (operation.type === 'commit-semantic-state') {
                this.record('committed', index, operation);
                request.onCommit();
                return;
            }
            this.adapter.execute(operation, () => this.execute(index + 1));
    }

    snapshot() {
        return { phase: this.phase, trace: [...this.trace] };
    }

    private record(
        phase: RuntimePhase,
        operationIndex: number,
        operation: EditOperation | null
    ) {
        this.phase = phase;
        this.trace.push({ phase, operationIndex, operation });
        this.onTrace?.([...this.trace]);
    }
}
