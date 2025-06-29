import { HolisticDigest } from '../../value-objects/perspective/holistic-digest.vo.js';
import { PerspectiveTags } from '../../value-objects/perspective/perspective-tags.vo.js';
import { Perspective } from '../perspective.entity.js';

/**
 * Creates an array of mock perspectives for a given story
 */
export function mockPerspectives(count: number, storyId: string): Perspective[] {
    return Array.from({ length: count }, (_, index) => createMockPerspective(index, storyId));
}

/**
 * Creates a single mock perspective with the given parameters
 */
function createMockPerspective(index: number, storyId: string): Perspective {
    return new Perspective({
        createdAt: new Date(),
        holisticDigest: new HolisticDigest(
            `This is a detailed and complete holistic digest for perspective number ${index + 1}. It contains a comprehensive compilation of all information related to this specific viewpoint, including every argument, fact, and piece of evidence presented. This text is intentionally long to satisfy the minimum length validation requirements of the domain value object and to provide a realistic piece of text for testing purposes.`,
        ),
        id: crypto.randomUUID(),
        storyId,
        tags: new PerspectiveTags({
            stance: index % 2 === 0 ? 'critical' : 'supportive',
        }),
        updatedAt: new Date(),
    });
}

/**
 * Generates mock holistic digest content based on perspective type
 */
function generateMockHolisticDigest(index: number): HolisticDigest {
    const perspectiveTypes = [
        'government',
        'opposition',
        'mainstream_media',
        'alternative_media',
        'business',
        'academic',
    ];

    const perspectiveType = perspectiveTypes[index % perspectiveTypes.length];

    const digestContent =
        `This is a comprehensive ${perspectiveType} perspective on the story. ` +
        `The narrative includes detailed analysis from this specific viewpoint, incorporating ` +
        `all relevant facts, context, and interpretation that would be typical of ${perspectiveType} ` +
        `sources. This holistic digest contains structured information that an AI can use to ` +
        `understand the complete picture from this particular angle, including key stakeholders, ` +
        `implications, and the broader context of the development.`;

    return new HolisticDigest(digestContent);
}

/**
 * Generates mock perspective tags based on index
 */
function generateMockPerspectiveTags(index: number): PerspectiveTags {
    const tagSets = [
        {
            discourse_type: 'mainstream' as const,
            stance: 'supportive' as const,
        },
        {
            discourse_type: 'alternative' as const,
            stance: 'critical' as const,
        },
        {
            discourse_type: 'mainstream' as const,
            stance: 'optimistic' as const,
        },
        {
            discourse_type: 'underreported' as const,
            stance: 'concerned' as const,
        },
        {
            discourse_type: 'alternative' as const,
            stance: 'mixed' as const,
        },
        {
            discourse_type: 'dubious' as const,
            stance: 'skeptical' as const,
        },
        {
            discourse_type: 'mainstream' as const,
            stance: 'neutral' as const,
        },
    ];

    const tags = tagSets[index % tagSets.length];
    return new PerspectiveTags(tags);
}
