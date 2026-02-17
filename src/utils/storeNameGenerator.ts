import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

const brandPrefixes = [
    'shop', 'get', 'my', 'the', 'pure', 'neo', 'vibe', 'aura', 'zen',
    'mint', 'silk', 'bold', 'lush', 'nova', 'peak', 'flow', 'glow',
    'urban', 'prime', 'elite', 'spark', 'craft', 'mod', 'base', 'core'
];

const brandSuffixes = [
    'ora', 'lane', 'ly', 'ify', 'zeno', 'hub', 'mart', 'base', 'flow',
    'zone', 'vault', 'grid', 'nest', 'scape', 'wave', 'loom', 'stack',
    'box', 'deck', 'bay', 'port', 'path', 'mark', 'side', 'vista'
];

/**
 * Generates a unique, readable, brand-style store name.
 */
export const generateStoreName = (): string => {
    const name = uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        separator: ' ',
        style: 'capital',
        length: 2,
    });
    return name;
};

/**
 * Generates a unique, URL-safe subdomain from a store name or randomly.
 */
export const generateSubdomain = (): string => {
    // 50/50 chance to use library vs custom brandable string
    if (Math.random() > 0.5) {
        return uniqueNamesGenerator({
            dictionaries: [adjectives, animals],
            separator: '',
            style: 'lowerCase',
            length: 2,
        });
    }

    const prefix = brandPrefixes[Math.floor(Math.random() * brandPrefixes.length)];
    const suffix = brandSuffixes[Math.floor(Math.random() * brandSuffixes.length)];

    return `${prefix}${suffix}`.toLowerCase();
};

/**
 * Combined helper to generate initial store data.
 */
export const generateDefaultStoreData = () => {
    const subdomain = generateSubdomain();
    // Capitalize first letter for the display name
    const name = subdomain.charAt(0).toUpperCase() + subdomain.slice(1);
    return {
        name,
        subdomain,
    };
};
