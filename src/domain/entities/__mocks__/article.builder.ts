import { ArticleCategory } from '../../value-objects/article-category.vo.js';
import { ArticleContent } from '../../value-objects/article-content.vo.js';
import { type ArticleCountry } from '../../value-objects/article-country.vo.js';
import { ArticleFakeStatus } from '../../value-objects/article-fake-status.vo.js';
import { ArticleHeadline } from '../../value-objects/article-headline.vo.js';
import { type ArticleLanguage } from '../../value-objects/article-language.vo.js';
import { ArticleSummary } from '../../value-objects/article-summary.vo.js';
import { Article } from '../article.entity.js';

export function buildTestArticles(
    count: number,
    country: ArticleCountry,
    language: ArticleLanguage,
): Article[] {
    return Array.from({ length: count }, (_, i) =>
        Article.create({
            category: ArticleCategory.create(i % 2 === 0 ? 'POLITICS' : 'TECHNOLOGY'),
            content: ArticleContent.create(
                `This is article ${i + 1} with detailed content about ${i % 2 === 0 ? 'political' : 'technological'} developments. The content discusses various aspects and their potential impacts on society. Multiple perspectives are presented to provide a balanced view.`,
            ),
            country,
            createdAt: new Date(),
            fakeStatus: ArticleFakeStatus.createFake('AI-generated content for testing'),
            headline: ArticleHeadline.create(`Generated Article ${i + 1}`),
            language,
            summary: ArticleSummary.create(`Summary of generated article ${i + 1}`.repeat(10)),
        }),
    );
}
