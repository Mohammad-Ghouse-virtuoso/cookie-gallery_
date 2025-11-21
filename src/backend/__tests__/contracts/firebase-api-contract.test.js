/**
 * API Contract Testing for Firebase Integration
 * 
 * Tests validate that our backend correctly handles Firebase API contracts:
 * - Firestore document structures
 * - Authentication user objects
 * - Collection query responses
 * - Batch write operations
 * 
 * These tests use JSON Schema validation to ensure API responses match expected formats.
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const ajv = new Ajv();
addFormats(ajv);

describe('Firebase API Contract Tests', () => {
  
  describe('Firestore User Document Schema', () => {
    const userDocumentSchema = {
      type: 'object',
      required: ['email', 'createdAt'],
      properties: {
        email: {
          type: 'string',
          format: 'email'
        },
        displayName: {
          oneOf: [
            { type: 'string', minLength: 1 },
            { type: 'null' }
          ]
        },
        phoneNumber: {
          oneOf: [
            { type: 'string', pattern: '^\\+?[0-9]{10,15}$' },
            { type: 'null' }
          ]
        },
        photoURL: {
          oneOf: [
            { type: 'string', format: 'uri' },
            { type: 'null' }
          ]
        },
        createdAt: {
          type: 'object',
          required: ['_seconds', '_nanoseconds'],
          properties: {
            _seconds: { type: 'integer' },
            _nanoseconds: { type: 'integer' }
          }
        },
        updatedAt: {
          type: 'object',
          properties: {
            _seconds: { type: 'integer' },
            _nanoseconds: { type: 'integer' }
          }
        }
      }
    };

    test('validates correct User document structure', () => {
      const mockUser = {
        email: 'test@example.com',
        displayName: 'Test User',
        phoneNumber: '+1234567890',
        photoURL: 'https://example.com/photo.jpg',
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 123456789
        },
        updatedAt: {
          _seconds: 1700100000,
          _nanoseconds: 987654321
        }
      };

      const validate = ajv.compile(userDocumentSchema);
      const valid = validate(mockUser);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates minimal User document', () => {
      const mockUser = {
        email: 'minimal@example.com',
        displayName: null,
        phoneNumber: null,
        photoURL: null,
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(userDocumentSchema);
      const valid = validate(mockUser);
      
      expect(valid).toBe(true);
    });

    test('rejects invalid email format', () => {
      const invalidUser = {
        email: 'not-an-email',
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(userDocumentSchema);
      const valid = validate(invalidUser);
      
      expect(valid).toBe(false);
    });

    test('rejects invalid phone number format', () => {
      const invalidUser = {
        email: 'test@example.com',
        phoneNumber: '123', // Too short
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(userDocumentSchema);
      const valid = validate(invalidUser);
      
      expect(valid).toBe(false);
    });
  });

  describe('Firestore Order Document Schema', () => {
    const orderDocumentSchema = {
      type: 'object',
      required: ['orderId', 'userId', 'items', 'totalAmount', 'currency', 'status', 'createdAt'],
      properties: {
        orderId: {
          type: 'string',
          minLength: 1
        },
        userId: {
          type: 'string',
          format: 'email'
        },
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            required: ['id', 'name', 'quantity', 'price'],
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              quantity: { 
                type: 'integer',
                minimum: 1,
                maximum: 10
              },
              price: { 
                type: 'number',
                minimum: 0
              },
              image: { type: 'string' }
            }
          }
        },
        totalAmount: {
          type: 'number',
          minimum: 0
        },
        currency: {
          type: 'string',
          pattern: '^[A-Z]{3}$'
        },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'completed', 'failed', 'refunded']
        },
        paymentIntentId: {
          type: 'string',
          pattern: '^pi_[A-Za-z0-9]+$'
        },
        paymentMethod: {
          type: 'object',
          properties: {
            brand: { type: 'string' },
            last4: { type: 'string' }
          }
        },
        receiptUrl: {
          oneOf: [
            { type: 'string', format: 'uri' },
            { type: 'null' }
          ]
        },
        shippingAddress: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            line1: { type: 'string' },
            line2: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            postal_code: { type: 'string' },
            country: { type: 'string' }
          }
        },
        createdAt: {
          type: 'object',
          required: ['_seconds', '_nanoseconds'],
          properties: {
            _seconds: { type: 'integer' },
            _nanoseconds: { type: 'integer' }
          }
        },
        updatedAt: {
          type: 'object',
          properties: {
            _seconds: { type: 'integer' },
            _nanoseconds: { type: 'integer' }
          }
        }
      }
    };

    test('validates correct Order document structure', () => {
      const mockOrder = {
        orderId: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB',
        userId: 'user@example.com',
        items: [
          {
            id: 'cookie-1',
            name: 'Chocolate Chip',
            quantity: 2,
            price: 250.00,
            image: 'https://example.com/cookie.jpg'
          }
        ],
        totalAmount: 500.00,
        currency: 'INR',
        status: 'completed',
        paymentIntentId: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB',
        paymentMethod: {
          brand: 'visa',
          last4: '4242'
        },
        receiptUrl: 'https://pay.stripe.com/receipts/abc123',
        shippingAddress: {
          name: 'Test User',
          line1: '123 Main St',
          city: 'Mumbai',
          state: 'Maharashtra',
          postal_code: '400001',
          country: 'IN'
        },
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        },
        updatedAt: {
          _seconds: 1700100000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(orderDocumentSchema);
      const valid = validate(mockOrder);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates all order status values', () => {
      const statuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
      const validate = ajv.compile(orderDocumentSchema);

      statuses.forEach(status => {
        const order = {
          orderId: 'order_123',
          userId: 'user@example.com',
          items: [
            {
              id: 'cookie-1',
              name: 'Cookie',
              quantity: 1,
              price: 100
            }
          ],
          totalAmount: 100,
          currency: 'INR',
          status: status,
          createdAt: {
            _seconds: 1700000000,
            _nanoseconds: 0
          }
        };

        const valid = validate(order);
        expect(valid).toBe(true);
      });
    });

    test('rejects order with invalid quantity', () => {
      const invalidOrder = {
        orderId: 'order_123',
        userId: 'user@example.com',
        items: [
          {
            id: 'cookie-1',
            name: 'Cookie',
            quantity: 15, // Exceeds max of 10
            price: 100
          }
        ],
        totalAmount: 1500,
        currency: 'INR',
        status: 'pending',
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(orderDocumentSchema);
      const valid = validate(invalidOrder);
      
      expect(valid).toBe(false);
    });

    test('rejects empty items array', () => {
      const invalidOrder = {
        orderId: 'order_123',
        userId: 'user@example.com',
        items: [], // Empty array
        totalAmount: 0,
        currency: 'INR',
        status: 'pending',
        createdAt: {
          _seconds: 1700000000,
          _nanoseconds: 0
        }
      };

      const validate = ajv.compile(orderDocumentSchema);
      const valid = validate(invalidOrder);
      
      expect(valid).toBe(false);
    });
  });

  describe('Firebase Auth User Schema', () => {
    const authUserSchema = {
      type: 'object',
      required: ['uid', 'email'],
      properties: {
        uid: {
          type: 'string',
          minLength: 1
        },
        email: {
          type: 'string',
          format: 'email'
        },
        emailVerified: {
          type: 'boolean'
        },
        displayName: {
          oneOf: [
            { type: 'string' },
            { type: 'null' }
          ]
        },
        phoneNumber: {
          oneOf: [
            { type: 'string' },
            { type: 'null' }
          ]
        },
        photoURL: {
          oneOf: [
            { type: 'string', format: 'uri' },
            { type: 'null' }
          ]
        },
        disabled: {
          type: 'boolean'
        },
        metadata: {
          type: 'object',
          properties: {
            creationTime: { type: 'string' },
            lastSignInTime: { type: 'string' }
          }
        },
        providerData: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              uid: { type: 'string' },
              providerId: { type: 'string' },
              email: { type: 'string' },
              displayName: {
                oneOf: [
                  { type: 'string' },
                  { type: 'null' }
                ]
              },
              phoneNumber: {
                oneOf: [
                  { type: 'string' },
                  { type: 'null' }
                ]
              },
              photoURL: {
                oneOf: [
                  { type: 'string' },
                  { type: 'null' }
                ]
              }
            }
          }
        }
      }
    };

    test('validates correct Firebase Auth User structure', () => {
      const mockAuthUser = {
        uid: 'firebase-uid-123',
        email: 'test@example.com',
        emailVerified: true,
        displayName: 'Test User',
        phoneNumber: '+1234567890',
        photoURL: 'https://example.com/photo.jpg',
        disabled: false,
        metadata: {
          creationTime: '2024-01-01T00:00:00.000Z',
          lastSignInTime: '2024-01-15T12:30:00.000Z'
        },
        providerData: [
          {
            uid: 'test@example.com',
            providerId: 'password',
            email: 'test@example.com',
            displayName: 'Test User',
            phoneNumber: null,
            photoURL: null
          }
        ]
      };

      const validate = ajv.compile(authUserSchema);
      const valid = validate(mockAuthUser);
      
      if (!valid) {
        console.error('Validation errors:', validate.errors);
      }
      
      expect(valid).toBe(true);
    });

    test('validates minimal Auth User', () => {
      const mockAuthUser = {
        uid: 'uid-123',
        email: 'minimal@example.com',
        emailVerified: false,
        displayName: null,
        phoneNumber: null,
        photoURL: null,
        disabled: false
      };

      const validate = ajv.compile(authUserSchema);
      const valid = validate(mockAuthUser);
      
      expect(valid).toBe(true);
    });
  });

  describe('Firestore Query Response Schema', () => {
    const queryResponseSchema = {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'data'],
        properties: {
          id: {
            type: 'string',
            minLength: 1
          },
          data: {
            type: 'object'
          },
          exists: {
            type: 'boolean'
          }
        }
      }
    };

    test('validates correct query response', () => {
      const mockQueryResponse = [
        {
          id: 'doc1',
          data: {
            email: 'user1@example.com',
            displayName: 'User 1'
          },
          exists: true
        },
        {
          id: 'doc2',
          data: {
            email: 'user2@example.com',
            displayName: 'User 2'
          },
          exists: true
        }
      ];

      const validate = ajv.compile(queryResponseSchema);
      const valid = validate(mockQueryResponse);
      
      expect(valid).toBe(true);
    });

    test('validates empty query response', () => {
      const mockQueryResponse = [];

      const validate = ajv.compile(queryResponseSchema);
      const valid = validate(mockQueryResponse);
      
      expect(valid).toBe(true);
    });
  });

  describe('Firestore Batch Write Response Schema', () => {
    const batchWriteResponseSchema = {
      type: 'object',
      required: ['writeResults'],
      properties: {
        writeResults: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              updateTime: {
                type: 'object',
                properties: {
                  _seconds: { type: 'integer' },
                  _nanoseconds: { type: 'integer' }
                }
              }
            }
          }
        },
        status: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              code: { type: 'integer' },
              message: { type: 'string' }
            }
          }
        }
      }
    };

    test('validates successful batch write response', () => {
      const mockBatchResponse = {
        writeResults: [
          {
            updateTime: {
              _seconds: 1700000000,
              _nanoseconds: 123456789
            }
          },
          {
            updateTime: {
              _seconds: 1700000001,
              _nanoseconds: 987654321
            }
          }
        ],
        status: [
          { code: 0, message: 'OK' },
          { code: 0, message: 'OK' }
        ]
      };

      const validate = ajv.compile(batchWriteResponseSchema);
      const valid = validate(mockBatchResponse);
      
      expect(valid).toBe(true);
    });
  });

  describe('Backend /save-user Response Contract', () => {
    const saveUserResponseSchema = {
      type: 'object',
      required: ['success', 'message'],
      properties: {
        success: {
          type: 'boolean'
        },
        message: {
          type: 'string',
          minLength: 1
        },
        user: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' },
            displayName: { type: 'string' },
            phoneNumber: { type: 'string' }
          }
        }
      }
    };

    test('validates /save-user success response', () => {
      const mockResponse = {
        success: true,
        message: 'User data saved successfully',
        user: {
          email: 'test@example.com',
          displayName: 'Test User',
          phoneNumber: '+1234567890'
        }
      };

      const validate = ajv.compile(saveUserResponseSchema);
      const valid = validate(mockResponse);
      
      expect(valid).toBe(true);
    });

    test('validates /save-user error response', () => {
      const mockResponse = {
        success: false,
        message: 'Failed to save user data'
      };

      const validate = ajv.compile(saveUserResponseSchema);
      const valid = validate(mockResponse);
      
      expect(valid).toBe(true);
    });
  });

  describe('Backend /save-order-data Response Contract', () => {
    const saveOrderResponseSchema = {
      type: 'object',
      required: ['success', 'message'],
      properties: {
        success: {
          type: 'boolean'
        },
        message: {
          type: 'string',
          minLength: 1
        },
        orderId: {
          type: 'string',
          minLength: 1
        }
      }
    };

    test('validates /save-order-data success response', () => {
      const mockResponse = {
        success: true,
        message: 'Order data saved successfully',
        orderId: 'pi_3QKuznSJ2yYj3bFk0AYjdhjB'
      };

      const validate = ajv.compile(saveOrderResponseSchema);
      const valid = validate(mockResponse);
      
      expect(valid).toBe(true);
    });

    test('validates /save-order-data error response', () => {
      const mockResponse = {
        success: false,
        message: 'Failed to save order data'
      };

      const validate = ajv.compile(saveOrderResponseSchema);
      const valid = validate(mockResponse);
      
      expect(valid).toBe(true);
    });
  });
});
