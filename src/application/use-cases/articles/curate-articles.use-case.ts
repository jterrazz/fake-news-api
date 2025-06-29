import { type LoggerPort } from '@jterrazz/logger';

import { type ArticleCurationAgentPort } from '../../ports/outbound/agents/article-curation.agent.js';
import { type ArticleRepositoryPort } from '../../ports/outbound/persistence/article-repository.port.js';

/**
 * @description
 * This use case is responsible for curating articles that are in the
 * 'PENDING_REVIEW' state. It uses an AI agent to analyze each article
 * and assign it a final publication tier (`STANDARD`, `NICHE`, or `ARCHIVED`).
 */
export class CurateArticlesUseCase {
    constructor(
        private readonly articleCurationAgent: ArticleCurationAgentPort,
        private readonly articleRepository: ArticleRepositoryPort,
        private readonly logger: LoggerPort,
    ) {}

    public async execute(): Promise<void> {
        this.logger.info('Starting article curation process...');

        // In a real application, you would fetch articles with the
        // `PENDING_REVIEW` status from the repository.
        // For now, we are just defining the structure.

        // const articlesToReview = await this.articleRepository.findMany({
        //     where: { publicationTier: 'PENDING_REVIEW' },
        // });
        //
        // for (const article of articlesToReview) {
        //     const result = await this.articleCurationAgent.run({ article });
        //
        //     if (result) {
        //         await this.articleRepository.update(article.id, {
        //             publicationTier: result.publicationTier,
        //         });
        //         this.logger.info(`Article ${article.id} curated as ${result.publicationTier}: ${result.reason}`);
        //     } else {
        //         this.logger.warn(`Failed to curate article ${article.id}`);
        //     }
        // }

        this.logger.info('Article curation process finished.');

        return Promise.resolve();
    }
}
