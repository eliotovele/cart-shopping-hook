import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        const { data: product } = await api.get<Product>(
          `/products/${productId}`
        );
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, { ...product, amount: 1 }]);
          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify([...cart, { ...product, amount: 1 }])
          );
          return;
        }
      }

      if (productInCart) {
        const { data: stock } = await api.get(`stock/${productId}`);
        if (stock.amount > productInCart.amount) {
          const cartUpdated = cart.map(c =>
            c.id === productId ? { ...c, amount: c.amount + 1 } : c
          );
          setCart(cartUpdated);

          localStorage.setItem(
            '@RocketShoes:cart',
            JSON.stringify(cartUpdated)
          );

          return;
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const getProductInCart = cart.some(({ id }) => id === productId);
      if (!getProductInCart) {
        toast.error('Erro na remoção do produto');
        return;
      }
      const cartUpdated = cart.filter(c => c.id !== productId);
      setCart(cartUpdated);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

      if (stock.amount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        const cartUpdated = cart.map(c =>
          c.id === productId ? { ...c, amount } : c
        );
        setCart(cartUpdated);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartUpdated));
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
