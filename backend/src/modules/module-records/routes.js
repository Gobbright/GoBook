import { Router } from 'express';

import { createRecord, deleteRecord, importRecords, listRecords, updateRecord } from './controller.js';
import { moduleRecordFileUpload, uploadModuleRecordFile, viewModuleRecordFile } from './fileUpload.js';
import { uploadExcelFile } from '../../utils/excelImport.js';

export const moduleRecordsRouter = Router();

moduleRecordsRouter.post('/import', uploadExcelFile.single('file'), importRecords);
moduleRecordsRouter.post('/files', moduleRecordFileUpload.single('file'), uploadModuleRecordFile);
moduleRecordsRouter.get('/files/:id', viewModuleRecordFile);
moduleRecordsRouter.get('/', listRecords);
moduleRecordsRouter.post('/', createRecord);
moduleRecordsRouter.put('/:id', updateRecord);
moduleRecordsRouter.delete('/:id', deleteRecord);
