import { ChromaVectorStore } from '@langchain/community/vectorstores/chroma';
import { Document } from 'langchain/document';
import { initializeRAGComponents, ragConfig } from '../config/rag.config.js';
import { ApiError } from '../utils/ApiError.js';

class VectorStoreService {
  constructor() {
    this.vectorStore = null;
    this.embeddings = null;
    this.textSplitter = null;
  }

  async initialize() {
    try {
      const { embeddings, textSplitter } = await initializeRAGComponents();
      this.embeddings = embeddings;
      this.textSplitter = textSplitter;

      // Initialize ChromaDB vector store
      this.vectorStore = await ChromaVectorStore.fromExistingCollection(
        this.embeddings,
        {
          collectionName: ragConfig.vectorStore.collectionName,
          url: ragConfig.vectorStore.chromaUrl,
        }
      );

      console.log('Vector store initialized successfully');
    } catch (error) {
      console.error('Error initializing vector store:', error);
      throw new ApiError(500, 'Failed to initialize vector store');
    }
  }

  async indexCreditCardData(creditCards) {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      const documents = [];

      for (const card of creditCards) {
        // Create comprehensive document content
        const content = this.createDocumentContent(card);
        
        // Split content into chunks
        const chunks = await this.textSplitter.splitText(content);
        
        // Create documents for each chunk
        for (let i = 0; i < chunks.length; i++) {
          const doc = new Document({
            pageContent: chunks[i],
            metadata: {
              cardName: card.name,
              url: card.url,
              chunkIndex: i,
              totalChunks: chunks.length,
              scrapedAt: card.scrapedAt,
              type: 'credit_card',
            },
          });
          documents.push(doc);
        }
      }

      // Add documents to vector store
      await this.vectorStore.addDocuments(documents);
      
      console.log(`Successfully indexed ${documents.length} document chunks for ${creditCards.length} credit cards`);
      return { success: true, documentsIndexed: documents.length };
    } catch (error) {
      console.error('Error indexing credit card data:', error);
      throw new ApiError(500, 'Failed to index credit card data');
    }
  }

  createDocumentContent(card) {
    const sections = [
      `Credit Card: ${card.name}`,
      `Description: ${card.description}`,
      `Features: ${card.features.join(', ')}`,
      `Eligibility Criteria: ${card.eligibility.join(', ')}`,
      `Rewards: ${card.rewards.join(', ')}`,
      `Benefits: ${card.benefits.join(', ')}`,
      `Fees: ${JSON.stringify(card.fees)}`,
      `Interest Rates: ${JSON.stringify(card.interestRates)}`,
      `URL: ${card.url}`,
    ];

    return sections.filter(section => section.split(': ')[1]).join('\n\n');
  }

  async searchSimilarCards(query, k = 5) {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      const results = await this.vectorStore.similaritySearch(query, k);
      return results;
    } catch (error) {
      console.error('Error searching similar cards:', error);
      throw new ApiError(500, 'Failed to search credit cards');
    }
  }

  async searchWithScore(query, k = 5, scoreThreshold = 0.7) {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      const results = await this.vectorStore.similaritySearchWithScore(query, k);
      
      // Filter results by score threshold
      const filteredResults = results.filter(([doc, score]) => score >= scoreThreshold);
      
      return filteredResults.map(([doc, score]) => ({
        document: doc,
        score: score,
      }));
    } catch (error) {
      console.error('Error searching with score:', error);
      throw new ApiError(500, 'Failed to search credit cards with score');
    }
  }

  async deleteCollection() {
    try {
      if (!this.vectorStore) {
        await this.initialize();
      }

      // Note: ChromaDB collection deletion would need to be implemented
      // based on the specific ChromaDB client being used
      console.log('Collection deletion requested');
      return { success: true };
    } catch (error) {
      console.error('Error deleting collection:', error);
      throw new ApiError(500, 'Failed to delete collection');
    }
  }
}

export default VectorStoreService;