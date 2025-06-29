import { type LoggerPort } from '@jterrazz/logger';
import { beforeEach, describe, expect, mockOf, test } from '@jterrazz/test';
import { randomUUID } from 'crypto';
import { type DeepMockProxy, mock } from 'vitest-mock-extended';

import { Article } from '../../../../domain/entities/article.entity.js';
import { Authenticity } from '../../../../domain/value-objects/article/authenticity.vo.js';
import { Body } from '../../../../domain/value-objects/article/body.vo.js';
import { Headline } from '../../../../domain/value-objects/article/headline.vo.js';
import { PublicationTier } from '../../../../domain/value-objects/article/publication-tier.vo.js';
import { Category } from '../../../../domain/value-objects/category.vo.js';
import { Country } from '../../../../domain/value-objects/country.vo.js';
import { Language } from '../../../../domain/value-objects/language.vo.js';

import {
    type ArticleClassifierAgentPort,
    type ArticleClassifierResult,
} from '../../../ports/outbound/agents/article-classifier.agent.js';
import { type ArticleRepositoryPort } from '../../../ports/outbound/persistence/article-repository.port.js';

import { ClassifyArticlesUseCase } from '../classify-articles.use-case.js';

describe('ClassifyArticlesUseCase', () => {
    let mockArticleClassifierAgent: DeepMockProxy<ArticleClassifierAgentPort>;
    let mockArticleRepository: DeepMockProxy<ArticleRepositoryPort>;
    let mockLogger: DeepMockProxy<LoggerPort>;
    let useCase: ClassifyArticlesUseCase;

    // Test data
    const articleToReview = new Article({
        // Other properties are not relevant for this test but required by constructor
        authenticity: new Authenticity(false),
        body: new Body('This is a valid article body that is definitely long enough.'),
        category: new Category('technology'),
        country: new Country('us'),
        headline: new Headline('headline'),
        id: randomUUID(),
        language: new Language('en'),
        publicationTier: new PublicationTier('PENDING_REVIEW'),
        publishedAt: new Date(),
    });

    beforeEach(() => {
        mockArticleClassifierAgent = mock<ArticleClassifierAgentPort>();
        mockArticleRepository = mock<ArticleRepositoryPort>();
        mockLogger = mockOf<LoggerPort>();
        useCase = new ClassifyArticlesUseCase(
            mockArticleClassifierAgent,
            mockArticleRepository,
            mockLogger,
        );

        // Default mock implementations
        mockArticleRepository.findMany.mockResolvedValue([articleToReview]);
        mockArticleRepository.update.mockResolvedValue();
    });

    describe('execute', () => {
        test('should classify articles pending review and update their status', async () => {
            // Given
            const classificationResult: ArticleClassifierResult = {
                publicationTier: 'STANDARD',
                reason: 'A solid, well-written article with broad appeal.',
            };
            mockArticleClassifierAgent.run.mockResolvedValue(classificationResult);

            // When
            await useCase.execute();

            // Then
            expect(mockArticleRepository.findMany).toHaveBeenCalledWith({
                limit: 50,
                where: { publicationTier: 'PENDING_REVIEW' },
            });
            expect(mockArticleClassifierAgent.run).toHaveBeenCalledWith({
                article: articleToReview,
            });
            expect(mockArticleRepository.update).toHaveBeenCalledWith(articleToReview.id, {
                publicationTier: 'STANDARD',
            });
            expect(mockLogger.info).toHaveBeenCalledWith(
                `Article ${articleToReview.id} classified as STANDARD: ${classificationResult.reason}`,
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Article classification process finished.',
                {
                    failed: 0,
                    successful: 1,
                    totalReviewed: 1,
                },
            );
        });

        test('should do nothing if no articles are pending review', async () => {
            // Given
            mockArticleRepository.findMany.mockResolvedValue([]);

            // When
            await useCase.execute();

            // Then
            expect(mockArticleClassifierAgent.run).not.toHaveBeenCalled();
            expect(mockArticleRepository.update).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('No articles found pending review.');
        });

        test('should continue processing even if one article fails classification', async () => {
            // Given
            const article2 = new Article({ ...articleToReview, id: randomUUID() });
            mockArticleRepository.findMany.mockResolvedValue([articleToReview, article2]);
            mockArticleClassifierAgent.run
                .mockResolvedValueOnce({
                    publicationTier: 'NICHE',
                    reason: 'Interesting but for a specific audience.',
                })
                .mockResolvedValueOnce(null); // Second article fails

            // When
            await useCase.execute();

            // Then
            expect(mockArticleClassifierAgent.run).toHaveBeenCalledTimes(2);
            // It should update the first article
            expect(mockArticleRepository.update).toHaveBeenCalledWith(articleToReview.id, {
                publicationTier: 'NICHE',
            });
            // It should NOT update the second article
            expect(mockArticleRepository.update).not.toHaveBeenCalledWith(
                article2.id,
                expect.any(Object),
            );
            expect(mockLogger.warn).toHaveBeenCalledWith(
                `Failed to classify article ${article2.id}: AI agent returned null.`,
            );
            // The process should finish with partial success
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Article classification process finished.',
                {
                    failed: 1,
                    successful: 1,
                    totalReviewed: 2,
                },
            );
        });

        test('should handle errors during agent execution gracefully', async () => {
            // Given
            const agentError = new Error('AI agent failed');
            mockArticleClassifierAgent.run.mockRejectedValue(agentError);

            // When
            await useCase.execute();

            // Then
            expect(mockArticleRepository.update).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalledWith(
                `Error classifying article ${articleToReview.id}`,
                { error: agentError },
            );
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Article classification process finished.',
                {
                    failed: 1,
                    successful: 0,
                    totalReviewed: 1,
                },
            );
        });

        test('should throw an error if fetching articles fails', async () => {
            // Given
            const repositoryError = new Error('Database connection failed');
            mockArticleRepository.findMany.mockRejectedValue(repositoryError);

            // When / Then
            await expect(useCase.execute()).rejects.toThrow(repositoryError);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Article classification process failed with an unhandled error.',
                { error: repositoryError },
            );
        });
    });
});
