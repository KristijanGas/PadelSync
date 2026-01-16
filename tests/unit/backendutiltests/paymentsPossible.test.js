require('dotenv').config();
process.env.NODE_ENV = 'test'; // NODE_ENV mora biti test prije require

const Stripe = require('stripe');
jest.mock('stripe');

const stripeMockInstance = {
  accounts: {
    retrieve: jest.fn()
  }
};
Stripe.mockImplementation(() => stripeMockInstance);

const { checkStripeAccount } = require('../../../backendutils/paymentsPossible');

describe('checkStripeAccount', () => {
  beforeEach(() => {
    Stripe.mockClear();
    stripeMockInstance.accounts.retrieve.mockReset();
  });

  it('returns false if user has no stripeId (PadelGrom)', async () => {
    const result = await checkStripeAccount('PadelGrom');
    expect(result).toBe(false);
  });

  it('returns false if stripe account has no permissions (anje.m2004)', async () => {
    stripeMockInstance.accounts.retrieve.mockResolvedValue({
      charges_enabled: false,
      payouts_enabled: false
    });

    const result = await checkStripeAccount('anje.m2004');
    expect(result).toBe(false);
    expect(stripeMockInstance.accounts.retrieve).toHaveBeenCalled();
  });

  it('returns true if stripe account has all permissions (andela.milanovic)', async () => {
    stripeMockInstance.accounts.retrieve.mockResolvedValue({
      charges_enabled: true,
      payouts_enabled: true
    });

    const result = await checkStripeAccount('andela.milanovic');
    expect(result).toBe(true);
    expect(stripeMockInstance.accounts.retrieve).toHaveBeenCalled();
  });

  it('returns false when stripe is not configured', async () => {
    process.env.STRIPE_SECRET_KEY = ''; // simuliraj da nema key-a
    const result = await checkStripeAccount('andela.milanovic');
    expect(result).toBe(false);
  });
});