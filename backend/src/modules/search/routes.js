import { Router } from 'express';

import { globalSearch } from './searchController.js';

export const searchRouter = Router();

searchRouter.get('/', globalSearch);
