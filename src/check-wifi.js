const wifi = require('node-wifi');

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});

const checkWifiConnection = async () => {
  try {
    // Ensure wifi is initialized before using other methods
    const networks = await wifi.scan();
    // console.log(networks); // Example: log scanned networks

    const currentConnections = await wifi.getCurrentConnections();
    if (currentConnections.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error checking wifi connection:', error);
    return false;
  }
};

module.exports = checkWifiConnection;
