import type { GiftAddress, GiftRecipientType } from './giftExperience';

export type CartGiftDetails = {
  boxKey: string;
  boxTitle: string;
  senderName: string;
  recipientType: GiftRecipientType;
  recipientName: string;
  message: string;
  instructions: string;
  address: GiftAddress;
};

export type CartLineItemDetail = {
  type: 'cookie' | 'gift';
  name: string;
  price: number;
  image?: string;
  productId?: string;
  gift?: CartGiftDetails;
};

export type CartStateWithMeta = Record<string, number> & {
  _meta?: Record<string, CartLineItemDetail>;
};
