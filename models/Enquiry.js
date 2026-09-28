import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    whatsappNumber: {
      type: String,
      trim: true,
    },
    emailAddress: {
      type: String,
      trim: true,
      default: '',
    },
    serviceRequired: {
      type: String,
      default: 'General Service',
    },
    preferredDuration: {
      type: String,
      default: 'Monthly',
    },
    preferredStartDate: {
      type: String,
      default: '',
    },
    additionalRequirements: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Confirmed', 'Completed'],
      default: 'New',
    },
    createdAtFormatted: {
      type: String,
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Enquiry', enquirySchema);
