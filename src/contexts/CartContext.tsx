import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { CartItem, Product } from '@/types';

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, variant: { color: string; size: string }, quantity: number) => void;
    removeFromCart: (productId: string, variant: { color: string; size: string }) => void;
    updateQuantity: (productId: string, variant: { color: string; size: string }, quantity: number) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};

interface CartProviderProps {
    children: ReactNode;
    subdomain: string;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children, subdomain }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);

    // Load cart from localStorage on mount or subdomain change
    useEffect(() => {
        if (!subdomain) return;
        const savedCart = localStorage.getItem(`cart_${subdomain}`);
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (err) {
                console.error('Failed to parse cart:', err);
                setCart([]);
            }
        } else {
            setCart([]);
        }
    }, [subdomain]);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (!subdomain) return;
        localStorage.setItem(`cart_${subdomain}`, JSON.stringify(cart));
    }, [cart, subdomain]);

    const addToCart = (product: Product, variant: { color: string; size: string }, quantity: number) => {
        setCart((prevCart) => {
            const existingIndex = prevCart.findIndex(
                (item) =>
                    item.productId === product.id &&
                    item.variant.color === variant.color &&
                    item.variant.size === variant.size
            );

            if (existingIndex >= 0) {
                const newCart = [...prevCart];
                newCart[existingIndex].quantity += quantity;
                toast.success(`Updated ${product.name} quantity`);
                return newCart;
            } else {
                toast.success(`Added ${product.name} to cart`);
                return [
                    ...prevCart,
                    {
                        productId: product.id,
                        product,
                        quantity,
                        variant,
                    },
                ];
            }
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (productId: string, variant: { color: string; size: string }) => {
        setCart((prevCart) =>
            prevCart.filter(
                (item) =>
                    !(
                        item.productId === productId &&
                        item.variant.color === variant.color &&
                        item.variant.size === variant.size
                    )
            )
        );
    };

    const updateQuantity = (productId: string, variant: { color: string; size: string }, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId, variant);
            return;
        }

        setCart((prevCart) =>
            prevCart.map((item) =>
                item.productId === productId &&
                    item.variant.color === variant.color &&
                    item.variant.size === variant.size
                    ? { ...item, quantity }
                    : item
            )
        );
    };

    const clearCart = () => {
        setCart([]);
        if (subdomain) {
            localStorage.setItem(`cart_${subdomain}`, JSON.stringify([]));
        }
    };

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + (item.product.price || 0) * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartCount,
                cartTotal,
                isCartOpen,
                setIsCartOpen,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};
