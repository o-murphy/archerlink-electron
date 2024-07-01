import wifi from 'node-wifi';

// Initialize wifi module
wifi.init({
  iface: null // network interface, choose a random wifi interface if set to null
});

const checkWifiConnection = async () => {
  try {
    const currentConnections = await wifi.getCurrentConnections();
    if (currentConnections.length > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

export default checkWifiConnection;
