const axios = require('axios');
jest.mock('axios');

const { verifyProfile } = require('../../../backendutils/verifyProfile');

describe('verifyProfile', () => {
  it('returns emailVerified when API returns data', async () => {
    axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });
    const fakeReq = { oidc: { accessToken: { access_token: 'fake-token', token_type: 'Bearer', isExpired: () => false} } };
    const fakeRes = { redirect: jest.fn() }; 
    const result = await verifyProfile(fakeReq, fakeRes);
    expect(result).toBe(true);
    expect(axios.get).toHaveBeenCalled();
    expect(fakeRes.redirect).not.toHaveBeenCalled();
  });

  it('returns null when axios throws', async () => {
    axios.get.mockRejectedValue(new Error('network'));
    const fakeReq = { oidc: { accessToken: { access_token: 'fake-token', token_type: 'Bearer', isExpired: () => false} } };
    const fakeRes = { redirect: jest.fn() };
    const result = await verifyProfile(fakeReq, fakeRes);
    expect(result).toBeUndefined();
    expect(fakeRes.redirect).not.toHaveBeenCalled();
  });

 it('calls refresh when access token is expired', async () => {
  axios.get.mockResolvedValue({ data: { emailVerified: true, username: 'alice' } });

  const refreshedToken = { // 🟢 ADDED
      access_token: 'new-token',
      token_type: 'Bearer',
      expires_in: 3600
    };

  const refreshMock = jest.fn().mockResolvedValue(refreshedToken);

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
  const fakeRes = { redirect: jest.fn() };

  await verifyProfile(fakeReq, fakeRes);

  
  expect(refreshMock).toHaveBeenCalled();
  expect(fakeReq.oidc.accessToken).toBe(refreshedToken); 
  expect(fakeRes.redirect).not.toHaveBeenCalled();
});

  it('redirects to /login when refresh fails', async () => { 
    const refreshMock = jest.fn().mockRejectedValue(new Error('refresh failed'));

    const fakeReq = {
      oidc: {
        accessToken: {
          isExpired: () => true,
          refresh: refreshMock
        }
      }
    };

    const fakeRes = { redirect: jest.fn() };

    const result = await verifyProfile(fakeReq, fakeRes);

    expect(result).toBeUndefined();
    expect(fakeRes.redirect).toHaveBeenCalledWith('/login');
  });
});