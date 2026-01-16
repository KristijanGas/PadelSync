const { fetchAddresses } = require('../../../backendutils/mapbox');

describe('fetchAddresses', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty array when query is empty', async () => {
    const result = await fetchAddresses('');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('calls mapbox API and returns json response', async () => {
    const mockResponse = {
      features: [
        { place_name: 'Zagreb, Croatia' },
        { place_name: 'Split, Croatia' }
      ]
    };

    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue(mockResponse)
    });

    process.env.MAPBOX_TOKEN = 'fake-token';

    const result = await fetchAddresses('Zagreb');

    expect(fetch).toHaveBeenCalledTimes(1);

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        'https://api.mapbox.com/geocoding/v5/mapbox.places/Zagreb.json'
      )
    );

    expect(result).toEqual(mockResponse);
  });

  it('encodes query correctly', async () => {
    fetch.mockResolvedValue({
      json: jest.fn().mockResolvedValue({ features: [] })
    });

    process.env.MAPBOX_TOKEN = 'fake-token';

    await fetchAddresses('Zagreb centar');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('Zagreb%20centar')
    );
  });

  it('throws if fetch fails', async () => {
    fetch.mockRejectedValue(new Error('Network error'));

    await expect(fetchAddresses('Zagreb')).rejects.toThrow('Network error');
  });
});
