import { ArticleContent } from '../../value-objects/article/content.vo.js';
import { ArticleFakeStatus } from '../../value-objects/article/fake-status.vo.js';
import { ArticleHeadline } from '../../value-objects/article/headline.vo.js';
import { ArticleSummary } from '../../value-objects/article/summary.vo.js';
import { Category } from '../../value-objects/category.vo.js';
import { type Country } from '../../value-objects/country.vo.js';
import { type Language } from '../../value-objects/language.vo.js';
import { Article } from '../article.entity.js';

export function buildTestArticles(count: number, country: Country, language: Language): Article[] {
    return Array.from({ length: count }, (_, i) =>
        Article.create({
            category: Category.create(i % 2 === 0 ? 'POLITICS' : 'TECHNOLOGY'),
            content: ArticleContent.create(
                `This is article ${i + 1} with detailed content about ${i % 2 === 0 ? 'political' : 'technological'} developments. The content discusses various aspects and their potential impacts on society. Multiple perspectives are presented to provide a balanced view.`,
            ),
            country,
            createdAt: new Date(),
            fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
            headline: ArticleHeadline.create(`Generated Article ${i + 1}`),
            id: crypto.randomUUID(),
            language,
            publishedAt: new Date(),
            summary: ArticleSummary.create(`Summary of generated article ${i + 1}`.repeat(10)),
        }),
    );
}
