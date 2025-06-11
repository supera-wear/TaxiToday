export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  mode: 'payment' | 'subscription';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'prod_STlRKNp54EV2it',
    priceId: 'price_1RYnujFbnCEGqxgmQiIo1PzH',
    name: 'TaxiToday Rit',
    description: 'Betaal voor uw taxirit met TaxiToday',
    mode: 'payment'
  }
];

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id);
};

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId);
};