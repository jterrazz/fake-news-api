import { z } from 'zod/v4';

import { Category } from '../value-objects/category.vo.js';
import { Country } from '../value-objects/country.vo.js';

import { Perspective } from './perspective.entity.js';

export const storySchema = z.object({
    category: z.instanceof(Category),
    countries: z.array(z.instanceof(Country)).min(1, 'At least one country is required'),
    createdAt: z.date(),
    dateline: z.date(),
    id: z.uuid(),
    perspectives: z.array(z.instanceof(Perspective)).min(1, 'At least one perspective is required'),
    sourceReferences: z
        .array(z.string())
        .min(1, 'At least one external source reference is required'),
    title: z.string().min(1, 'Story title cannot be empty'),
    updatedAt: z.date(),
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
    public readonly title: string;
    public readonly updatedAt: Date;

    public constructor(data: StoryProps) {
        const result = storySchema.safeParse(data);

        if (!result.success) {
            throw new Error(`Invalid story data: ${result.error.message}`);
        }

        const validatedData = result.data;
        this.id = validatedData.id;
        this.title = validatedData.title;
        this.category = validatedData.category;
        this.countries = validatedData.countries;
        this.perspectives = validatedData.perspectives;
        this.dateline = validatedData.dateline;
        this.sourceReferences = validatedData.sourceReferences;
        this.createdAt = validatedData.createdAt;
        this.updatedAt = validatedData.updatedAt;
    }

    public getCountryCodes(): string[] {
        return this.countries.map((country) => country.toString());
    }

    public getPerspectiveCount(): number {
        return this.perspectives.length;
    }
}
