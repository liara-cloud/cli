import crypto from 'crypto';

const hash = buf => {
  return crypto.createHash('sha256').update(buf).digest('hex');
};

export default hash;