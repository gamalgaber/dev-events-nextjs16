import mongoose, { Document, Schema, Types } from 'mongoose';
import Event from './event.model';

interface IBooking extends Document {
  eventId: Types.ObjectId;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event ID is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address',
      ],
    },
  },
  { timestamps: true }
);

// Index on eventId for faster queries
bookingSchema.index({ eventId: 1 });

// Pre-save hook to verify that the referenced event exists
bookingSchema.pre<IBooking>('save', async function (next) {
  // Skip validation if eventId hasn't changed
  if (!this.isModified('eventId')) {
    return next();
  }

  try {
    const eventExists = await Event.findById(this.eventId);

    if (!eventExists) {
      return next(new Error('Referenced event does not exist'));
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

const Booking =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', bookingSchema);

export type { IBooking };
export default Booking;
