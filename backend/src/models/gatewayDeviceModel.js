const mongoose = require('mongoose');

const gatewayDeviceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String, required: true }, // Unique Android device identifier
  deviceName: { type: String, default: 'Home Android SIM Gateway' },
  simPhoneNumber: { type: String, default: '' },
  simCarrier: { type: String, default: 'Jio 4G' },
  batteryLevel: { type: Number, default: 100 },
  isCharging: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  isDefaultDialer: { type: Boolean, default: false }, // Has user set it as Default Phone App?
  lastPingAt: { type: Date, default: Date.now },
  pairingCode: { type: String, default: '' },
  currentCall: {
    contactId: String,
    phoneNumber: String,
    roleId: String,
    startedAt: Date,
    status: { type: String, enum: ['idle', 'dialing', 'connected', 'ended'], default: 'idle' }
  }
}, { timestamps: true });

gatewayDeviceSchema.index({ userId: 1, deviceId: 1 }, { unique: true });
gatewayDeviceSchema.index({ pairingCode: 1 });

module.exports = mongoose.model('GatewayDevice', gatewayDeviceSchema);
