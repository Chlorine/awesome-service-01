import { Document, Schema, model, Model } from 'mongoose';
import { EventPlaceInfo } from '../../../interfaces/common-front/public-events/index';
import { GeoPoint } from '../../../interfaces/common-front/index';

export interface IGeoPoint extends GeoPoint, Document {
  asPoint(): GeoPoint;
}

export const GeoPointSchema = new Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
  },
});

GeoPointSchema.methods.asPoint = function(): GeoPoint {
  return {
    type: 'Point',
    coordinates: [...this.coordinates],
  };
};

export interface IEventPlace extends EventPlaceInfo, Document {
  asPlaceInfo(): EventPlaceInfo;
}

export const EventPlaceSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    default: '',
  },
  location: {
    type: GeoPointSchema,
  },
});

EventPlaceSchema.methods.asPlaceInfo = function asPlaceInfo(): EventPlaceInfo {
  return {
    name: this.name,
    address: this.address,
    location: this.location ? this.location.asPoint() : undefined,
  };
};
