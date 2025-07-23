import { OpenAI } from '@langchain/openai';
import { ChromaVectorStore } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';

export const ragConfig = {
  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4o',
    temperature: 0.3,
    maxTokens: 2000,
  },
  
  // Vector Database Configuration
  vectorStore: {
    collectionName: 'icici_credit_cards',
    chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  },
  
  // Embeddings Configuration
  embeddings: {
    model: 'text-embedding-3-large',
    dimensions: 3072,
  },
  
  // Text Splitting Configuration
  textSplitter: {
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  
  // Scraping Configuration
  scraping: {
    baseUrl: 'https://www.icicibank.com',
    creditCardPaths: [
      '/personal-banking/cards/credit-cards',
      '/personal-banking/cards/credit-cards/platinum-chip-credit-card',
      '/personal-banking/cards/credit-cards/coral-credit-card',
      '/personal-banking/cards/credit-cards/rubyx-credit-card',
      '/personal-banking/cards/credit-cards/sapphiro-credit-card',
      '/personal-banking/cards/credit-cards/emeralde-credit-card',
    ],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    timeout: 30000,
  },
};

// Initialize RAG Components
export const initializeRAGComponents = async () => {
  const llm = new OpenAI({
    openAIApiKey: ragConfig.openai.apiKey,
    modelName: ragConfig.openai.model,
    temperature: ragConfig.openai.temperature,
    maxTokens: ragConfig.openai.maxTokens,
  });

  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: ragConfig.openai.apiKey,
    modelName: ragConfig.embeddings.model,
    dimensions: ragConfig.embeddings.dimensions,
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: ragConfig.textSplitter.chunkSize,
    chunkOverlap: ragConfig.textSplitter.chunkOverlap,
  });

  return { llm, embeddings, textSplitter };
};