import { ObjectID } from 'mongodb';
import connect from '../connect';
import generateShortcode from '../../logic/generateShortcode';

const DATABASE_NAME = process.env.NODE_ENV === 'test' ? 'stv_test' : 'stv';

const initShortcodes = async () => {
  const { db, dbClose } = await connect(DATABASE_NAME);
  const dbShortcodes = db.collection('shortcodes');
  return { dbShortcodes, dbClose };
};

const generateShortcode = async () => {};
