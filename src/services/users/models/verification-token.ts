import { Document, Schema, model, Model } from 'mongoose';
import { nanoid } from 'nanoid';

import { IUser } from './user';

export type VerificationTokenType = 'email' | 'psw-reset';

export interface IVerificationToken extends Document {
  user: IUser['_id'];
  type: VerificationTokenType;
  value: string;
}

const VerificationTokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['email', 'psw-reset'],
    required: true,
  },
  value: {
    type: String,
    unique: true,
    default: () => nanoid(36),
  },
});

export interface IUserVerificationToken extends IVerificationToken {
  user: IUser;
}

VerificationTokenSchema.statics.findWithUser = async function(
  value: string,
  type: VerificationTokenType,
) {
  return this.findOne({ value, type })
    .populate('user')
    .exec();
};

export interface IVerificationTokenModel extends Model<IVerificationToken> {
  findWithUser(value: string, type: VerificationTokenType): Promise<IUserVerificationToken | null>;
}

export default model<IVerificationToken, IVerificationTokenModel>(
  'VerificationToken',
  VerificationTokenSchema,
  'verification-tokens',
);
