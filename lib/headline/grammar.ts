export type VerbForms = {
    base: string;
    third?: string;
    past?: string;
    gerund?: string;
};

const consonantY = /[^aeiou]y$/i;

export const thirdPerson = ({ base, third }: VerbForms) => {
    if (third) return third;
    if (consonantY.test(base)) return `${base.slice(0, -1)}ies`;
    if (/(s|sh|ch|x|z|o)$/i.test(base)) return `${base}es`;
    return `${base}s`;
};

export const pastTense = ({ base, past }: VerbForms) => {
    if (past) return past;
    if (base.endsWith('e')) return `${base}d`;
    if (consonantY.test(base)) return `${base.slice(0, -1)}ied`;
    return `${base}ed`;
};

export const gerund = ({ base, gerund }: VerbForms) => {
    if (gerund) return gerund;
    if (base.endsWith('ie')) return `${base.slice(0, -2)}ying`;
    if (base.endsWith('e') && !base.endsWith('ee')) return `${base.slice(0, -1)}ing`;
    return `${base}ing`;
};

export const lowerSubject = (subject: string) =>
    /^[A-Z]{2,}s?$/.test(subject)
        ? subject
        : `${subject[0].toLowerCase()}${subject.slice(1)}`;
