const graphemeSegmenter =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

const GRAPHEME_CACHE_LIMIT = 256;
const graphemeCache = new Map<string, number[]>();

export const graphemeBoundaries = (text: string): number[] => {
    const cached = graphemeCache.get(text);
    if (cached) return cached;

    let boundaries: number[];
    if (graphemeSegmenter) {
        boundaries = [
            ...Array.from(graphemeSegmenter.segment(text), ({ index }) => index),
            text.length,
        ].filter((value, index, values) => index === 0 || value !== values[index - 1]);
    } else {
        boundaries = [0];
        let offset = 0;
        for (const character of Array.from(text)) {
            offset += character.length;
            boundaries.push(offset);
        }
    }

    if (graphemeCache.size >= GRAPHEME_CACHE_LIMIT) {
        graphemeCache.delete(graphemeCache.keys().next().value!);
    }
    graphemeCache.set(text, boundaries);
    return boundaries;
};

export const previousGraphemeBoundary = (text: string, position: number) => {
    const boundaries = graphemeBoundaries(text);
    return [...boundaries].reverse().find((boundary) => boundary < position) ?? 0;
};

export const nextGraphemeBoundary = (text: string, position: number) =>
    graphemeBoundaries(text).find((boundary) => boundary > position) ?? text.length;

export const normalizeGraphemeRange = (
    text: string,
    start: number,
    end: number
): [number, number] => {
    const boundaries = graphemeBoundaries(text);
    const safeStart =
        [...boundaries].reverse().find((boundary) => boundary <= start) ?? 0;
    const safeEnd = boundaries.find((boundary) => boundary >= end) ?? text.length;
    return [safeStart, safeEnd];
};

const positionAfterDelete = (position: number, deleted: [number, number]) => {
    const [a, b] = deleted;
    if (position <= a) return position;
    if (position >= b) return position - (b - a);
    return a;
};

export const transformRangeAfterDelete = (
    range: [number, number],
    deleted: [number, number]
): [number, number] => {
    const start = positionAfterDelete(range[0], deleted);
    return [
        start,
        Math.max(start, positionAfterDelete(range[1], deleted)),
    ];
};

export type FormattingAffinity = { position: number } | null;

const isWordCharacter = (character: string) => /[\p{L}\p{N}]/u.test(character);

export const expandRangeToWordBoundaries = (
    text: string,
    range: [number, number]
): [number, number] => {
    let [start, end] = range;
    if (start === end) return range;
    while (start < end && !isWordCharacter(text[start] ?? '')) start += 1;
    while (end > start && !isWordCharacter(text[end - 1] ?? '')) end -= 1;
    if (start === end) return [start, end];
    while (start > 0 && isWordCharacter(text[start - 1] ?? '')) start -= 1;
    while (end < text.length && isWordCharacter(text[end] ?? '')) end += 1;
    return [start, end];
};

export const transformFormattedDelete = (
    range: [number, number],
    deleted: [number, number],
    affinity: FormattingAffinity
): { range: [number, number]; affinity: FormattingAffinity } => {
    const nextRange = transformRangeAfterDelete(range, deleted);
    const [deleteStart, deleteEnd] = deleted;
    const consumesFormattedTail =
        deleteStart < range[1] && deleteEnd >= range[1];

    return {
        range: nextRange,
        affinity: consumesFormattedTail
            ? { position: nextRange[1] }
            : affinity
              ? {
                    position: positionAfterDelete(
                        affinity.position,
                        deleted
                    ),
                }
              : null,
    };
};

export const transformFormattedInsert = (
    range: [number, number],
    position: number,
    text: string,
    affinity: FormattingAffinity
): { range: [number, number]; affinity: FormattingAffinity } => {
    const count = text.length;
    let [start, end] = range;
    if (affinity && position === affinity.position) {
        if (/^\s+$/.test(text)) {
            if (start === end) {
                // A selected replacement may include a leading space. Keep the
                // empty formatted insertion point attached to the word after it.
                start += count;
                end += count;
                return {
                    range: [start, end],
                    affinity: { position: affinity.position + count },
                };
            }
            // Whitespace after the replacement word ends formatting affinity.
            return { range: [start, end], affinity: null };
        }
        return {
            range: [start, end + count],
            affinity: { position: affinity.position + count },
        };
    }
    if (position < start) {
        start += count;
        end += count;
    } else if (position >= start && position < end) {
        end += count;
    } else if (
        position === end &&
        end > start &&
        /^[\p{L}\p{N}]+$/u.test(text)
    ) {
        // Appending letters to a formatted word inherits its active style,
        // matching normal text-editor behavior without leaking into spaces.
        end += count;
    }
    return { range: [start, end], affinity };
};
