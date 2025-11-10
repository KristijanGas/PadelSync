const axios = require('axios');
jest.mock('axios');

const { verifyProfile } = require('../../../backendutils/verifyProfile');

describe('verifyProfile', () => {
  it('returns emailVerified when API returns data', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });
    const fakeReq = { oidc: { accessToken: { access_token: 'fake-token', token_type: 'Bearer', isExpired: () => false} } };
    const result = await verifyProfile(fakeReq);
    expect(result).toBe(true);
    expect(axios.get).toHaveBeenCalled();
  });

  it('returns null when axios throws', async () => {
    axios.get.mockRejectedValue(new Error('network'));
    const fakeReq = { oidc: { accessToken: { access_token: 'fake-token', token_type: 'Bearer', isExpired: () => false} } };
    const result = await verifyProfile(fakeReq);
    expect(result).toBeUndefined();
  });

 it('calls refresh when access token is expired', async () => {
  axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });

  const refreshMock = jest.fn().mockResolvedValue({
    access_token: 'new-token',
    token_type: 'Bearer',
    expires_in: 3600
  });

  const fakeReq = {
    oidc: {
      accessToken: {
        access_token: 'expired-token',
        token_type: 'Bearer',
        expires_in: 0,
        isExpired: () => true, // expired token
        refresh: refreshMock
      }
    }
  };

  await verifyProfile(fakeReq);

  
  expect(refreshMock).toHaveBeenCalled();
  expect(fakeReq.oidc.accessToken.access_token).toBe('new-token');
});
});