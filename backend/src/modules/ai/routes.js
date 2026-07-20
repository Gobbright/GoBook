import { Router } from 'express';

import { chatWithAssistant } from './aiController.js';

export const aiRouter = Router();

aiRouter.post('/chat', chatWithAssistant);
