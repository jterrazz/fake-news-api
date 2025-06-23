import { z } from 'zod/v4';

import { Category } from '../value-objects/category.vo.js';
import { Country } from '../value-objects/country.vo.js';

import { Perspective } from './perspective.entity.js';

export const synopsisSchema = z
    .string()
    .describe(
        'Synopsis is a concise, information-dense summary capturing essential facts, key actors, and core narrative in ~50 words. In this template: "Tesla CEO Musk acquires Twitter ($44B, Oct 2022), fires executives, adds $8 verification fee, restores suspended accounts, triggers advertiser exodus (GM, Pfizer), 75% staff cuts, sparks free speech vs. safety debate."',
    );

export const storySchema = z.object({
    category: z.instanceof(Category).describe('The primary category classification of the story.'),
    countries: z
        .array(z.instanceof(Country))
        .min(1, 'At least one country is required')
        .describe('A list of countries where the story is relevant.'),
    createdAt: z.date().describe('The timestamp when the story was first created in the system.'),
    dateline: z
        .date()
        .describe('The publication date of the story, typically based on the source articles.'),
    id: z.uuid().describe('The unique identifier for the story.'),
    perspectives: z
        .array(z.instanceof(Perspective))
        .min(1, 'At least one perspective is required')
        .describe('A list of different viewpoints or angles on the story.'),
    sourceReferences: z
        .array(z.string())
        .min(1, 'At least one external source reference is required')
        .describe('A list of IDs from the original source articles used to create the story.'),
    synopsis: synopsisSchema,
    updatedAt: z.date().describe('The timestamp when the story was last updated.'),
});

export type StoryProps = z.input<typeof storySchema>;

/**
 * @description Represents a news story in the timeline of events
 */
export class Story {
    public readonly category: Category;
    public readonly countries: Country[];
    public readonly createdAt: Date;
    public readonly dateline: Date;
    public readonly id: string;
    public readonly perspectives: Perspective[];
    public readonly sourceReferences: string[];
    public readonly synopsis: string;
    public readonly updatedAt: Date;

    public constructor(data: StoryProps) {
        const result = storySchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid story data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.id = validatedData.id;
        this.synopsis = validatedData.synopsis;
        this.category = validatedData.category;
        this.perspectives = validatedData.perspectives;
        this.dateline = validatedData.dateline;
        this.sourceReferences = validatedData.sourceReferences;
        this.createdAt = validatedData.createdAt;
        this.updatedAt = validatedData.updatedAt;

        // Normalize countries: if 'global' is present, it should be the only country.
        if (
            validatedData.countries.some((country) => country.isGlobal()) &&
            validatedData.countries.length > 1
        ) {
            this.countries = [new Country('global')];
        } else {
            this.countries = validatedData.countries;
        }
    }

    public getCountryCodes(): string[] {
        return this.countries.map((country) => country.toString());
    }

    public getPerspectiveCount(): number {
        return this.perspectives.length;
    }
}
