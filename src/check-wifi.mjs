import wifi from 'node-wifi';

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});

const checkWifiConnection = async () => {
  try {
    const currentConnections = await wifi.getCurrentConnections();
    if (currentConnections.length > 0) {
    //   console.log(`Connected to Wi-Fi: ${currentConnections[0].ssid}`);
      return true;
    } else {
    //   console.log('Not connected to any Wi-Fi network.');
      return false;
    }
  } catch (error) {
    // console.error('Error checking Wi-Fi connection:', error);
    return false;
  }
};

export { checkWifiConnection };
