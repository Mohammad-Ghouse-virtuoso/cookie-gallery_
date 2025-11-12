export type GiftRecipientType =
  | 'mom'
  | 'dad'
  | 'friend'
  | 'girlfriend'
  | 'boyfriend'
  | 'spouse'
  | 'custom';

export type GiftAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  pincode: string;
  landmark: string;
};

export type GiftFormState = {
  recipientType: GiftRecipientType;
  customRecipient: string;
  senderName: string;
  message: string;
  instructions: string;
  showWrappedPreview: boolean;
  address: GiftAddress;
};
