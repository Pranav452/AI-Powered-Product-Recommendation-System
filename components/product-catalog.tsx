"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Star, Heart, ShoppingCart, Eye, Loader2 } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import { interactionTracker } from '@/lib/interaction-tracker';

// Product interface based on our JSON structure
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
  sizes?: string[];
  author?: string;
}

interface ProductCatalogProps {
  onProductInteraction: (productId: string, interactionType: string) => void;
  userId?: string;
}

// Fallback products in case JSON fails to load
const fallbackProducts: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro",
    category: "Electronics",
    subcategory: "Smartphones",
    price: 999.99,
    originalPrice: 1099.99,
    description: "The iPhone 15 Pro features the powerful A17 Pro chip, professional camera system with 3x telephoto zoom, and titanium design.",
    image: "https://images.unsplash.com/photo-1592286968481-d7b5b5b7e1c0?w=500&h=500&fit=crop",
    ratings: { average: 4.8, count: 2547 },
    features: ["A17 Pro chip", "48MP camera", "Titanium design", "5G connectivity"],
    inStock: true,
    tags: ["apple", "smartphone", "premium", "photography"],
    brand: "Apple"
  },
  {
    id: "2",
    name: "Samsung Galaxy S24 Ultra",
    category: "Electronics",
    subcategory: "Smartphones",
    price: 1199.99,
    originalPrice: 1299.99,
    description: "Samsung's flagship smartphone with S Pen, 200MP camera, and Galaxy AI features.",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&h=500&fit=crop",
    ratings: { average: 4.7, count: 1823 },
    features: ["S Pen included", "200MP camera", "Galaxy AI", "5000mAh battery"],
    inStock: true,
    tags: ["samsung", "smartphone", "premium", "productivity"],
    brand: "Samsung"
  },
  {
    id: "3",
    name: "MacBook Pro 14-inch M3",
    category: "Electronics",
    subcategory: "Laptops",
    price: 1999.99,
    originalPrice: 2199.99,
    description: "The MacBook Pro with M3 chip delivers exceptional performance for professionals.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
    ratings: { average: 4.9, count: 1456 },
    features: ["M3 chip", "14-inch Liquid Retina XDR", "22-hour battery", "16GB RAM"],
    inStock: true,
    tags: ["apple", "laptop", "professional", "performance"],
    brand: "Apple"
  },
  {
    id: "4",
    name: "Sony WH-1000XM5 Headphones",
    category: "Electronics",
    subcategory: "Audio",
    price: 399.99,
    originalPrice: 449.99,
    description: "Industry-leading noise canceling headphones with exceptional sound quality.",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
    ratings: { average: 4.6, count: 3241 },
    features: ["Active Noise Canceling", "30-hour battery", "Multipoint connection", "Quick charge"],
    inStock: true,
    tags: ["sony", "headphones", "noise-canceling", "premium"],
    brand: "Sony"
  },
  {
    id: "5",
    name: "Nike Air Max 270",
    category: "Clothing & Shoes",
    subcategory: "Sneakers",
    price: 150.00,
    originalPrice: 180.00,
    description: "Lifestyle sneaker with large Air unit in the heel for all-day comfort.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
    ratings: { average: 4.4, count: 5632 },
    features: ["Air Max technology", "Breathable mesh", "Durable rubber sole", "Iconic design"],
    inStock: true,
    tags: ["nike", "sneakers", "comfort", "lifestyle"],
    brand: "Nike",
    sizes: ["7", "8", "9", "10", "11", "12"]
  }
];

export function ProductCatalog({ onProductInteraction }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("All");
  const [priceRange] = useState<[number, number]>([0, 3000]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedProducts, setLikedProducts] = useState<Set<string>>(new Set());
  const [cartItems, setCartItems] = useState<Set<string>>(new Set());

  // Load products from JSON file
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/data/products.json');
        if (!response.ok) {
          throw new Error(`Failed to load products: ${response.status}`);
        }
        
        const productsData = await response.json();
        
        if (!Array.isArray(productsData) || productsData.length === 0) {
          throw new Error('Invalid products data format');
        }
        
        setProducts(productsData);
        setFilteredProducts(productsData);
        console.log('✅ Products loaded successfully:', productsData.length, 'products');
      } catch (err) {
        console.error('❌ Error loading products:', err);
        setError(err instanceof Error ? err.message : 'Failed to load products');
        
        // Use fallback products
        setProducts(fallbackProducts);
        setFilteredProducts(fallbackProducts);
        console.log('🔄 Using fallback products:', fallbackProducts.length, 'products');
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Get unique categories and subcategories
  const categories = useMemo(() => {
    const cats = products.map(p => p.category);
    return ["All", ...Array.from(new Set(cats))];
  }, [products]);

  // Subcategories calculation (currently unused in UI)
  // const subcategories = useMemo(() => {
  //   if (selectedCategory === "All") {
  //     const subcats = products.map(p => p.subcategory);
  //     return ["All", ...Array.from(new Set(subcats))];
  //   }
  //   const subcats = products
  //     .filter(p => p.category === selectedCategory)
  //     .map(p => p.subcategory);
  //   return ["All", ...Array.from(new Set(subcats))];
  // }, [products, selectedCategory]);

  // Filter and sort products
  useEffect(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Apply subcategory filter
    if (selectedSubcategory !== "All") {
      filtered = filtered.filter(product => product.subcategory === selectedSubcategory);
    }

    // Apply price range filter
    filtered = filtered.filter(product => 
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        case "rating":
          return b.ratings.average - a.ratings.average;
        case "name":
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredProducts(filtered);
  }, [products, searchQuery, selectedCategory, selectedSubcategory, priceRange, sortBy]);

  // Handle product interactions with visual feedback
  const handleInteraction = async (productId: string, interactionType: 'view' | 'like' | 'purchase' | 'cart_add' | 'wishlist_add') => {
    try {
      // Update local state immediately for visual feedback
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

      // Track interaction
      await interactionTracker.trackInteraction({
        productId,
        interactionType,
        userId: 'anonymous',
        sessionId: 'current_session',
        metadata: {
          category: products.find(p => p.id === productId)?.category,
          price: products.find(p => p.id === productId)?.price,
          searchQuery: searchQuery || undefined,
        }
      });
      
      // Call the parent callback if provided
      if (onProductInteraction) {
        onProductInteraction(productId, interactionType);
      }

      // Show success message
      console.log(`✅ ${interactionType} interaction recorded for product ${productId}`);
      
    } catch (error) {
      console.error('❌ Error tracking interaction:', error);
    }
  };

  const ProductCard = ({ product }: { product: Product }) => (
    <Card className="group hover:shadow-lg transition-shadow duration-300 cursor-pointer">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <Image
            src={product.image}
            alt={product.name}
            width={300}
            height={300}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            onLoad={() => handleInteraction(product.id, "view")}
          />
          <div className="absolute top-2 right-2 flex gap-1">
            {product.originalPrice > product.price && (
              <Badge variant="destructive" className="text-xs">
                ${(product.originalPrice - product.price).toFixed(0)} OFF
              </Badge>
            )}
            {!product.inStock && (
              <Badge variant="outline" className="text-xs">
                Out of Stock
              </Badge>
            )}
          </div>
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant={likedProducts.has(product.id) ? "default" : "secondary"}
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction(product.id, "like");
              }}
            >
              <Heart className={`h-4 w-4 ${likedProducts.has(product.id) ? 'fill-current' : ''}`} />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                handleInteraction(product.id, "view");
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
              <p className="text-sm text-muted-foreground">{product.brand}</p>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="text-sm">{product.ratings.average}</span>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
          
          <div className="flex flex-wrap gap-1">
            {product.features.slice(0, 2).map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
            {product.features.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{product.features.length - 2} more
              </Badge>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">${product.price}</span>
              {product.originalPrice > product.price && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.originalPrice}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={!product.inStock}
                onClick={() => handleInteraction(product.id, "cart_add")}
                className={cartItems.has(product.id) ? "bg-green-50 border-green-200" : ""}
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                {cartItems.has(product.id) ? "Added" : "Add"}
              </Button>
              <Button
                size="sm"
                disabled={!product.inStock}
                onClick={() => handleInteraction(product.id, "purchase")}
              >
                Buy Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading products...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Product Catalog</h1>
        <p className="text-muted-foreground">
          Discover our curated collection of premium products
        </p>
        {error && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
            {error} (Using sample products)
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-32">
                <Filter className="h-4 w-4 mr-2" />
                {selectedCategory}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categories.map((category) => (
                <DropdownMenuItem
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setSelectedSubcategory("All");
                  }}
                >
                  {category}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="min-w-32">
                Sort: {sortBy === "name" ? "Name" : 
                       sortBy === "price-low" ? "Price ↑" : 
                       sortBy === "price-high" ? "Price ↓" : "Rating"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("name")}>Name</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-low")}>Price: Low to High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price-high")}>Price: High to Low</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>Rating</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </p>
        {(likedProducts.size > 0 || cartItems.size > 0) && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
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

      {/* Product Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setSelectedSubcategory("All");
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
} 