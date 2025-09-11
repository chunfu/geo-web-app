import { getJson } from 'serpapi';
import { AiOverview, OutputRecord, UserParams } from './types.js';
import { retryWithBackoff } from './utils.js';
import { logger } from '../utils/logger.js';

// Retry mechanism with exponential backoff
// Convert ai_overview text_blocks to markdown format
function convertToMarkdown(aiOverview: AiOverview): string {
  if (!aiOverview || !aiOverview.text_blocks) {
    return 'No AI overview available';
  }

  let markdown = '';

  for (const block of aiOverview.text_blocks) {
    switch (block.type) {
      case 'heading':
        markdown += `## ${block.snippet}\n\n`;
        break;

      case 'paragraph':
        markdown += `${block.snippet}\n\n`;
        break;

      case 'list':
        if (block.list && Array.isArray(block.list)) {
          for (const item of block.list) {
            if (item.title) {
              markdown += `## ${item.title}\n`;
            }
            if (item.snippet) {
              markdown += `${item.snippet}\n\n`;
            }
            // Handle nested lists
            if (item.list && Array.isArray(item.list)) {
              for (const nestedItem of item.list) {
                if (nestedItem.snippet) {
                  markdown += `  - ${nestedItem.snippet}\n`;
                }
              }
              markdown += '\n';
            }
          }
        }
        break;

      case 'expandable':
        if (block.text_blocks) {
          markdown += convertToMarkdown({ text_blocks: block.text_blocks });
        }
        break;

      default:
        if (block.snippet) {
          markdown += `${block.snippet}\n\n`;
        }
        break;
    }
  }

  return markdown.trim();
}

// Function to count how many brand names exist in the AI overview text with support for both simple strings and + aliases
function checkBrandExistenceInText(text: string, brandNames: string[]): number {
  if (!text || !brandNames || brandNames.length === 0) {
    return 0;
  }

  const textLower = text.toLowerCase();

  let matchCount = 0;
  for (const brand of brandNames) {
    if (brand.includes('+')) {
      // Handle brands with aliases (e.g., "google+alphabet")
      const brandAliases = brand
        .split('+')
        .map(alias => alias.trim().toLowerCase());
      const hasAnyAlias = brandAliases.some(alias => textLower.includes(alias));
      if (hasAnyAlias) {
        matchCount++;
      }
    } else {
      // Handle simple brand names (e.g., "apple")
      if (textLower.includes(brand.toLowerCase())) {
        matchCount++;
      }
    }
  }

  return matchCount;
}

// Function to calculate aioBrandCompare
// Returns true if total count of brandNames and competitorBrands >= 2, otherwise false
function calculateAioBrandCompare(
  aiOverviewText: string,
  brandNames: string[],
  competitorBrands: string[]
): boolean {
  if (!aiOverviewText) {
    return false;
  }

  // for own brand, we only need to check if it exists
  const brandNamesCount =
    checkBrandExistenceInText(aiOverviewText, brandNames) > 0 ? 1 : 0;
  const competitorBrandsCount = checkBrandExistenceInText(
    aiOverviewText,
    competitorBrands
  );
  const matchCount = brandNamesCount + competitorBrandsCount;

  return matchCount >= 1;
}

// Function to calculate aioBrandExist
// Returns true if any of brandNames exists in result.ai_overview, otherwise false
function calculateAioBrandExist(
  aiOverviewText: string,
  brandNames: string[]
): boolean {
  if (!aiOverviewText) {
    return false;
  }

  return checkBrandExistenceInText(aiOverviewText, brandNames) > 0;
}

// Make SerpAPI call with pagination handling and retry mechanism
async function getSerpApiResult(
  query: string
): Promise<{ ai_overview?: AiOverview; error?: string }> {
  try {
    // Initial API call with retry mechanism
    const json = await retryWithBackoff(async () => {
      const result = await getJson({
        q: query,
        api_key: process.env.SERPAPI_KEY,
        location_requested: 'Taipei, Taiwan',
        location_used: 'Taipei,Taiwan',
        google_domain: 'google.com.tw',
        hl: 'zh-tw',
        gl: 'tw',
      });

      if (result.error) {
        throw new Error(`SerpAPI error: ${result.error}`);
      }

      return result;
    });

    // Check if ai_overview needs pagination
    if (json.ai_overview && json.ai_overview.page_token) {
      // Make second API call for pagination with retry mechanism
      const paginationJson = await retryWithBackoff(async () => {
        const result = await getJson({
          engine: 'google_ai_overview',
          api_key: process.env.SERPAPI_KEY,
          page_token: json.ai_overview.page_token,
        });

        if (result.error) {
          throw new Error(`SerpAPI pagination error: ${result.error}`);
        }

        return result;
      });

      return paginationJson;
    }

    return json;
  } catch (error) {
    logger.error('searchAndCopyGoogle', '❌ Error in Serpapi', { error });
    throw error;
  }
}

const searchAndCopyGoogle = async ({
  question,
  outputRecord,
  params,
}: {
  question: string;
  outputRecord: OutputRecord;
  params: UserParams;
}) => {
  try {
    logger.info('searchAndCopyGoogle', '🔍 Searching Google Taiwan', {
      question,
    });

    const result = await getSerpApiResult(question);
    logger.info('searchAndCopyGoogle', '✅ Found AI overview from Serpapi', {
      result,
    });

    if (result.ai_overview) {
      logger.info('searchAndCopyGoogle', 'Start processing AI overview');
      const markdownContent = convertToMarkdown(result.ai_overview);
      logger.info('searchAndCopyGoogle', '✅ Converted markdown', {
        markdownContent,
      });
      outputRecord.aio = markdownContent;
      outputRecord.aioBrandCompare = calculateAioBrandCompare(
        markdownContent,
        params.brandNames,
        params.competitorBrands
      )
        ? '是'
        : '否';
      outputRecord.aioBrandExist = calculateAioBrandExist(
        markdownContent,
        params.brandNames
      )
        ? '有'
        : '無';

      logger.info('searchAndCopyGoogle', '🎉 Done processing AI overview', {
        outputRecord,
      });
    } else {
      outputRecord.aio = 'No AI overview found';
      outputRecord.aioBrandCompare = '否';
      outputRecord.aioBrandExist = '無';
      logger.info('searchAndCopyGoogle', '⚠️ No AI overview available', {
        question,
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      logger.error('searchAndCopyGoogle', '❌ Error in Google search', { error: error.message });
    } else {
      logger.error('searchAndCopyGoogle', '❌ Error in Google search', { error: String(error) });
    }
    outputRecord.aio = 'Error during Google search: ' + error.message;
  }
};

export default searchAndCopyGoogle;
