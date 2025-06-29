import { type LoggerPort } from '@jterrazz/logger';

import { type ArticleClassifierAgentPort } from '../../ports/outbound/agents/article-classifier.agent.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

/**
 * @description
 * This use case is responsible for classifying articles that are in the
 * 'PENDING_REVIEW' state. It uses an AI agent to analyze each article
 * and assign it a final publication tier (`STANDARD`, `NICHE`, or `ARCHIVED`).
 */
export class ClassifyArticlesUseCase {
    constructor(
        private readonly articleClassifierAgent: ArticleClassifierAgentPort,
        private readonly articleRepository: ArticleRepositoryPort,
        private readonly logger: LoggerPort,
    ) {}

    public async execute(): Promise<void> {
        this.logger.info('Starting article classification process...');
        let classifiedCount = 0;
        let failedCount = 0;

        try {
            const articlesToReview = await this.articleRepository.findMany({
                limit: 50, // Process in batches
                where: { publicationTier: 'PENDING_REVIEW' },
            });

            if (articlesToReview.length === 0) {
                this.logger.info('No articles found pending review.');
                return;
            }

            this.logger.info(`Found ${articlesToReview.length} articles to classify.`);

            for (const article of articlesToReview) {
                try {
                    const result = await this.articleClassifierAgent.run({ article });

                    if (result) {
                        await this.articleRepository.update(article.id, {
                            publicationTier: result.publicationTier,
                        });
                        this.logger.info(
                            `Article ${article.id} classified as ${result.publicationTier}: ${result.reason}`,
                        );
                        classifiedCount++;
                    } else {
                        this.logger.warn(
                            `Failed to classify article ${article.id}: AI agent returned null.`,
                        );
                        failedCount++;
                    }
                } catch (error) {
                    this.logger.error(`Error classifying article ${article.id}`, { error });
                    failedCount++;
                }
            }
        } catch (error) {
            this.logger.error('Article classification process failed with an unhandled error.', {
                error,
            });
            throw error;
        }

        this.logger.info('Article classification process finished.', {
            failed: failedCount,
            successful: classifiedCount,
            totalReviewed: classifiedCount + failedCount,
        });
    }
}
