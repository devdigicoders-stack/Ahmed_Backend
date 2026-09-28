import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      default: '+974 4455 6677',
      trim: true,
    },
    title: {
      type: String,
      default: 'Operations Manager',
      trim: true,
    },
    role: {
      type: String,
      default: 'superadmin',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Admin', adminSchema);
