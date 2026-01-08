const axios = require('axios')

async function fetchAddresses(query) {
  if (!query) return [];

  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${process.env.MAPBOX_TOKEN}&autocomplete=false&limit=5&country=HR`
  );

  return res.json();
}


module.exports = {fetchAddresses};