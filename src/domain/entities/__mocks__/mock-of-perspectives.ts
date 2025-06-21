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
        holisticDigest: generateMockHolisticDigest(index),
        id: crypto.randomUUID(),
        storyId,
        tags: generateMockPerspectiveTags(index),
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
    
    const digestContent = `This is a comprehensive ${perspectiveType} perspective on the story. ` +
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
            expertise_level: 'expert',
            media_type: 'official',
            political_leaning: 'center',
            stakeholder: 'government',
            tone: 'formal'
        },
        {
            expertise_level: 'professional',
            media_type: 'mainstream',
            political_leaning: 'center_left',
            stakeholder: 'opposition',
            tone: 'critical'
        },
        {
            expertise_level: 'expert',
            media_type: 'specialized',
            political_leaning: 'center_right',
            stakeholder: 'business',
            tone: 'analytical'
        },
        {
            expertise_level: 'citizen',
            media_type: 'alternative',
            political_leaning: 'left',
            stakeholder: 'civil_society',
            tone: 'activist'
        },
        {
            expertise_level: 'professional',
            media_type: 'conservative',
            political_leaning: 'right',
            stakeholder: 'business',
            tone: 'supportive'
        },
        {
            expertise_level: 'expert',
            media_type: 'academic',
            political_leaning: 'neutral',
            stakeholder: 'academia',
            tone: 'objective'
        },
    ];
    
    const tags = tagSets[index % tagSets.length];
    return new PerspectiveTags(tags);
} 