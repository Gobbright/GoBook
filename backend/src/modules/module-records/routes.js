import { Router } from 'express';

import { createRecord, deleteRecord, listRecords, updateRecord } from './controller.js';

export const moduleRecordsRouter = Router();

moduleRecordsRouter.get('/', listRecords);
moduleRecordsRouter.post('/', createRecord);
moduleRecordsRouter.put('/:id', updateRecord);
moduleRecordsRouter.delete('/:id', deleteRecord);
