import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI with API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Product interface
interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number;
  description: string;
  features: string[];
  tags: string[];
  brand: string;
  ratings: {
    average: number;
    count: number;
  };
}

// User interaction interface
interface UserInteraction {
  productId: string;
  interactionType: 'view' | 'like' | 'purchase' | 'cart_add' | 'wishlist_add';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// User behavior analysis interface
interface UserAnalysis {
  intent: string;
  categoryStrength: number;
  brandLoyalty: number;
  priceSensitivity: number;
  topFeatures: string[];
  behaviorPatterns: string[];
}

// User preference interface
interface UserPreference {
  userId: string;
  preferredCategories: string[];
  preferredBrands: string[];
  priceRange: [number, number];
  preferredFeatures: string[];
  interactionHistory: UserInteraction[];
}

// Recommendation interface
interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  category: string;
}

/**
 * AI-powered recommendation service using Gemini API
 */
export class AIRecommendationService {
  private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  /**
   * Generate personalized product recommendations for a user
   * @param userId - User ID
   * @param products - All available products
   * @param userPreferences - User preferences and interaction history
   * @param maxRecommendations - Maximum number of recommendations to return
   * @returns Array of recommended products with scores and reasons
   */
  async generateRecommendations(
    userId: string,
    products: Product[],
    userPreferences: UserPreference,
    maxRecommendations: number = 10
  ): Promise<Recommendation[]> {
    try {
      // Analyze user behavior and preferences
      const userAnalysis = await this.analyzeUserBehavior(userPreferences);
      
      // Get content-based recommendations
      const contentRecommendations = await this.getContentBasedRecommendations(
        products,
        userPreferences,
        userAnalysis
      );
      
      // Get collaborative filtering recommendations
      const collaborativeRecommendations = await this.getCollaborativeRecommendations(
        products,
        userPreferences,
        userAnalysis
      );
      
      // Combine and rank recommendations
      const combinedRecommendations = await this.combineAndRankRecommendations(
        contentRecommendations,
        collaborativeRecommendations,
        userAnalysis
      );
      
      return combinedRecommendations.slice(0, maxRecommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Fall back to simple category-based recommendations
      return this.getFallbackRecommendations(products, userPreferences, maxRecommendations);
    }
  }
  
  /**
   * Analyze user behavior patterns using Gemini AI
   */
  private async analyzeUserBehavior(userPreferences: UserPreference): Promise<UserAnalysis> {
    const recentInteractions = userPreferences.interactionHistory
      .slice(-20) // Get last 20 interactions
      .map(interaction => ({
        type: interaction.interactionType,
        timestamp: interaction.timestamp,
        productId: interaction.productId
      }));
    
    const prompt = `
      Analyze the following user behavior data and provide insights:
      
      User Preferences:
      - Preferred Categories: ${userPreferences.preferredCategories.join(', ')}
      - Preferred Brands: ${userPreferences.preferredBrands.join(', ')}
      - Price Range: $${userPreferences.priceRange[0]} - $${userPreferences.priceRange[1]}
      - Preferred Features: ${userPreferences.preferredFeatures.join(', ')}
      
      Recent Interactions:
      ${recentInteractions.map(i => `- ${i.type} on product ${i.productId} at ${i.timestamp}`).join('\n')}
      
      Please analyze this data and provide:
      1. Primary shopping intent (browsing, specific purchase, comparing products)
      2. Category preferences strength (1-10 scale)
      3. Brand loyalty level (1-10 scale)
      4. Price sensitivity (1-10 scale)
      5. Feature importance ranking
      6. Shopping behavior patterns
      
      Format your response as JSON with these fields:
      {
        "intent": "string",
        "categoryStrength": number,
        "brandLoyalty": number,
        "priceSensitivity": number,
        "topFeatures": ["string"],
        "behaviorPatterns": ["string"]
      }
    `;
    
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }
    
    // Return default analysis if parsing fails
    return {
      intent: "browsing",
      categoryStrength: 5,
      brandLoyalty: 5,
      priceSensitivity: 5,
      topFeatures: userPreferences.preferredFeatures.slice(0, 3),
      behaviorPatterns: ["general_browsing"]
    };
  }
  
  /**
   * Get content-based recommendations using product similarity
   */
  private async getContentBasedRecommendations(
    products: Product[],
    userPreferences: UserPreference,
    userAnalysis: UserAnalysis
  ): Promise<Recommendation[]> {
    // Get products the user has interacted with
    const interactedProductIds = userPreferences.interactionHistory.map(i => i.productId);
    const interactedProducts = products.filter(p => interactedProductIds.includes(p.id));
    
    if (interactedProducts.length === 0) {
      return [];
    }
    
    // Create product similarity analysis prompt
    const prompt = `
      Based on these products the user has interacted with:
      ${interactedProducts.map(p => `
        - ${p.name} (${p.category}/${p.subcategory})
        - Brand: ${p.brand}
        - Price: $${p.price}
        - Features: ${p.features.join(', ')}
        - Description: ${p.description}
      `).join('\n')}
      
      From this catalog of available products:
      ${products.filter(p => !interactedProductIds.includes(p.id))
        .slice(0, 50) // Limit for API efficiency
        .map(p => `
          ID: ${p.id}
          Name: ${p.name}
          Category: ${p.category}/${p.subcategory}
          Brand: ${p.brand}
          Price: $${p.price}
          Features: ${p.features.join(', ')}
          Tags: ${p.tags.join(', ')}
          Description: ${p.description}
        `).join('\n')}
      
      User Analysis:
      - Shopping Intent: ${userAnalysis.intent}
      - Category Strength: ${userAnalysis.categoryStrength}/10
      - Brand Loyalty: ${userAnalysis.brandLoyalty}/10
      - Price Sensitivity: ${userAnalysis.priceSensitivity}/10
      - Top Features: ${userAnalysis.topFeatures.join(', ')}
      
      Please recommend 15 products that are most similar to the user's preferences.
      Consider:
      1. Product category and subcategory similarity
      2. Brand preferences and loyalty
      3. Price range compatibility
      4. Feature overlap
      5. Description and tag similarity
      
      Format response as JSON array:
      [
        {
          "productId": "string",
          "score": number (0-100),
          "reason": "string explaining why this product is recommended",
          "category": "content_based"
        }
      ]
    `;
    
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing content-based recommendations:', error);
    }
    
    return [];
  }
  
  /**
   * Get collaborative filtering recommendations
   */
  private async getCollaborativeRecommendations(
    products: Product[],
    userPreferences: UserPreference,
    userAnalysis: UserAnalysis
  ): Promise<Recommendation[]> {
    // For now, simulate collaborative filtering with category and brand patterns
    const prompt = `
      Based on user behavior patterns and preferences:
      
      User Profile:
      - Categories: ${userPreferences.preferredCategories.join(', ')}
      - Brands: ${userPreferences.preferredBrands.join(', ')}
      - Price Range: $${userPreferences.priceRange[0]} - $${userPreferences.priceRange[1]}
      - Shopping Intent: ${userAnalysis.intent}
      - Behavior Patterns: ${userAnalysis.behaviorPatterns.join(', ')}
      
      Product Catalog (sample):
      ${products.slice(0, 30).map(p => `
        ID: ${p.id}
        Name: ${p.name}
        Category: ${p.category}
        Brand: ${p.brand}
        Price: $${p.price}
        Rating: ${p.ratings.average}
        Features: ${p.features.join(', ')}
      `).join('\n')}
      
      Using collaborative filtering logic, recommend products that:
      1. Are popular in the user's preferred categories
      2. Have high ratings and reviews
      3. Are from trending brands in their price range
      4. Match current shopping patterns
      5. Are complementary to their likely purchases
      
      Format response as JSON array:
      [
        {
          "productId": "string",
          "score": number (0-100),
          "reason": "string explaining the collaborative reasoning",
          "category": "collaborative"
        }
      ]
    `;
    
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing collaborative recommendations:', error);
    }
    
    return [];
  }
  
  /**
   * Combine and rank recommendations from different sources
   */
  private async combineAndRankRecommendations(
    contentRecommendations: Recommendation[],
    collaborativeRecommendations: Recommendation[],
    userAnalysis: UserAnalysis
  ): Promise<Recommendation[]> {
    // Combine recommendations and remove duplicates
    const allRecommendations = [...contentRecommendations, ...collaborativeRecommendations];
    const uniqueRecommendations = allRecommendations.filter(
      (rec, index, self) => self.findIndex(r => r.productId === rec.productId) === index
    );
    
    // Use AI to rank the combined recommendations
    const prompt = `
      Rank these product recommendations based on the user analysis:
      
      User Analysis:
      - Intent: ${userAnalysis.intent}
      - Category Strength: ${userAnalysis.categoryStrength}/10
      - Brand Loyalty: ${userAnalysis.brandLoyalty}/10
      - Price Sensitivity: ${userAnalysis.priceSensitivity}/10
      - Top Features: ${userAnalysis.topFeatures.join(', ')}
      
      Recommendations to rank:
      ${uniqueRecommendations.map(rec => `
        Product ID: ${rec.productId}
        Source: ${rec.category}
        Score: ${rec.score}
        Reason: ${rec.reason}
      `).join('\n')}
      
      Please rank these recommendations from best to worst, adjusting scores based on:
      1. User's shopping intent
      2. Personal preferences strength
      3. Recommendation source reliability
      4. Reason quality and relevance
      
      Return the same JSON array but reordered and with updated scores:
      [
        {
          "productId": "string",
          "score": number (0-100),
          "reason": "string",
          "category": "string"
        }
      ]
    `;
    
    const result = await this.model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing ranked recommendations:', error);
    }
    
    // Fall back to simple score-based ranking
    return uniqueRecommendations.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Fallback recommendations when AI fails
   */
  private getFallbackRecommendations(
    products: Product[],
    userPreferences: UserPreference,
    maxRecommendations: number
  ): Recommendation[] {
    const interactedProductIds = userPreferences.interactionHistory.map(i => i.productId);
    const availableProducts = products.filter(p => !interactedProductIds.includes(p.id));
    
    // Simple category-based recommendations
    const categoryRecommendations = availableProducts
      .filter(p => userPreferences.preferredCategories.includes(p.category))
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, maxRecommendations)
      .map(p => ({
        productId: p.id,
        score: p.ratings.average * 20, // Convert 5-star to 100-point scale
        reason: `Recommended based on your interest in ${p.category}`,
        category: 'fallback'
      }));
    
    return categoryRecommendations;
  }
  
  /**
   * Get trending products across categories
   */
  async getTrendingProducts(products: Product[], maxResults: number = 10): Promise<Recommendation[]> {
    const prompt = `
      Analyze these products and identify trending items based on:
      - High ratings and review counts
      - Popular categories
      - Competitive pricing
      - Modern features
      
      Products:
      ${products.slice(0, 50).map(p => `
        ID: ${p.id}
        Name: ${p.name}
        Category: ${p.category}
        Price: $${p.price}
        Rating: ${p.ratings.average} (${p.ratings.count} reviews)
        Features: ${p.features.join(', ')}
      `).join('\n')}
      
      Return top ${maxResults} trending products as JSON:
      [
        {
          "productId": "string",
          "score": number (0-100),
          "reason": "string explaining why it's trending",
          "category": "trending"
        }
      ]
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error getting trending products:', error);
    }
    
    // Fallback to high-rated products
    return products
      .sort((a, b) => (b.ratings.average * Math.log(b.ratings.count + 1)) - 
                     (a.ratings.average * Math.log(a.ratings.count + 1)))
      .slice(0, maxResults)
      .map(p => ({
        productId: p.id,
        score: p.ratings.average * 20,
        reason: `Trending due to high rating (${p.ratings.average}) and ${p.ratings.count} reviews`,
        category: 'trending'
      }));
  }
  
  /**
   * Get similar products to a specific product
   */
  async getSimilarProducts(
    targetProduct: Product,
    allProducts: Product[],
    maxResults: number = 5
  ): Promise<Recommendation[]> {
    const prompt = `
      Find products similar to this target product:
      
      Target Product:
      Name: ${targetProduct.name}
      Category: ${targetProduct.category}/${targetProduct.subcategory}
      Brand: ${targetProduct.brand}
      Price: $${targetProduct.price}
      Features: ${targetProduct.features.join(', ')}
      Description: ${targetProduct.description}
      
      Available Products:
      ${allProducts
        .filter(p => p.id !== targetProduct.id)
        .slice(0, 30)
        .map(p => `
          ID: ${p.id}
          Name: ${p.name}
          Category: ${p.category}/${p.subcategory}
          Brand: ${p.brand}
          Price: $${p.price}
          Features: ${p.features.join(', ')}
          Description: ${p.description}
        `).join('\n')}
      
      Find the ${maxResults} most similar products considering:
      1. Same or related category
      2. Similar features
      3. Comparable price range
      4. Brand compatibility
      5. Use case similarity
      
      Return as JSON array:
      [
        {
          "productId": "string",
          "score": number (0-100),
          "reason": "string explaining similarity",
          "category": "similar"
        }
      ]
    `;
    
    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error getting similar products:', error);
    }
    
    // Fallback to category-based similarity
    return allProducts
      .filter(p => p.id !== targetProduct.id && 
                   p.category === targetProduct.category)
      .sort((a, b) => Math.abs(a.price - targetProduct.price) - 
                     Math.abs(b.price - targetProduct.price))
      .slice(0, maxResults)
      .map(p => ({
        productId: p.id,
        score: 80 - Math.abs(p.price - targetProduct.price) / 10,
        reason: `Similar ${p.category} product from ${p.brand}`,
        category: 'similar'
      }));
  }
}

// Export singleton instance
export const aiRecommendationService = new AIRecommendationService(); 