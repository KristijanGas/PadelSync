const axios = require('axios');
jest.mock('axios');

const { verifyProfile } = require('../../../backendutils/verifyProfile');

describe('verifyProfile', () => {
  it('returns emailVerified when API returns data', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });
    const fakeReq = { oidc: { accessToken: { token_type: 'Bearer', access_token: 'fake' } } };
    const result = await verifyProfile(fakeReq);
    expect(result).toBe(true);
    expect(axios.get).toHaveBeenCalled();
  });

  it('returns null when axios throws', async () => {
    axios.get.mockRejectedValue(new Error('network'));
    const fakeReq = { oidc: { accessToken: { token_type: 'Bearer', access_token: 'fake' } } };
    const result = await verifyProfile(fakeReq);
    expect(result).toBeUndefined();
  });
});

