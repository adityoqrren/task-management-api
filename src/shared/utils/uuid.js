import { randomUUID } from 'crypto'; 

export const generateEventId = () => {
  return randomUUID()
};

