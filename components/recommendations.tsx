"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingUp, Heart, Lightbulb, RefreshCw, ShoppingCart, Star, Loader2 } from "lucide-react";
import Image from "next/image";

// Product interface
interface Product {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  originalPrice: number;
  description: string;
  image: string;
  ratings: {
    average: number;
    count: number;
  };
  features: string[];
  inStock: boolean;
  tags: string[];
  brand: string;
}

// Recommendation interface
interface Recommendation {
  productId: string;
  score: number;
  reason: string;
  category: string;
}

interface RecommendationsProps {
  products: Product[];
  userId: string;
  onProductInteraction: (productId: string, interactionType: string) => void;
  onRefreshRecommendations: () => void;
  isLoading?: boolean;
}

export function Recommendations({ 
  products: initialProducts, 
  userId, 
  onProductInteraction,
  onRefreshRecommendations,
  isLoading = false 
}: RecommendationsProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [recommendations, setRecommendations] = useState<{
    personalized: Recommendation[];
    trending: Recommendation[];
    similar: Recommendation[];
  }>({
    personalized: [],
    trending: [],
    similar: []
  });
  // Loading states would be used for individual recommendation sections
  const [loadingStates] = useState({
    personalized: false,
    trending: false,
    similar: false
  });
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [cartItems, setCartItems] = useState<Set<string>>(new Set());

  // Load products if not provided
  useEffect(() => {
    if (initialProducts.length === 0) {
      const loadProducts = async () => {
        try {
          const response = await fetch('/data/products.json');
          if (response.ok) {
            const productsData = await response.json();
            setProducts(productsData);
          }
        } catch (error) {
          console.error('Error loading products:', error);
        }
      };
      loadProducts();
    }
  }, [initialProducts]);

  // Generate recommendations when products are available
  useEffect(() => {
    if (products.length > 0) {
      generateSmartRecommendations();
    }
  }, [products, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const generateSmartRecommendations = () => {
    // Generate smarter recommendations based on product data
    const electronics = products.filter(p => p.category === "Electronics");
    const clothing = products.filter(p => p.category === "Clothing & Shoes");
    const books = products.filter(p => p.category === "Books");
    // const home = products.filter(p => p.category === "Home & Garden");

    // Personalized recommendations - mix of high-rated products from different categories
    const personalizedRecs: Recommendation[] = [
      ...electronics.slice(0, 2).map(p => ({
        productId: p.id,
        score: Math.floor(p.ratings.average * 20),
        reason: `Based on your tech interests - ${p.ratings.average}★ rated with ${p.features[0]}`,
        category: "personalized"
      })),
      ...clothing.slice(0, 1).map(p => ({
        productId: p.id,
        score: Math.floor(p.ratings.average * 18),
        reason: `Popular ${p.brand} ${p.subcategory.toLowerCase()} - great for your style`,
        category: "personalized"
      })),
      ...books.slice(0, 1).map(p => ({
        productId: p.id,
        score: Math.floor(p.ratings.average * 19),
        reason: `Perfect for personal growth - ${p.ratings.count}+ readers loved this`,
        category: "personalized"
      })),
    ];

    // Trending recommendations - highest rated products
    const trendingRecs: Recommendation[] = products
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, 4)
      .map(p => ({
        productId: p.id,
        score: Math.floor(p.ratings.average * 20),
        reason: `${p.ratings.average}★ average with ${p.ratings.count} reviews - currently trending`,
        category: "trending"
      }));

    // Similar product recommendations - products within price range
    const similarRecs: Recommendation[] = products
      .filter(p => p.price > 100 && p.price < 1000)
      .slice(0, 3)
      .map(p => ({
        productId: p.id,
        score: Math.floor(85 + Math.random() * 15),
        reason: `Similar to your browsing history - ${p.brand} ${p.subcategory}`,
        category: "similar"
      }));

    setRecommendations({
      personalized: personalizedRecs,
      trending: trendingRecs,
      similar: similarRecs
    });
  };

  const getProductById = (productId: string): Product | undefined => {
    return products.find(p => p.id === productId);
  };

  const handleInteraction = (productId: string, interactionType: string) => {
    // Update local state for visual feedback
    if (interactionType === 'like') {
      setLikedProducts(prev => {
        const newSet = new Set(prev);
        if (newSet.has(productId)) {
          newSet.delete(productId);
        } else {
          newSet.add(productId);
        }
        return newSet;
      });
    } else if (interactionType === 'cart_add') {
      setCartItems(prev => {
        const newSet = new Set(prev);
        newSet.add(productId);
        return newSet;
      });
    }

    // Call parent callback
    onProductInteraction(productId, interactionType);
    console.log(`✅ ${interactionType} interaction for product ${productId}`);
  };

  const RecommendationCard = ({ 
    recommendation, 
    product 
  }: { 
    recommendation: Recommendation; 
    product: Product 
  }) => (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <Image
            src={product.image}
            alt={product.name}
            width={250}
            height={200}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="text-xs font-medium">
              {Math.round(recommendation.score)}% match
            </Badge>
          </div>
          {product.originalPrice > product.price && (
            <div className="absolute top-2 right-2">
              <Badge variant="destructive" className="text-xs">
                ${(product.originalPrice - product.price).toFixed(0)} OFF
              </Badge>
            </div>
          )}
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant={likedProducts.has(product.id) ? "default" : "secondary"}
              className="h-7 w-7 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction(product.id, "like");
              }}
            >
              <Heart className={`h-3 w-3 ${likedProducts.has(product.id) ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm leading-tight">{product.name}</h4>
              <p className="text-xs text-muted-foreground">{product.brand}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs">{product.ratings.average}</span>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-2">
            {recommendation.reason}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-muted-foreground line-through">
                  ${product.originalPrice}
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant={cartItems.has(product.id) ? "secondary" : "outline"}
              disabled={!product.inStock}
              onClick={() => handleInteraction(product.id, "cart_add")}
              className="h-7 text-xs px-2"
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              {cartItems.has(product.id) ? "Added" : "Add"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RecommendationSection = ({ 
    recommendations: recs, 
    title, 
    icon: Icon,
    description,
    isLoading: sectionLoading
  }: {
    recommendations: Recommendation[];
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    isLoading: boolean;
  }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshRecommendations}
          disabled={sectionLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${sectionLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <p className="text-sm text-muted-foreground">{description}</p>
      
      {sectionLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading recommendations...</span>
        </div>
      ) : recs.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recommendations available.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={generateSmartRecommendations}
            className="mt-2"
          >
            Generate Recommendations
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recs.map((rec) => {
            const product = getProductById(rec.productId);
            if (!product) return null;
            
            return (
              <RecommendationCard
                key={rec.productId}
                recommendation={rec}
                product={product}
              />
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading recommendations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI Recommendations</h1>
        <p className="text-muted-foreground">
          Discover products perfectly matched to your preferences
        </p>
        {(likedProducts.size > 0 || cartItems.size > 0) && (
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {likedProducts.size > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                {likedProducts.size} liked
              </span>
            )}
            {cartItems.size > 0 && (
              <span className="flex items-center gap-1">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                {cartItems.size} in cart
              </span>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="personalized" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="personalized" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            For You
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="similar" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Similar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="space-y-4">
          <RecommendationSection
            recommendations={recommendations.personalized}
            title="Personalized Recommendations"
            icon={Sparkles}
            description="Products curated based on your preferences and browsing history"
            isLoading={loadingStates.personalized}
          />
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <RecommendationSection
            recommendations={recommendations.trending}
            title="Trending Products"
            icon={TrendingUp}
            description="Popular products that are trending right now"
            isLoading={loadingStates.trending}
          />
        </TabsContent>

        <TabsContent value="similar" className="space-y-4">
          <RecommendationSection
            recommendations={recommendations.similar}
            title="Similar Products"
            icon={Lightbulb}
            description="Products similar to what you've been looking at"
            isLoading={loadingStates.similar}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
} 