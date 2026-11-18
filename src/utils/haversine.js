/**
 * Haversine Formula for distance calculation between two latitude/longitude coordinates in kilometers.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place (e.g. 2.4 km)
}

function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates estimated delivery charge:
 * Base delivery fee (e.g. ₹20) + (distance in km * per km fee e.g. ₹5) rounded up to nearest 5 rupees.
 */
function calculateDeliveryCharge(distanceKm, baseFee = 20, perKmFee = 5) {
  if (!distanceKm || distanceKm <= 0) return baseFee;
  const rawFee = baseFee + distanceKm * perKmFee;
  // Round to nearest multiple of 5
  return Math.ceil(rawFee / 5) * 5;
}

module.exports = {
  calculateDistance,
  calculateDeliveryCharge
};
