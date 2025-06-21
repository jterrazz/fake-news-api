import { Category } from '../../value-objects/category.vo.js';
import { Country } from '../../value-objects/country.vo.js';
import { Story } from '../story.entity.js';

/**
 * Creates an array of mock stories for testing purposes
 */
export function mockStories(count: number): Story[] {
    return Array.from({ length: count }, (_, index) => createMockStory(index));
}

/**
 * Creates a single mock story with the given parameters
 */
function createMockStory(index: number): Story {
    return new Story({
        category: getMockStoryCategory(index),
        countries: getMockCountries(index),
        createdAt: new Date(),
        dateline: new Date(Date.now() - index * 24 * 60 * 60 * 1000), // Each story is a day older
        id: crypto.randomUUID(),
        sourceReferences: generateMockSourceReferences(index),
        title: `Mock Story ${index + 1}: ${getMockStoryTitle(index)}`,
        updatedAt: new Date(),
    });
}

/**
 * Generates mock source reference UUIDs
 */
function generateMockSourceReferences(index: number): string[] {
    const sourceCount = (index % 3) + 1; // 1 to 3 sources per story
    return Array.from({ length: sourceCount }, () => crypto.randomUUID());
}

/**
 * Generates mock country objects for stories
 */
function getMockCountries(index: number): Country[] {
    const countryGroups = [
        ['us'],
        ['fr'],
        ['us', 'fr'],
        ['global'], // Worldwide stories
        ['global'], // More global stories for variety
    ];
    const countryCodes = countryGroups[index % countryGroups.length];
    return countryCodes.map(code => new Country(code));
}

/**
 * Determines the category for a story based on its index
 */
function getMockStoryCategory(index: number): Category {
    const categories = ['politics', 'technology', 'business', 'science', 'world'] as const;
    const categoryName = categories[index % categories.length];
    return new Category(categoryName);
}

/**
 * Generates mock story titles based on category
 */
function getMockStoryTitle(index: number): string {
    const titles = [
        'Government Announces New Policy',
        'Tech Giant Launches Revolutionary Product',
        'Economic Indicators Show Growth',
        'Scientific Breakthrough in Medicine',
        'International Summit Concludes',
        'Market Volatility Continues',
        'Climate Agreement Reached',
        'Security Measures Enhanced',
    ];
    return titles[index % titles.length];
} 