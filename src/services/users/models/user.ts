import { Document, Schema, model, Model } from 'mongoose';
import * as BCryptJS from 'bcryptjs';

import { Utils } from '../../../utils/utils';
import { UserInfo, UserRole } from '../../../interfaces/common-front/users/index';

const HASH_SALT_ROUND = 10;

interface IUserSchema extends Document {
  role: UserRole;
  active: boolean;

  email: string;
  password: string;

  firstName?: string;
  middleName?: string;
  lastName?: string;

  createdAt: Date;
  updatedAt: Date;

  emailConfirmed: boolean;
}

const UserSchema: Schema = new Schema(
  {
    role: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
      default: 'user',
    },
    active: {
      type: Boolean,
      default: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },

    firstName: {
      type: String,
      default: '',
    },
    middleName: {
      type: String,
      default: '',
    },
    lastName: {
      type: String,
      default: '',
    },

    emailConfirmed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export interface IUser extends IUserSchema {
  fullName: string;
  fullNameShort: string;
  asUserInfo(): UserInfo;
  isValidPassword(password: string): Promise<boolean>;
}

UserSchema.pre<IUser>('save', async function() {
  if (this.isModified('password')) {
    this.password = await BCryptJS.hash(this.password, HASH_SALT_ROUND);
  }
});

UserSchema.virtual('fullName').get(function() {
  // TODO: нормальный formatFullName
  return `${this.lastName} ${this.firstName} ${this.middleName}`;
});

UserSchema.virtual('fullNameShort').get(function() {
  const { firstName, middleName, lastName } = this;

  return Utils.formatShortName(firstName, middleName, lastName);
});

UserSchema.methods.asUserInfo = function(): UserInfo {
  return {
    id: this._id.toHexString(),
    role: this.role,
    active: this.active,

    email: this.email,

    firstName: this.firstName,
    middleName: this.middleName,
    lastName: this.lastName,

    emailConfirmed: this.emailConfirmed,
  };
};

UserSchema.methods.isValidPassword = async function(password: string): Promise<boolean> {
  return BCryptJS.compare(password, this.password);
};

UserSchema.statics.findByCredentials = async function(
  email: string,
  password: string,
): Promise<IUser | null> {
  const u = await this.findOne({ email: email.toLowerCase() });
  if (!u) return null;

  return (await u.isValidPassword(password)) ? u : null;
};

export interface IUserModel extends Model<IUser> {
  findByCredentials(email: string, password: string): Promise<IUser | null>;
}

export default model<IUser, IUserModel>('User', UserSchema);
