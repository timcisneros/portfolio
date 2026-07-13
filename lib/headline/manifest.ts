import {
    compileRoleRelations,
    type RoleObject,
    type RoleSubject,
    type RoleVerb,
} from './engine';

export type HeadlineManifest = {
    subjects: RoleSubject[];
    verbs: RoleVerb[];
    objects: RoleObject[];
};

export const compileHeadlineManifest = (manifest: HeadlineManifest) => {
    const duplicateIds = (items: Array<{ id: string }>) =>
        items
            .map(({ id }) => id)
            .filter((id, index, all) => all.indexOf(id) !== index);
    const errors = {
        duplicateSubjects: duplicateIds(manifest.subjects),
        duplicateVerbCapabilities: manifest.verbs
            .map(({ id, capability }) => `${capability}\u0000${id}`)
            .filter((id, index, all) => all.indexOf(id) !== index),
        duplicateObjects: duplicateIds(manifest.objects),
    };
    return {
        relations: compileRoleRelations(
            manifest.subjects,
            manifest.verbs,
            manifest.objects
        ),
        errors,
        valid: Object.values(errors).every((values) => values.length === 0),
    };
};
